---
title: "构建云端 DWG Web 查看器"
---

# 使用 `cad-html-plugin` 构建云端 DWG Web 查看器：预渲染 + 静态托管

本文介绍如何利用 `@mlightcad/cad-html-plugin` 的**多文件 ACEX 包**导出能力，在服务端（或构建过程中）将 DWG/DXF 图纸转换为可直接托管的静态资源。之后用户打开网页即可查看图纸，无需在浏览器中解析图纸或对几何图形进行三角剖分。

有关格式本身（清单字段、ACEC/ACEO 二进制编码等）的详细信息，请参见 [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md)。本文只关注**如何使用该格式构建云端图纸查看器**。

---

## 1. 背景：两种 Web 图纸查看器架构

**架构 A：浏览器内实时解析（`cad-viewer` 打开 DWG/DXF 文件的默认方式）**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

解析和「实体 → 渲染数据」转换的全部开销都发生在**用户设备**上：大型图纸初始渲染缓慢，低端移动设备可能变得卡顿，内存压力也可能很大。

**架构 B：预渲染 + 静态托管（浩辰看图王 Web、Autodesk Web Viewer 等云端图纸查看器采用的主流方案）**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

`cad-html-plugin` 导出的**多文件包**就是架构 B 的产物：一个 `.zip` 文件，解压后成为纯静态目录。它可以由任何 Web 服务器（nginx、对象存储、CDN）托管，且**不需要任何后端运行时**。

### 何时选择架构 B

* 图纸主要用于**发布 / 分享 / 归档查看**，且大量用户会重复查看同一图纸（CDN 缓存命中率高）；
* 你希望初始渲染快、移动端体验好，不要求用户设备执行解析和三角剖分；
* 你不希望将原始 DWG/DXF 分发给查看者（包内只包含**显示级数据**，不含可编辑的实体记录，对图纸资产提供了一定程度的保护）；
* 你希望服务端成本趋近于零（纯静态流量）。

### 成本与前提条件

* **网络需要足够快。** 预渲染数据是扁平化的显示几何，可能比原始 DWG/DXF 更大（尽管 gzip 压缩后通常非常小：约 2 MiB 的未压缩数据块经 gzip 后通常小于 200 KiB）。如果下载这些数据的网络成本已经大于本地解析 + 三角剖分的成本，此方案就没有优势。对于弱网环境或只需查看一次的小图纸，直接交付单文件 HTML 或在线解析图纸可能更合适。
* **图纸更新后需要重新导出并重新发布。** 此方案适合「发布后只读」的场景，不适合在线协同编辑。
* 密码与过期保护目前仅支持**单文件 HTML** 导出。多文件包的访问控制需由托管层处理（签名 URL、带认证的反向代理等）。

> **单文件与多文件如何选择？**
>
> 直接发给某人或双击离线打开 → 使用 `single`（自包含的 `.html`）。
>
> 托管在 Web 服务器/CDN 上供多用户访问 → 使用 `multi`（本文介绍的方案）：几何数据被拆分为小块并**渐进加载**。初始视图只需下载当前布局的前几个块；其他布局和对象捕捉数据按需延迟加载。

---

## 在线演示

如果你想亲身体验这种**预渲染 + 静态托管**的 DWG Web 查看方式，可以直接打开下面的在线演示：

