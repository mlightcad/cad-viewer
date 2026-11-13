---
title: '升级 cad-simple-viewer 和 cad-editor'
---

# 升级 cad-simple-viewer 和 cad-editor

本指南介绍如何安全地升级 `@mlightcad/cad-simple-viewer` 和 `@mlightcad/cad-editor`——为什么它们不能单独升级、哪些相关包必须一起迁移，以及两种可靠的方法来确定任意给定版本的正确兼容版本集。

::: info 简易 UI 已并入 `cad-simple-viewer`
从包含此变更的版本开始，**`@mlightcad/cad-simple-ui-plugin` 已移除**。工具栏、停靠面板标签（图层 / 查找 / 审阅 / 测量）与默认 `AcApPaletteHost` 位于 **`@mlightcad/cad-simple-viewer`**。

迁移：卸载该插件；用 `AcApDocManager.createInstance({ simpleUi: { … } })`（默认开启）；`cad-editor` / CLI / 无头环境传 `simpleUi: false`；类型与辅助 API 从 `@mlightcad/cad-simple-viewer` 导入；用 `simpleUiReady` / `simpleUi` 代替 `getPlugin('SimpleUiPlugin')` / 旧的 `simpleUiPlugin`。`cad-editor` 仍使用 Vue 图层管理器，查找 / 审阅 / 测量复用共享 DOM 视图。`/simple-ui` 与 `/find` 子路径均已移除。
:::

::: info Dock 面板 chrome 迁入 `cad-simple-viewer`
纯 DOM 的 **dock 面板 chrome**（`AcUiDockPanel`）位于 **`@mlightcad/cad-simple-viewer`**。内置简易 UI 会在该 dock 上挂载标签内容（图层 / 查找 / 审阅 / 测量）并注册 `AcApPaletteHost`；`cad-editor` 则注册其 Vue 工具选项板宿主。

宿主迁移：

- 从 `@mlightcad/cad-simple-viewer` 导入 `AcUiDockPanel`、`AcUiDockPanelTab`、`AcUiDockPanelSide`。
- Dock chrome 的 i18n 键位于 **`main.dockPanel.*`**（含 `main.dockPanel.tab.layers` 等）。
- 未注册宿主时，`AcApPaletteService.open` 使用真正的 `AcUiDockPanel`（右侧停靠 / 手机底部 sheet）。
- 内置命名标签通过 **`AcApPaletteService.openNamedTab`** / 可选的 `AcApPaletteHost.openNamedTab` 打开（id 见 `ACAP_PALETTE_NAMED_TAB`），且**必须已注册宿主**——命名标签没有 dock 回退。托管的 `HTMLElement` 面板仍使用 `AcApPaletteService.open`。
  :::

::: info 共享的 AI 模型设置（`@mlightcad/cad-llm-plugin`）
从包含此变更的版本开始，LLM 服务商设置从 `@mlightcad/cad-agent-plugin` 移到新的 **`@mlightcad/cad-llm-plugin`**，CAD 智能体和 `pdftext` 文字识别（OCR）共用同一份配置。新包提供 **LLMSETTINGS** 命令和一个不依赖 UI 框架的设置对话框（`@mlightcad/cad-editor` 的 AI 功能区选项卡中也有入口）；`@mlightcad/cad-simple-viewer` 新增 `AcApLlmSettingsService`，任何功能都可以通过它打开对话框，或检查是否配置了支持图片的模型。

宿主迁移：

- 安装 `@mlightcad/cad-llm-plugin`（现在是 `@mlightcad/cad-agent-plugin` 的 peer 依赖），并在 `registerLazyAgentPlugin` 旁调用 `registerLazyLlmPlugin`。安装该包后，`@mlightcad/cad-editor` 会自动完成注册。
- `registerLazyAgentPlugin` 不再注册文字识别器。识别器 id 改为 `cad-llm`（原为 `cad-agent`），由 `registerLazyLlmPlugin` 注册。`acapAgentRecognizeText` / `cleanRecognizedText` 改为 `@mlightcad/cad-llm-plugin` 中的 `acapLlmRecognizeText` / `acapLlmCleanRecognizedText`。
- 智能体面板中内嵌的设置卡片被对话框取代，齿轮按钮会打开 LLMSETTINGS。
- 已保存的设置不会丢失：`localStorage` 键 `cad-agent-plugin.llm-config` 保持不变。
- 当前使用的模型只支持文本时，OCR 会改用第一个已配置的支持图片的模型。

