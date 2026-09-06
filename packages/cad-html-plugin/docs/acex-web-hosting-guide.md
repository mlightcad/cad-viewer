# 用 cad-html-plugin 搭建「预渲染 + 静态托管」的云端看图方案

本文介绍如何利用 `@mlightcad/cad-html-plugin` 的**多文件包（multi-file ACEX package）**导出能力，把 DWG/DXF 图纸在服务端（或构建期）一次性转换为可直接托管的静态资源，让用户打开网页就能看图，而无需在浏览器里解析图纸、细分几何。

格式本身的细节（manifest 字段、ACEC/ACEO 二进制编码等）见 [acex-package-format.md](./acex-package-format.md)，本文只讲**怎么用这套格式搭一套云端看图服务**。

---

## 1. 背景：两种 Web 看图架构

**架构 A：浏览器端实时解析（cad-viewer 默认打开 DWG/DXF 的方式）**

```
DWG/DXF 文件 → 浏览器下载 → 解析实体（AcDb*）→ 细分/三角化为渲染数据 → WebGL 上屏
```

解析和「实体 → 渲染数据」的开销全部发生在**用户的设备上**：大图首屏慢、低端手机卡顿、内存压力大。

**架构 B：预渲染 + 静态托管（浩辰看图王 Web 端、Autodesk Web Viewer 等云端看图软件的主流做法）**

```
转换阶段（一次性）：DWG/DXF → 解析 + 细分 → 显示数据（线/网格批次）+ 离线查看器 → 静态文件
访问阶段（每次）：  浏览器只做 fetch → gunzip → 直接上屏
```

`cad-html-plugin` 导出的 **multi 包**就是架构 B 的产物：一个 `.zip`，解压后是一个纯静态目录，任何 Web 服务器（nginx、对象存储、CDN）都能托管，**不需要任何后端运行时**。

### 什么时候选架构 B

- 图纸以**发布 / 分享 / 归档浏览**为主，大量用户反复查看同一张图（CDN 缓存命中率高）；
- 希望首屏快、移动端体验好，不想让用户的设备承担解析和细分开销；
- 不希望把原始 DWG/DXF 下发给浏览方（包内只有**显示级数据**，不含可编辑的实体记录，客观上保护了图纸资产）；
- 希望服务端成本趋近于零（纯静态流量）。

### 代价与前提

- **网络要够快**。预渲染数据是「摊平」后的显示几何，体积可能大于原始 DWG/DXF（虽然 gzip 后通常很小：约 2 MiB 的未压缩块 gzip 后通常不到 200 KiB）。如果下载这些数据的网络开销已经超过在本地解析 + 细分的开销，这个方案就没有优势——弱网、一次性查看小图的场景，直接发单文件 HTML 或在线解析可能更合适。
- **图纸更新后需要重新导出并发布**。它适合「发布后只读」的场景，不适合在线编辑协同。
- 密码、有效期保护目前只在**单文件 HTML** 导出中提供；multi 包的访问控制需要由托管层（签名 URL、鉴权反代等）负责。

> **单文件 vs 多文件怎么选？**
> 点对点发给某人、双击离线打开 → 用 `single`（自包含 `.html`）。
> 挂到 Web 服务器/CDN 上给大量用户访问 → 用 `multi`（本文方案）：几何被切成小块**渐进加载**，首屏只需下载当前布局的前几个块，其余布局和捕捉数据按需懒加载。

---

## 2. 产物：一个解压即用的静态目录

multi 导出下载的是一个 `.zip`，但 **zip 仅用于分发**。查看器不会在浏览器里解 zip——它按顺序 `fetch` 清单和各个块文件。**托管前必须先解压**：

```text
my-drawing/
  viewer.html                 # 入口页面（HTML/CSS/JS 外壳 + 内联的离线查看器运行时）
  my_drawing.acex.json        # 包清单（很小的元数据 + 索引）
  chunks/
    L0-000.acex.gz            # gzip 压缩的几何块（ACEC 二进制，非 base64）
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # gzip 压缩的对象捕捉数据（measure 模式才有）
    L1-000.acex.gz            # 其余布局的块，切换布局时才懒加载
    ...
```

用户访问 `viewer.html` 后的加载顺序：

1. 读取页面内的 `#mlcad-package` 配置，拿到清单地址（默认 `./{name}.acex.json`）；
2. 下载清单（小 JSON），初始化图层、布局、范围等界面；
3. **当前布局**的几何块逐块下载 → gunzip → 解码 → 上屏，画一块刷一块；
4. 图纸已经可以平移缩放后，再下载 `*.osnap.gz` 捕捉数据（测量/对象捕捉用）；
5. 其余布局在用户切换时才加载。

查看器运行时已经内联在 `viewer.html` 里，目录中**没有任何额外 JS 依赖**，功能包含：选择 / 平移 / 缩放（范围、窗口、原图）、图层面板、布局切换、测量、批注（Design Review markup）、对象捕捉，以及内嵌的中/英/捷/土多语言界面。

