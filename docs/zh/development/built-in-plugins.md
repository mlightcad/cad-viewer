---
title: "内置插件"
---

# 内置插件

MLightCAD 随附一组官方插件。每个插件专注于一项职责 —— UI 界面、AI 助手、导出/导入管线或云端数据源 —— 可以按需组合使用。

关于插件机制本身（`AcApPlugin`、插件管理器、延迟加载以及如何编写自己的插件），请参阅[插件系统](./plugin-system)。安装、注册和完整的 API 细节见各包的 README —— 链接见下文。

## 插件总览

| 包 | 职责 | 命令 / 能力 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | 为 `cad-simple-viewer` 提供**工具栏、图层管理器与审阅面板 UI**（纯 DOM，无 Vue/React） | `layer`、`markuppanel`、默认工具栏（视图、测量、导出、审阅、主题、语言） |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **自然语言 CAD 智能体**（AI 聊天面板 + 绘图工具调用） | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **手动 CAD 脚本控制台**（对图纸运行受检脚本，无需 LLM / API 密钥） | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | 将图纸导出为**自包含离线 HTML** | `chtml`（`cad-viewer` 中为对话框）、`-chtml`（命令行） |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **PDF 导出与导入**（矢量管线） | `cpdf`、`ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **SVG 导出**及共享矢量渲染器（也被 PDF 导出使用） | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **OneDrive 数据源** — 从 OneDrive / SharePoint 打开 DWG/DXF | 注册 `AcApDataSource`（`onedrive`）；两步 Sign in → Open（防弹窗拦截） |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Google Drive 数据源** — 从 Google Drive 打开 DWG/DXF | 注册 `AcApDataSource`（`googledrive`）；两步 Sign in → Open（防弹窗拦截） |

所有命令触发的插件均为**延迟加载**：预先注册一个小的注册桩，仅当用户运行触发命令时才下载完整包。注册 API 请参阅[插件系统 — 注册插件](./plugin-system#注册插件)。

---

## UI 插件

### `@mlightcad/cad-simple-ui-plugin` — 简单查看器的 UI 界面

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) 刻意不包含**任何应用 UI** —— 只有画布和 CAD 核心。如果你将简单查看器嵌入自己的 Web 应用，并希望获得现成的界面而不必采用完整的 Vue 版 [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-editor) 外壳，**`cad-simple-ui-plugin` 就是预期的 UI 层**。

它提供：

- **可配置的工具栏**（可放置在任意边缘、默认 CAD 命令、嵌套菜单、自定义项）
- 一个**停靠面板**，包含**图层管理器**标签页（图层开关、ACI 颜色选择器、双击缩放到图层）和**审阅面板**标签页（批注列表、状态、评论）
- 与 `COLORTHEME` 系统变量及宿主元素上的 `--ml-ui-*` CSS 变量**主题同步**
- 与 `AcApI18n` **语言同步**（英语 / 中文 / 捷克语 / 土耳其语）

所有组件都是框架无关的（纯 DOM）。完整 Vue 版 `cad-viewer` 应用有自己的 Element Plus UI，不需要此插件；当你直接基于 `cad-simple-viewer` 构建时使用 `cad-simple-ui-plugin`。

→ **快速开始、工具栏定制与选项：** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI 绘图助手

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) 为基于 `cad-simple-viewer` 的应用添加**自然语言 CAD 智能体**。用户用日常语言描述需求，智能体调用 CAD 工具检查图纸并创建或修改几何图形。

它提供：

- **延迟加载**的 `AcApPlugin`（触发命令：`agent`），AI 包不会进入关键路径
- 基于 Vercel AI SDK（`Experimental_Agent` + `@ai-sdk/vue`）构建的 **Vue 聊天面板**（`AgentChatPanel`）
- **浏览器端 LLM 配置** — OpenAI、Anthropic 或 OpenAI 兼容端点的 API 密钥保留在客户端（加密存储在 `localStorage`）
- **第一阶段 CAD 工具** — `get_drawing_context`；`draw_line`、`draw_circle`、`draw_arc`、`draw_rectangle`、`draw_polyline`、`draw_text`；`set_current_layer`、`create_layer`、`zoom_extents`
- 通过插件 i18n 层支持**英语 / 中文 / 土耳其语 / 捷克语**界面

完整 Vue 版 `cad-viewer` 应用在安装了该包时会自动注册智能体（面板标签页）。`cad-simple-viewer-demo` 通过 `cad-simple-ui-plugin` 将其接入停靠标签页。宿主应用调用 `registerLazyAgentPlugin` 和 `setAgentPaletteOpener` 来挂载面板。

→ **安装、注册与工具列表：** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — CAD 脚本控制台

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) 为基于 `cad-simple-viewer` 的应用添加**手动 CAD 脚本控制台**。与智能体插件不同，它**不**与模型通信，也不需要 **API 密钥**：控制台运行来自 `@mlightcad/cad-agent-core` 的受检脚本宿主，每个脚本是一个带一个参数 `cad` 的函数体，可编程访问智能体所用的相同绘图工具。

- 延迟加载的 `AcApPlugin`（触发命令：`cadscript`）
- 复用 `@mlightcad/cad-agent-core` 的 CAD 工具；本包仅添加面板和命令
- 宿主应用调用 `registerLazyCadScriptPlugin` 并挂载 `new CadScriptPanel().element`（`cad-simple-viewer-demo` 中为停靠标签页，`cad-viewer` 中为工具面板标签页）；移除标签页时调用 `destroy()`

→ **用法：** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## 导出 / 导入插件（HTML / PDF / SVG）

这些插件向同一个插件管理器添加导出（及 PDF 导入）命令。它们都是**延迟加载**的，以保持初始页面体积较小。`cad-simple-viewer-demo` 示例注册了全部三个导出插件以及 UI/智能体/脚本插件；完整 `cad-viewer` 应用在其引导过程中注册导出插件和智能体/脚本插件（如已安装）。

### HTML（`@mlightcad/cad-html-plugin`）

用于分享和归档的**单文件离线查看器** —— 导出的 HTML 内嵌图纸数据和运行时查看器，无需服务器。

| 项 | 值 |
|------|-------|
| 命令 | `chtml`（`cad-viewer` 中为对话框）、`-chtml`（通过 `cad-simple-viewer-cli` 的命令行） |
| 额外配置 | `AcApDocManager.createInstance()` 上的 `htmlViewerRuntimeUrl` — `viewer-runtime.iife.js` 的 URL（从包的 `dist/` 复制） |
| 公开 API | `registerLazyHtmlPlugin`、`createHtmlPlugin`、`AcApHtmlConvertor`、`packHtml`、快照类型 |

→ **构建产物与集成：** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **使用相同管线的无头 CLI：** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF（`@mlightcad/cad-pdf-plugin`）

**矢量 PDF 导出与 PDF 转 CAD 导入。**

| 项 | 值 |
|------|-------|
| 命令 | `cpdf`（导出）、`ipdf`（导入） |
| 公开 API | `registerLazyPdfPlugin`、`createPdfPlugin`、转换器 |

→ **构建产物与集成：** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG（`@mlightcad/cad-svg-plugin`）

**矢量 SVG 导出**以及被 PDF 导出使用的共享矢量渲染器。

| 项 | 值 |
|------|-------|
| 命令 | `csvg` |
| 公开 API | `registerLazySvgPlugin`、`createSvgPlugin`、`AcApSvgConvertor`、SVG 渲染器工具 |

→ **构建产物与集成：** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## 数据源插件（OneDrive / Google Drive）

这些插件不注册命令 —— 它们注册一个 [`AcApDataSource`](./data-source-plugin)，让用户可以直接从云存储打开 DWG/DXF 图纸。两者都采用**两步 Sign in → Open 流程**，以避免被弹窗拦截器拦截。

### `@mlightcad/cad-onedrive-plugin`

基于 Microsoft File Picker v8 + MSAL 构建的 **OneDrive / SharePoint 数据源**。需要 Azure 应用注册（SPA，委派 `User.Read` + `Files.Read.All` 权限）。

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Azure 应用配置与完整集成：** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) 以及[数据源插件](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

具有相同 `AcApDataSource` 契约的 **Google Drive 数据源**。

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Google Cloud 配置与完整集成：** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## 各应用注册了哪些插件？

| 应用 | 注册的插件 |
|-----|--------------------|
| `cad-simple-viewer` | 无 —— 仅核心，插件均为可选 |
| `cad-simple-viewer-demo` | 导出插件（HTML/PDF/SVG）、`cad-simple-ui-plugin`、`cad-agent-plugin`、`cad-script-plugin` |
| `cad-viewer`（Vue） | 导出插件（HTML/PDF/SVG）；智能体和脚本插件在**已安装时**自动注册（可选 peer 依赖） |

---

## 相关文档

- [插件系统](./plugin-system) — `AcApPlugin` 接口、插件管理器、延迟加载以及编写自己的插件
- [数据源插件](./data-source-plugin) — OneDrive / Google Drive 插件所使用的 `AcApDataSource` 机制
- [命令](./command) — 命令生命周期与 `AcEdCommand`