```ts
import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'
import { registerLazyLlmPlugin } from '@mlightcad/cad-llm-plugin/register'

registerLazyLlmPlugin(pluginManager)
registerLazyAgentPlugin(pluginManager)
```

:::

::: info 输入 PDF：`ipdf` 改为 `PDFIMPORT` / `-PDFIMPORT`
从包含此改动的版本（1.8.0）起，`@mlightcad/cad-pdf-plugin` 的 PDF 导入命令改用 AutoCAD 的名称：

- **PDFIMPORT** 在选择文件后打开“输入 PDF”对话框（`AcUiPdfImportDialog`）：带预览的页面、插入点（X/Y 或在屏幕上指定）、比例和输入方式（复原图纸 / 保留 PDF 视觉效果）。
- **-PDFIMPORT** 保留原 `ipdf` 的命令行提示（页码，以及带“比例”和“模式”选项的插入点），对应类为 `AcApImportPdfPromptCmd`。

迁移：`ipdf` 已不存在。通过 `executeCommand('ipdf')` 并回答提示的脚本应改用 `-pdfimport`；自行渲染功能区的宿主应使用 `pdfimport`（cad-editor 功能区按钮 ID 现为 `cmd-pdfimport`）。命令说明从 `command.ACAD.ipdf` 移到 `command.ACAD.pdfimport` / `command.ACAD.-pdfimport`，提示文本从 `jig.ipdf` 移到 `jig.pdfimport`（对话框文本位于 `jig.pdfimport.dialog`）。`AcApPdfImportConvertor.importFromFilePicker` 现在显示对话框；`importFromCommandLine` 为命令行流程。
:::

::: info 智能块：搜索并转换（`BSEARCH`）
自包含本变更的版本起，`@mlightcad/cad-simple-viewer` 注册 **-BSEARCH**，`@mlightcad/cad-editor` 增加 **BSEARCH**（别名 `BCONVERT`），提供工具选项板中的「搜索并转换」选项卡（列出找到的实例）和「转换为块」对话框（位于功能区「插入」和「AI」选项卡）。

形状匹配已从 `@mlightcad/cad-pdf-plugin` 移至 `@mlightcad/cad-simple-viewer`，请迁移导入：

| `@mlightcad/cad-pdf-plugin`（已弃用）                                      | `@mlightcad/cad-simple-viewer`                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `findPdfShapeMatches`                                                      | `acedFindShapeMatches`                                                           |
| `applyPdfAffine`                                                           | `acedApplyAffine2d`                                                              |
| `pdfEntityToFeature`                                                       | `acedEntityToShapeFeature(entity, id, { matchLayer: false })`                    |
| `PdfMatchFeature` / `PdfAffine` / `PdfShapeMatch` / `PdfShapeMatchOptions` | `AcEdShapeFeature` / `AcEdAffine2d` / `AcEdShapeMatch` / `AcEdShapeMatchOptions` |

旧名称仍作为已弃用的别名可用。文字内容已从特征的 `kind` 移到 `label`（默认 `ignoreLabels: false` 时仍需一致）。`pdfblock` 现在使用 `-BSEARCH` 的提示顺序（转换 → 新建/现有 → 名称 → 插入点 → 范围），按旧提示应答的脚本需要调整。
:::

::: info AutoCAD 编组（`GROUP` / `PICKSTYLE` / `GROUPDISPLAYMODE`）
自包含本变更的版本起，`@mlightcad/cad-simple-viewer` 注册 **GROUP**、**-GROUP**、**UNGROUP**、**GROUPEDIT**；当 `PICKSTYLE` 为 `1` 或 `3` 时扩展选择；并对可选编组应用 `GROUPDISPLAYMODE` 夹点。`@mlightcad/cad-editor` 增加 **CLASSICGROUP**（对象编组对话框）以及「开始 → 编组」功能区面板。