---

## 3. 生成 multi 包的三种方式

### 方式一：在 cad-viewer 网页端手动导出（适合偶尔导出）

- 在 [cad-viewer](../../cad-viewer) 中打开图纸，运行 `chtml` 命令打开导出对话框，导出格式选择 **「多文件包 (ZIP)」**；
- 或在命令行运行 `-chtml`，按提示回答，格式一项选 **Multi**：

  ```text
  -chtml
  Export format [Single/Multi] <Single>: Multi
  ...
  ```

  浏览器会下载一个 `.zip`。

### 方式二：服务端 / CI 批量转换（云端架构推荐）

无头 CLI 包 [`@mlightcad/cad-simple-viewer-cli`](../../cad-simple-viewer-cli) 基于 Playwright 在 headless Chromium 里跑完整的解析 + 细分 + 导出管线，最适合接到转换服务或 CI 上。

安装（需要 Node.js 20+）：

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

导出需要一个 `.scr` 脚本逐行回答 `-chtml` 的提示（`Single/Multi`、`Yes/No`、`Extents/Current`、`Measure/View`）。CLI 包自带现成的 `examples/export-html-multi.scr`（npm 安装后位于 `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`，仓库内位于 `packages/cad-simple-viewer-cli/examples/`），内容为：

```text
; 导出多文件 ACEX 包（zip）
; 提示顺序：导出格式 / 导出关闭图层 / 导出布局 / 初始视图 / 查看器模式
-chtml
Multi
Yes
Yes
Extents
Measure
quit
```

单张图纸导出：

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# 输出：./out/floor-plan.zip
```

批量目录转换、zip 解压与发布的完整自动化方案见第 6 节。

也可以用编程 API 集成到自己的转换服务里：

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // 也支持 http(s) URL
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})
console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### 方式三：在自己的 Web 应用中程序化导出

如果你的应用本身就内嵌了 cad-simple-viewer（用户在你的网页里看图），也可以直接调用转换 API，把「导出托管包」做成你产品里的一个按钮：

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// 导出当前打开图纸的 multi 包（触发浏览器下载 .zip）
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // 多文件包；默认 'single'
    viewerMode: 'measure',   // 'measure'（含测量/批注/捕捉）或 'view'（纯浏览，更小）
    exportLayouts: true,     // 是否包含图纸空间布局
    exportInvisibleLayers: true, // 是否包含关闭/冻结图层
    initialView: 'fit'       // 'fit'（范围）或 'current'（当前视图）
  })
```

更低层的 API（自己组装包、自己决定落盘还是上传）：

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot 由 AcApHtmlSnapshotBuilder 从 Three.js 场景构建
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // viewer-runtime.iife.js 的文本
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // 打成 zip 供下载
// 或者直接把 pkg.files（[{ path, bytes }, ...]）写到磁盘 / 上传对象存储，
// 连解压这一步都省了：
for (const file of pkg.files) {
  // 写到 /var/www/packages/floor-plan/<file.path>
}
```

> 注意：解析 DWG/DXF 和构建场景依赖 cad-simple-viewer 的浏览器运行环境，所以**服务端转换请走方式二（CLI）**；方式三适合在你自己的网页端产品里集成导出功能。

---

## 4. 部署到 Web 服务器

### 4.1 解压并发布

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

发布后把 `https://你的域名/cad-packages/floor-plan/viewer.html` 这个 URL 发给用户即可。建议按**图纸 ID / 版本号**划分目录（如 `/cad-packages/{drawingId}/{version}/`），图纸更新就发一个新版本目录，旧版本自然下线，也便于缓存。

### 4.2 服务器要求

任何能发静态文件的服务都可以：nginx、Apache、IIS、`npx serve`、Python `-m http.server`，以及阿里云 OSS / AWS S3 + CloudFront 等对象存储静态网站托管。要求只有几条：

1. **必须通过 http(s) 访问**。查看器用 `fetch()` 加载清单和块文件，`file://` 协议下无法工作，不能双击 `viewer.html` 当本地文件用。
2. **整包同源托管**。加载器出于安全限制会校验：`manifestUrl` 必须与页面同源，块文件必须与清单同源且位于包目录内（拒绝绝对 URL、`..` 跨目录）。所以请把 `viewer.html`、清单、`chunks/` 放在**同一个站点/同一个 CDN 域名**下，不要把块文件拆到另一个域。页面和块一起放在 CDN 域名上是完全没问题的。
3. **`.gz` 文件按原始字节返回，不要附带 `Content-Encoding: gzip` 响应头**。
   `.acex.gz` / `.osnap.gz` 是 gzip 压缩过的字节，由查看器在 JavaScript 里自己 gunzip。如果 Web 服务器（典型如 Apache 的 `mod_mime` 默认对 `.gz` 后缀设置 `AddEncoding gzip gz`，或某些 CDN/对象存储元数据）给它们加上了 `Content-Encoding: gzip`，浏览器会先自动解压一次，查看器再解压就会报错。请确保这些文件以不透明二进制方式返回（`Content-Type: application/octet-stream` 即可，查看器按 `arrayBuffer` 读取，不依赖 MIME），清单 `.acex.json` 用 `application/json`。