👉 [**在线试用 DWG Web 查看器**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

此演示使用本文介绍的预渲染方案。DWG 图纸在发布前已完成解析和几何三角剖分。用户打开网页时，无需再次解析原始 DWG 文件；查看器直接加载预生成的显示数据。

由于图纸资源由浏览器缓存，**首次打开页面时可能需要等待资源下载；建立缓存后，再次打开同一页面会非常快**。这也是**预渲染 + 静态托管**方案特别适合发布、分享和重复查看图纸的原因之一。

你可以先试用演示，然后继续阅读下面的架构与实现细节。

---

## 2. 输出：解压后即可使用的静态目录

多文件导出会生成一个 `.zip` 文件，但**zip 仅用于分发**。查看器不会在浏览器中解压该文件，而是依次获取清单和各个数据块文件。**托管前必须先解压：**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

用户访问 `viewer.html` 后的加载顺序为：

1. 读取页面内嵌的 `#mlcad-package` 配置，获取清单 URL（默认：`./{name}.acex.json`）；
2. 下载清单（小型 JSON），初始化图层、布局、范围等 UI 组件；
3. 逐个下载**当前布局**的几何数据块 → gunzip → 解码 → 渲染，每个块就绪后立即显示；
4. 图纸已经可以平移缩放后，下载 `*.osnap.gz` 对象捕捉数据（用于测量/对象捕捉）；
5. 其他布局仅在用户切换到它们时才加载。

查看器运行时已内联在 `viewer.html` 中，因此该目录**不包含额外 JavaScript 依赖**。功能包括：选择 / 平移 / 缩放（范围、窗口、原始视图）、图层面板、布局切换、测量、标记（Design Review 标记）、对象捕捉，以及内置的中文 / 英文 / 捷克文 / 土耳其文多语言界面。

---

## 3. 生成多文件包的三种方式

### 方式 1：从 cad-viewer Web 应用手动导出（适合偶尔导出）

* 在 [cad-viewer](https://mlightcad.com/cad-viewer/) 中打开图纸，运行 `chtml` 命令打开导出对话框，并将导出格式选择为 **「多文件包（ZIP）」**；
* 或在命令行运行 `-chtml` 并回答提示，将格式选择为 **Multi**：

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

浏览器将下载一个 `.zip` 文件。

### 方式 2：在服务端 / CI 中批量转换（云端架构推荐）

无头 CLI 包 [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli) 使用 Playwright 在无头 Chromium 中运行完整的解析 + 三角剖分 + 导出流程。非常适合集成到转换服务或 CI 流水线中。

安装（需要 Node.js 20+）：

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

导出需要一个 `.scr` 脚本，逐行回答 `-chtml` 的提示（`Single/Multi`、`Yes/No`、`Black/White/Space`、`Extents/Current`、`Measure/View`）。CLI 包中包含可直接使用的 `examples/export-html-multi.scr`（通过 npm 安装后位于 `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`；在仓库中位于 [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr)）：

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / hidden layers / layouts / background /
; initial view / viewer mode / chunk size MiB / compress chunks
-chtml
Multi
Yes
Yes
Black
Extents
Measure
2
Yes
quit
```

导出单个图纸：

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

完整的批量目录转换、zip 解压与发布自动化方案请参见第 6 节。

你也可以使用编程 API 将其集成到自己的转换服务中：

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### 方式 3：在你自己的 Web 应用中编程导出

如果你的应用已经嵌入了 `cad-simple-viewer`（用户直接在你的 Web 应用中查看图纸），你也可以直接调用转换 API，将「导出托管包」变成产品中的一个按钮：

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

底层 API（自行组装包，并决定写入磁盘还是上传）：

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **注意：** 解析 DWG/DXF 和构建场景依赖于 `cad-simple-viewer` 的浏览器运行环境，因此**服务端转换应使用方式 2（CLI）**。方式 3 适合将导出功能集成到你自己的 Web 产品中。

---

## 4. 部署到 Web 服务器

### 4.1 解压与发布

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

发布后，只需将 URL `https://your-domain/cad-packages/floor-plan/viewer.html` 提供给用户。建议按**图纸 ID / 版本号**组织目录（例如 `/cad-packages/{drawingId}/{version}/`）。图纸更新时，发布新的版本目录。旧版本可以自然退役，这种结构也更便于缓存。

### 4.2 服务器要求

任何能够提供静态文件的服务都可以：nginx、Apache、IIS、`npx serve`、Python `-m http.server`，以及阿里云 OSS / AWS S3 + CloudFront 等对象存储静态网站托管。只有几项要求：

1. **必须通过 HTTP(S) 访问。** 查看器使用 `fetch()` 加载清单和数据块文件，无法在 `file://` 协议下工作，因此不能直接双击 `viewer.html` 作为本地文件使用。
2. **整个包必须托管在同一源上。** 出于安全考虑，加载器会校验 `manifestUrl` 与页面同源，数据块文件与清单同源且位于包目录内（绝对 URL 和跨越目录的 `..` 路径会被拒绝）。因此，应将 `viewer.html`、清单和 `chunks/` 放在**同一站点 / 同一 CDN 域名**下。不要将数据块文件拆分到另一个域名。将页面和数据块都托管在 CDN 域名上完全没有问题。
3. **`.gz` 文件必须按原始字节返回，且不得包含 `Content-Encoding: gzip` 响应头。**

   `.acex.gz` / `.osnap.gz` 本身已经是 gzip 压缩后的字节，查看器会在 JavaScript 中自行执行 gunzip 操作。如果 Web 服务器（通常是 Apache 的 `mod_mime`，其默认可能为 `.gz` 扩展名设置 `AddEncoding gzip gz`，或某些 CDN/对象存储服务配置的元数据）添加了 `Content-Encoding: gzip`，浏览器会自动解压一次，而查看器会再次尝试解压，导致错误。请确保这些文件以不透明的二进制数据返回（`Content-Type: application/octet-stream` 即可；查看器使用 `arrayBuffer` 读取它们，不依赖 MIME 类型）。`.acex.json` 清单应使用 `application/json`。
4. **缓存策略。** 数据块文件内容不可变（在同一版本目录内不会改变），因此可以安全地为 `chunks/` 设置较长的缓存时间（`Cache-Control: public, max-age=31536000, immutable`）。清单文件应使用较短的缓存时间或 `no-cache`，以便将包重新导出到同一目录时客户端能快速发现更新。如果包发布在版本化目录中，整个目录都可以使用长期缓存。

nginx 示例（默认配置在直接请求 `.gz` 文件时不会压缩/解压；此处显式声明以避免受到 CDN 或自定义配置的影响）：

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

Apache 用户应确保没有为 `.gz` 扩展名启用 `AddEncoding gzip .gz`（这在默认 MIME 配置中很常见）。如有必要，在包目录的 `.htaccess` 中移除它：

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 本地验证

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

如果图纸能正确显示，且你可以切换布局并执行测量，则托管配置正确。

---

## 5. 如何选择导出选项

| 选项                    | 说明                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | 本文介绍的方案。`'single'` 是自包含的单文件 HTML                                                                                                              |
| `viewerMode`            | `'measure'`（默认）：包含测量、标记和对象捕捉，带有 `*.osnap.gz` 数据；`'view'`：仅查看（平移/缩放/图层），包更小，初始渲染更快 |
| `exportLayouts`         | `true`（默认）导出图纸空间布局；`false` 仅导出模型空间，工具栏不显示布局切换                                                                    |
| `exportInvisibleLayers` | `true`（默认）同时导出关闭/冻结图层；`false` 仅导出可见图层，包更小                                                                                 |
| `initialView`           | `'fit'`（默认，打开时图纸适应完整视图）或 `'current'`（保留导出时的视图位置）                                                                           |
| 密码 / 过期             | 仅在 `single` 模式下支持；对于多文件包，请在托管层使用认证（签名 URL、带访问令牌的反向代理等）                                                   |

---

## 6. 端到端流水线示例

一个最小的「转换 → 解压 → 发布」Node 脚本（可在图纸上传后连接到 webhook，或接入 CI 流水线）：

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

在生产环境中，你还可以添加诸如以下功能：使用图纸内容的哈希判断是否可以跳过重复转换、重试失败的转换，或直接使用 `PutObject` 将 `pkg.files` 上传到对象存储（使用方式 3 中的 `buildAcExPackage`，这样甚至无需创建 zip）。

---

## 7. 常见问题

**Q：能否直接把 zip 文件放到服务器上并提供链接？**

不能。zip 只是用于下载和分发的打包格式。运行时，查看器会获取解压后的 `viewer.html` / `*.acex.json` / `chunks/*.gz`。你必须在服务器上解压并托管结果文件，或在自有应用中使用 `unzipAcExPackageFiles` 在前端解压（注意同源和内存问题；不建议用于大型图纸）。

**Q：打开页面后数据块文件返回 404 / 加载失败。**

请检查页面是否通过 HTTP(S) 访问；`chunks/` 目录是否与 `viewer.html` 和清单一起部署；数据块文件是否被重命名或移动（清单中的 `href` 值是相对路径，因此必须保留目录结构）。

**Q：数据块文件下载成功但解析失败。**

最可能是服务器为 `.gz` 文件添加了 `Content-Encoding: gzip`（浏览器已自动解压一次）。请按照 4.2 节第 3 项检查响应头。

**Q：能否将数据块文件放在 CDN 上，而页面保留在自己的域名下？**

当前加载器要求页面、清单和数据块文件位于同一源。请将**整个包目录**发布到 CDN 域名，并让用户直接从 CDN 访问 `viewer.html`，从而享受 CDN 加速。

**Q：为什么导出的文件名变成了 `floor-plan-2.zip`？**

当目标文件已存在时，导出流程会自动追加序号以避免覆盖。再次导出前，请删除或清空输出目录，以免下一次运行读取到过期的 zip。

**Q：图纸被修改后会怎样？**

重新运行转换并发布到新目录（或覆盖同一目录并使清单缓存失效）。该包是显示数据的快照，不会自动跟随源文件的更新。

**Q：原始图纸会被暴露吗？**

包中只包含**显示级**数据，例如线/网格批次、图层名、布局名、范围和单位。它不包含 DWG/DXF 字节或可编辑的实体记录。但它仍然是图纸几何的完整表示。如果需要强访问控制，请在托管层实现认证，或使用支持密码和过期保护的单文件 HTML。