需要已注册 `PICKSTYLE`（0–3，默认 `1`）和 `GROUPDISPLAYMODE`（0–2，默认 `2`）的 `@mlightcad/data-model`。关联填充共选（`PICKSTYLE` 2/3）在 `AcDbHatch` 具备边界软指针之前仍为 no-op。
:::

::: info `cad.view.capturePreview` 选中预览出图
自包含本变更的版本起，`CadSession.capturePreview` 改为接收选项对象，不再使用单独的 `longSide` 数字参数：

```ts
capturePreview?(options?: {
  longSide?: number
  selection?: boolean
}): Promise<CaptureDrawingPreviewResult>
```

脚本侧使用 `cad.view.capturePreview({ longSide?, selection? })`。在 `cad.selection.replace(ids)` 之后传入 `selection: true`，会通过与 ENTPREVIEW 相同的 batch 预览路径提取选中图元（按场景包围盒取景，而非数据库 `geometricExtents`），并将 PNG 附加到工具结果。空选中返回 `reason: 'no-selection'`。无渲染器的 `createDatabaseSession` 仍会跳过预览。
:::

::: info `cad.view.capturePreview` 按图层出图
自包含本变更的版本起，`CadCapturePreviewOptions` 新增 `layers?: string | string[]`，`CaptureDrawingPreviewFailure` 新增 `'no-layers'`：

```ts
cad.view.capturePreview({ layers: ['WALL', 'DOOR'], longSide: 1024 })
```

只渲染模型空间中这些图层上的图元（块参照只贡献其位于这些图层上的部分），并按这些图层叠加后的范围取景，而不是整张图纸。图层名不区分大小写；不存在的图层名会在脚本运行时抛错；`layers` 不能与 `selection: true` 同时使用。`normalizeCadCapturePreviewOptions` 现在返回 `NormalizedCadCapturePreviewOptions`（`layers` 为去重后的 `string[]`）。自定义的 `CadSession.capturePreview` 实现应处理 `options.layers`，或返回 `reason: 'no-layers'`。查看器实现使用新增的 `AcApEntityPreviewConvertor.captureLayers(layerNames, longSide)`。
:::

::: info 轻量文件打开落地页入口
从 **1.8.0** 起，`@mlightcad/cad-simple-viewer` 为落地页提供不依赖 DocManager 的子路径。请优先使用 **`acuiCreateFileOpenSession`**（延迟 `createDocManager` + 自动打开 / `attachSourcesTo`）。当你自行打开图纸时使用 `AcUiFileOpenLanding`（例如 Vue `MlCadViewer`）：

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

在首页 / 文件选择界面使用，使完整查看器在打开图纸之前保持懒加载。Vue 编辑器对应的是 `@mlightcad/cad-editor/locale`，可在不挂载 `MlCadViewer` 时使用 i18n。

完整说明见[文件打开面板](./file-open-panel)。云端源契约见[数据源插件](./data-source-plugin)。
:::

::: warning 包改名：`@mlightcad/cad-viewer` → `@mlightcad/cad-editor`
从 **1.8.0** 开始，为了让包名体现出它真正的功能，原先的 `@mlightcad/cad-viewer` 已改名为 `@mlightcad/cad-editor`。

- **旧包不再更新**：`@mlightcad/cad-viewer` 停在 1.7.x，registry 上不会再出现新版本，所以直接 `pnpm add @mlightcad/cad-viewer@1.8.0` 会报 404——这并不表示项目停止维护，请改用新包名。
- **API 没有任何变化**：只有包名和产物文件名变了，`MlCadViewer`、`i18n` 等导出与用法完全一致。
- **升级时请一次性换名**，与本页其余包一起升级到同一版本：

```diff
  {
    "dependencies": {
-     "@mlightcad/cad-viewer": "1.7.8",
+     "@mlightcad/cad-editor": "1.8.0",
      "@mlightcad/cad-simple-viewer": "1.8.0"
    }
  }
```

```diff
- import { MlCadViewer, i18n } from '@mlightcad/cad-viewer'
+ import { MlCadViewer, i18n } from '@mlightcad/cad-editor'
```

如果你通过 jsDelivr 等 CDN 按版本固定文件路径，请一并修改文件名：

```diff
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.js
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.css
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.js
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.css
```