4. **缓存策略**。块文件内容不可变（同一版本目录内不会变），可以放心地给 `chunks/` 加长缓存（`Cache-Control: public, max-age=31536000, immutable`）；清单文件建议短缓存或 `no-cache`，以便重新导出同目录后客户端能尽快发现更新。按版本号分目录发布时则整目录都可以长缓存。

nginx 示例（默认配置不会对直接请求的 `.gz` 文件做压缩/解压处理，这里显式声明以避免被 CDN 或自定义配置影响）：

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # 块文件：不透明字节，禁止任何 Content-Encoding
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

Apache 用户请确认没有对 `.gz` 后缀生效的 `AddEncoding gzip .gz`（默认 mime 配置里常见），必要时在包目录的 `.htaccess` 中移除：

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
# 在解压后的包目录里
npx serve .
# 打开 http://localhost:3000/viewer.html
```

能正常显示图纸、切换布局、测量，即说明托管配置正确。

---

## 5. 导出选项怎么选

| 选项 | 说明 |
|------|------|
| `exportFormat: 'multi'` | 本文方案。`'single'` 为自包含单文件 HTML |
| `viewerMode` | `'measure'`（默认）：包含测量、批注、对象捕捉，附带 `*.osnap.gz` 数据；`'view'`：纯浏览（平移/缩放/图层），包更小、首屏更快 |
| `exportLayouts` | `true`（默认）导出图纸空间布局；`false` 只导出模型空间，工具栏不显示布局切换 |
| `exportInvisibleLayers` | `true`（默认）连关闭/冻结图层一起导出；`false` 只导出可见图层，包更小 |
| `initialView` | `'fit'`（默认，打开时全屏范围）或 `'current'`（保留导出时的视图位置） |
| 密码 / 有效期 | 仅 `single` 模式支持；multi 包请用托管层鉴权（签名 URL、访问令牌反代等） |

---

## 6. 端到端流水线示例

一个最小的「转换 → 解压 → 发布」Node 脚本（可挂到图纸上传后的 webhook、或 CI 流水线里）：

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. headless 转换，产出 zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. 找到生成的 zip 并解压到发布目录
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // 自带路径安全校验，拒绝 ../ 等危险条目

const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. 上传/同步到 nginx 目录或对象存储（rsync、ossutil、aws s3 sync ...）
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

生产环境中还可以加上：按图纸内容哈希决定是否跳过重复转换、转换失败重试、把 `pkg.files` 直接 `PutObject` 到对象存储（用方式三的 `buildAcExPackage` 连 zip 都不用打）。

---

## 7. FAQ

**Q：能不能直接把 zip 放到服务器上给个链接？**
不能。zip 只是下载分发用的封装，查看器运行时 fetch 的是解压后的 `viewer.html` / `*.acex.json` / `chunks/*.gz`。要么服务器端解压后托管，要么在你自己的应用里用 `unzipAcExPackageFiles` 在前端解压（注意同源和内存问题，不推荐大图这么做）。

**Q：打开页面后块文件 404 / 加载失败？**
检查：是否通过 http(s) 访问；`chunks/` 目录是否随 `viewer.html`、清单一起部署；块文件是否被改了名或路径（清单里的 `href` 是相对路径，需保持目录结构）。

**Q：块文件下载回来解析报错？**
多半是服务器对 `.gz` 文件加了 `Content-Encoding: gzip`（浏览器自动解了一次压），按 4.2 第 3 条检查响应头。

**Q：可以把块文件放 CDN、页面放自己域名吗？**
当前加载器要求页面、清单、块文件同源。把**整个包目录**发布到 CDN 域名、用户直接访问 CDN 上的 `viewer.html` 即可获得 CDN 加速。

**Q：导出的文件名变成了 `floor-plan-2.zip`？**
目标文件已存在时，导出命名会自动追加序号避免覆盖。重新导出前先删除输出目录里的旧产物（见第 6 节自动化示例中的清理步骤）。

**Q：图纸改了怎么办？**
重新跑一次转换、发布到新目录（或覆盖同目录并让清单缓存失效）。包是显示数据快照，不会自动跟随源文件更新。

**Q：会泄露原始图纸吗？**
包内只有线/网格批次、图层名、布局名、范围、单位等**显示级**数据，不含 DWG/DXF 字节和可编辑实体记录。但它仍然是图纸几何的完整表达，如需强访问控制，请在托管层做鉴权，或改用支持密码/有效期的单文件 HTML。