::: tip 仓库名没有变
GitHub 仓库仍然是 [`mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer)，文档站和在线演示也沿用原路径。改名只涉及 **npm 包名**，因此本指南中的仓库链接、issue 链接都可以照旧使用。
:::
:::

::: warning HTML 导出公开 API 重命名（`AcExHtml` / `acexHtml`）
从 **1.8.0** 开始，`@mlightcad/cad-html-core`（并由 `@mlightcad/cad-html-plugin` 再导出）的公开类型与函数统一使用层前缀：`AcExHtml*`（类型）与 `acexHtml*`（函数），与仓库其余部分的命名约定一致。

行为不变，只改符号名。从 1.7.x 升级时请同步修改 import：

```diff
  import {
-   type AcExSnapshot,
-   buildAcExPackage,
-   zipAcExPackageFiles,
-   unzipAcExPackageFiles,
-   packHtml,
-   packHtmlPackage
+   type AcExHtmlSnapshot,
+   acexHtmlBuildPackage,
+   acexHtmlZipPackageFiles,
+   acexHtmlUnzipPackageFiles,
+   acexHtmlPackHtml,
+   acexHtmlPackHtmlPackage
  } from '@mlightcad/cad-html-plugin'
```

其他 HTML-core 辅助函数同样改名（例如 `captureAcExSavedViewExtents` → `acexHtmlCaptureSavedViewExtents`，`buildOsnapCatalog` → `acexHtmlBuildOsnapCatalog`）。命令级 API（如 `AcApHtmlConvertor` 以及 `chtml` / `-chtml`）不受影响。开发指南中展示的新名称面向 **1.8.0+**；若仍使用 1.7.x，请继续用旧符号名。
:::

::: tip 脚本宿主：创建真正的标注实体（`drawDim*`）
自 **1.8.0-preview.2** 之后的版本起，`@mlightcad/cad-script-core` 的 `cad.edit.transaction` 可创建标注实体（此前只能读取快照）：

- `drawDimAligned`、`drawDimLinear`、`drawDimDiameter`、`drawDimRadius`
- `drawDimAngular`、`drawDimArc`、`drawDimOrdinate`

Agent / 脚本应调用这些方法，而不是用直线、箭头和文字拼假标注。直径/半径支持 `center` + `radius`，可直接使用圆快照。详见 [脚本 API](../guide/script/api.md)。
:::

::: tip 脚本宿主：按块统计挂在 `cad.blocks`
包含此改动的版本起，`cad.blocks` 提供每个块的 `entityCount` / `typeCounts` 元数据，不再内嵌实体数组。统计请用这些字段或 `count(pred)`。快照用 `where` / `inBlock(id, pred)`——整空间裸快照会在约 500 条时以 `too_many_matches` 中止。`where` / `count` / `inBox` 只扫模型/图纸空间（块定义用 `inBlock`）。块参照的 `type` 为 `BlockReference`。
:::

::: info SVG File → Open
从 **1.8.0** 起，可通过常规 File → Open / `openDocument` / `openUrl` 打开 `.svg`。矢量转换在新包 [`@mlightcad/cad-svg-converter`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-converter)（仅依赖 `@mlightcad/data-model`）。

**使用 `@mlightcad/cad-editor`：** `initializeCadViewer` 会自动注册转换器；请与固定版本组一起安装 `@mlightcad/cad-svg-converter`。

**仅使用 `@mlightcad/cad-simple-viewer`：** 启动时调用一次 `registerSvgConverter()`。

v1 支持子集：`line`、`polyline`/`polygon`/`rect`、`circle`、`ellipse`（非均匀时折线近似）、`path`（细分）、`text`、嵌套 `g` + transform。导出仍用 `@mlightcad/cad-svg-plugin` 的 `csvg`；编辑后保存为 DXF（`cdxf`）或再导出 SVG，无原生 SVG 保存。
:::

::: info HTML/PDF 导出默认跳过空布局
从包含此改动的版本起，HTML 与 PDF 导出新增 **`exportEmptyLayouts`**（默认 **`false`**）。仅含 AutoCAD 默认 `*Paper_Space` 视口的图纸空间布局会被省略，除非将该选项设为 `true`。在导出布局时始终保留模型空间。

迁移：若输出中仍需空白图纸空间选项卡，请传入 `exportEmptyLayouts: true`（导出对话框开关、`-chtml` / `-cpdf` 提示、脚本 `cad.file.saveHtml` / `savePdf`，或导出器 CLI 的 `--export-empty-layouts`）。
:::

::: info PDF 导出拆分为共享核心（浏览器 + Node）
从 **1.8.0** 开始，PDF 导出与 HTML 导出采用相同的分层：共享逻辑放在 `@mlightcad/cad-pdf-core`（选项模型与 database → PDF 管线，**不**依赖 `cad-simple-viewer` / DOM）。两个前端都基于它：

| 包                            | 作用                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `@mlightcad/cad-pdf-plugin`   | 浏览器端 `cpdf` / `-cpdf` / `pdfimport`（以及 Vue 导出对话框） |
| `@mlightcad/cad-pdf-exporter` | Node 无头 DXF/DWG → PDF — **无需浏览器**                       |

**浏览器集成方——大体不变。** 继续使用 `cpdf` / `-cpdf` / `pdfimport`、`AcApPdfConvertor`、`AcApPdfExportOptions`、`resolveAcApPdfExportOptions`。请把新的 peer `@mlightcad/cad-pdf-core` 与插件一起安装（版本与 `cad-simple-viewer` 相同）。

**对用户有影响的 API / 行为变化：**

- 新增选项 `colorMode: 'color' | 'monochrome'`（默认 `'color'`）。出现在 `cpdf` 对话框、`-cpdf` 的**最后一个**提示（`Color` / `Monochrome`），以及 `AcApPdfExportOptions`。既有 `-cpdf` 脚本须在文字模式提示之后回答该提示（或回车取默认值）。
- 无浏览器的服务端 / CI：请使用 `@mlightcad/cad-pdf-exporter`（`exportFileToPdf`、`convertDatabaseToPdf`），不必再通过 Playwright 驱动 `cpdf`。

```ts
// 浏览器（名称不变）
import {
  AcApPdfConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({ colorMode: 'monochrome' })
)

// Node，无需浏览器
import { exportFileToPdf } from '@mlightcad/cad-pdf-exporter'

await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome'
})
```

直接调用共享管线的高级用法见 `@mlightcad/cad-pdf-core` 的 `acexPdfExportDatabase` / `acexPdfResolveExportOptions`。字体、布局与文字模式细节见各包 README。
:::

## 概览

`@mlightcad/cad-simple-viewer` 和 `@mlightcad/cad-editor` **不是独立的包**。它们属于一个紧密集成的生态系统，共享同一代码库和发布周期。每个版本都会捆绑一组协调一致的更新，涵盖插件、渲染器、data-model 包、文本渲染库以及第三方 UI 框架。

**仅单独升级 `cad-simple-viewer` 或 `cad-editor` 可能导致难以察觉的运行时故障**，包括：

- 插件接口期望的 API 签名在新版（或旧版）核心中已经改变
- 核心期望的数据模型结构与旧版解析器/渲染器产出的结构不匹配
- 升级 libredwg-converter 后缺少 WebAssembly 或 worker 兼容性
- `mtext-renderer` / `mtext-parser` 版本漂移导致文本渲染异常
- Three.js 的破坏性变更或行为变更未在渲染器层同步对齐

始终**将整组相关包一起升级**。下面介绍两种确定正确版本的可靠方法。

---

## 生态系统一览

升级前，了解哪些包属于协同发布、哪些属于第三方会有所帮助。以下类别与同一个 cad-editor 版本保持同步：

### 核心查看器包

| 包                             | 作用                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `@mlightcad/cad-simple-viewer` | 与框架无关的核心（文档管理、命令栈、渲染粘合层）             |
| `@mlightcad/cad-editor`        | 构建在 cad-simple-viewer 之上的 Vue 3 + Element Plus UI 封装 |

### 插件——**必须与 cad-simple-viewer 版本完全一致**

| 包                                       | 用途                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `@mlightcad/cad-html-plugin`             | 一键导出自包含 HTML                                 |
| `@mlightcad/cad-pdf-plugin`              | 浏览器端 PDF 导出与 PDF 转 CAD 导入                 |
| `@mlightcad/cad-svg-plugin`              | SVG 导出                                            |
| `@mlightcad/cad-svg-converter`           | SVG File → Open（矢量 → AcDb 实体）                 |
| `@mlightcad/cad-simple-viewer` (`simpleUi`) | Built-in plain-DOM toolbar / dock tabs (`simpleUi`) |
| `@mlightcad/cad-agent-plugin`            | AI 智能体驱动的交互                                 |
| `@mlightcad/cad-onedrive-plugin`         | OneDrive 集成                                       |
| `@mlightcad/cad-google-drive-plugin`     | Google Drive 集成                                   |

> **经验法则：** 上面列表中的每个插件都应固定为与你正在升级到的 `cad-simple-viewer` **完全相同的版本号**（例如 `1.7.5`）。

### 共享导出核心与无头导出器（与核心同版本）

| 包                             | 用途                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `@mlightcad/cad-html-core`     | 共享 HTML 快照 / 打包管线（无查看器 / DOM）               |
| `@mlightcad/cad-html-exporter` | Node 无头 HTML 导出                                       |
| `@mlightcad/cad-pdf-core`      | 共享 PDF 选项模型与 database → PDF 管线（无查看器 / DOM） |
| `@mlightcad/cad-pdf-exporter`  | Node 无头 DXF/DWG → PDF（无需浏览器）                     |

### 内部渲染器层（与核心同版本，单独发布）

| 包                          | 用途                               |
| --------------------------- | ---------------------------------- |
| `@mlightcad/three-renderer` | 基于 THREE.js 的 2D/3D 渲染引擎    |
| `@mlightcad/pdf-renderer`   | `cad-pdf-core` 使用的 PDF 内容后端 |

这些包由插件和 cad-simple-viewer 在内部使用。你通常**不会**直接安装它们，但它们的版本必须与你安装的插件兼容。

### 底层数据与文本层——**必须匹配发布版本中的版本**

| 包                              | 说明                                              |
| ------------------------------- | ------------------------------------------------- |
| `@mlightcad/data-model`         | 核心实体/数据库类型；每个版本都会随查看器一起升级 |
| `@mlightcad/libredwg-converter` | DWG 解析的 WebAssembly 封装——DWG 支持依赖它       |
| `@mlightcad/mtext-parser`       | MTEXT 内容解析器                                  |
| `@mlightcad/mtext-renderer`     | MTEXT → THREE 几何渲染器                          |
| `@mlightcad/mtext-input-box`    | 画布内 MTEXT 编辑器控件                           |

### 仅 cad-editor 使用的 Vue UI 依赖

这些出现在 `pnpm-workspace.yaml` 的 overrides 中，但仅在使用 `@mlightcad/cad-editor`（完整的 Vue 3 UI）时需要。cad-simple-viewer 的集成不会直接安装它们。

| 包                         | 用途                 |
| -------------------------- | -------------------- |
| `@mlightcad/ribbon`        | Ribbon UI 组件       |
| `@mlightcad/ui-components` | 共享 Vue UI 基础组件 |

### 第三方 peer 依赖（保持发布版本中固定的版本）

| 包                                   |
| ------------------------------------ |
| `three`                              |
| `vue`（仅 cad-editor 使用）          |
| `element-plus`（仅 cad-editor 使用） |
| `vue-i18n`（仅 cad-editor 使用）     |
| `lodash-es`                          |

---

## 方法 1 — 读取目标版本的 `pnpm-workspace.yaml`

每个版本的规范事实来源是 monorepo 在对应 Git 标签下的 `pnpm-workspace.yaml` `overrides` 部分。它列出了该版本测试过的每个 `@mlightcad/*` 包和第三方 peer 依赖的**确切版本**。

### 步骤

1. 找到你要升级到的版本标签。标签遵循 `vX.Y.Z` 模式（例如 `v1.7.5`）。所有标签都在主仓库中：

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. 在该标签下打开 `pnpm-workspace.yaml`。URL 模板为：

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   将 `vX.Y.Z` 替换为真实的版本标签，例如：

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. 将 `overrides:` 块复制到你自己的项目的 `pnpm-workspace.yaml` 中。内容类似如下（简略示例）：

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. 将你使用的每个 `@mlightcad/cad-*-plugin` 更新为与 `cad-simple-viewer` / `cad-editor` **相同的版本**：

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-editor": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. 运行 `pnpm install`（或 `npm install`），并验证应用加载时没有 peer 依赖警告。

> 如果你的项目是普通的 `npm` 或 `yarn` 工作区，请将相同的 `overrides` 分别复制到 `pnpm.overrides` / `resolutions` 块中——重要的是版本值，而不是文件格式。

---

## 方法 2 — 查看 `cad-simple-viewer-demo` 的升级提交

[cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) 仓库是 `cad-simple-viewer` 的官方最小宿主。每次核心发布时，示例项目都会收到一个标题为 `feat: upgrade to cad-simple-viewer vX.Y.Z` 的提交，该提交会**一并更新所有相关依赖**。这个提交是一个具体、实用的参考，准确展示了维护者在该版本中使用了哪些版本。

### 步骤

1. 打开 package.json 文件的提交历史：

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. 找到提交信息为 `feat: upgrade to cad-simple-viewer vX.Y.Z` 且对应你目标版本的提交。

3. 点击该提交查看 diff。diff 会显示协调一致的版本提升，涉及：
   - 所有插件（与 `cad-simple-viewer` 同版本）
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - 以及任何发生变化的第三方包

4. 将 diff 中的版本抄录到你自己的 `package.json` 中。

### 具体示例——v1.7.3 → v1.7.4 升级

以下真实 diff 取自示例仓库中的[提交 `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff)。注意**每一个 `@mlightcad/*` 包都步调一致地移动**：

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> 这正是你应该在自己的项目中做出的协调更新。注意 `mtext-parser` 保持在 `^1.5.3`（无需变更），而 `mtext-renderer` 从 `0.13.1` 变为 `0.13.2`。这些决定是按版本做出的，你应当遵循它们，而不是自行猜测。

---

## 升级后的快速健康检查

1. **安装**——执行一次干净的安装，确保没有残留的 `node_modules` 干扰：

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **打开图纸**——验证 DXF 和 DWG 文件都能加载，平移/缩放正常工作，且控制台没有错误。

3. **导出**——如果使用导出插件，请在示例图纸上测试 HTML、PDF 和 SVG 导出。

4. **检查 peer 依赖警告**——如果有任何 `peerDependencies` 未满足，`pnpm` 会发出警告。请将其视为必须修复的问题；它们通常是因为某个插件的版本偏离了核心。

5. **构建应用**——完整的 `vite build`（或等效命令）是发现查看器类型与你自己的集成代码之间类型不匹配的最快方式。

---

## 常见问题

**Q：可以将 `cad-simple-viewer@1.7.5` 与 `cad-html-plugin@1.7.3` 混用吗？**

答：通常不行。插件与核心一起发布，并且经常依赖在小版本之间发生变化的内部 API。即使 TypeScript 能编译通过，也可能遇到运行时故障（例如导出静默产生空输出，或插件注册失败并给出误导性的错误）。

**Q：如果我只使用 `cad-simple-viewer` 而不使用任何插件呢？**

答：你仍然需要兼容版本的 `data-model`，以及（如果加载 DWG 文件）`libredwg-converter`。目标标签下的 `pnpm-workspace.yaml` 仍然适用。

**Q：语义化版本能保护我吗？**

答：semver 范围（`^`、`~`）在发布系列*内部*进行补丁级升级时工作良好（例如 `^1.7.0` 会自动获取 `1.7.5`），但**协同的插件/data-model/libredwg-converter 版本**无法仅从 semver 推断——它们由发布维护者设定。对于任何给定的小版本升级，你仍然需要上述两种方法之一来确定哪些版本配套。

**Q：我使用 npm/yarn 而不是 pnpm，这是否仍然适用？**

答：适用。无论使用哪种包管理器，版本协同方式都相同。使用 `overrides`（pnpm）、`resolutions`（yarn）或 `overrides`（npm），填入 `pnpm-workspace.yaml` 中的值，或者直接在 `package.json` 中固定 `cad-simple-viewer-demo` diff 中的版本。
