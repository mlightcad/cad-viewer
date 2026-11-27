# MLightCAD（中文）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD 是`全球首个完全运行在浏览器端、无需依赖任何后端服务的 Web 版 DXF/DWG 查看、对比与编辑平台`。
通过在浏览器中直接完成 DWG/DXF 解析、几何处理和渲染，MLightCAD 实现了真正的无服务器（serverless）CAD 查看与编辑，非常适合云应用、离线使用以及对隐私敏感的工作场景。

MLightCAD 不只是一个 CAD 看图工具，而是一套**完全运行在浏览器里的 CAD 基础设施**——在同一个浏览器原生 CAD 引擎之上，提供三种开箱即用的产品形态：

| 子项目 | 定位 | 对应包 |
| --- | --- | --- |
| **CAD Viewer** | 查看与审阅：打开 DWG/DXF，平移缩放、测量、批注；也可作为 SDK 嵌入你自己的产品 | [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) |
| **CAD Diff Viewer** | 图纸版本对比：左右并排或叠加两版图纸，灰色表示未变、红色表示删除、绿色表示新增，并可按变更集生成修订云线 | [`@mlightcad/cad-diff-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-diff-viewer) |
| **CAD Editor** | 编辑与绘制：AutoCAD 风格的菜单、功能区、命令行与状态栏，打开图纸即可直接修改几何 | [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) |

三者共享同一套实体数据模型、渲染引擎与插件总线，UI、导出、AI 等能力按需加载、不重复实现——查看、对比、编辑是同一个 CAD 内核的不同产品形态，而不是三个互不相干的工具。

在此之上，MLightCAD 还提供市面上 CAD 软件中极为少见的能力——**一键导出为单个自包含 HTML 文件**。下载的 `.html` 内嵌图纸快照与轻量查看器运行时，接收方只需用任意现代浏览器即可离线打开、平移缩放、切换图层并测量距离，**无需安装 CAD 软件、无需服务器、无需再打开 MLightCAD**。多数桌面或 Web CAD 工具只能在自家产品内查看；MLightCAD 则把当前图纸变成可邮件发送、可归档、可放到静态站点上的便携文件，非常适合对外分享、合规留档与内网隔离环境。离线查看器的内存占用也远低于传统桌面 CAD 看图软件（见下文[内存对比](#自包含-html-内存占用)）。

MLightCAD 同时支持**服务器端预渲染**：图纸在服务器上完成一次解析与处理，客户端只需直接显示预渲染结果，无需再次解析 DWG/DXF 或重建几何数据。这能大幅降低客户端内存占用，并让同一图纸的第二次及之后的打开速度显著加快，尤其适合在移动端看图。

- [**🌐 主页**](https://mlightcad.com/)
- **🌐 在线演示**：[Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API 文档**：[Read the Docs](https://cad-viewer.readthedocs.io/en/latest/)（支持版本切换）· [MCP 服务器](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 项目 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- 稀土掘金: [@mlightcad](https://juejin.cn/column/7501992214283501579)

### 基于 MLightCAD 构建的应用（Apps Built with MLightCAD）

[Thingraph](https://cad.thingraph.site/) 团队在 MLightCAD 之上构建了面向生产环境的 DWG/DXF 查看器与平台集成，服务全球数万用户：

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — 浏览器端 DWG/DXF 查看器，工程团队可快速、无服务器地访问图纸。各平台安装入口：
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — 在 Drive 中通过 **Open with** 打开 DWG/DXF
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — `.dwg` / `.dxf` 只读自定义编辑器
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — 通过 Open VSX 安装同一扩展
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — 在页面中嵌入 DWG/DXF 预览
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — 在资源管理器中显示缩略图与预览

社区应用与集成：

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — 面向生产的浏览器端 CAD 查看器，支持 DWG、DXF、DWF、DWFx 与 XPS（[在线演示](https://cad-viewer-iys.pages.dev)）
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — Nextcloud 原生应用，可在浏览器中直接查看 DWG/DXF（[应用商店](https://apps.nextcloud.com/apps/cad_viewer)）

官方桌面应用：

- [MLightCAD Studio](https://github.com/mlightcad/mlightcad-studio) — MLightCAD 的官方桌面版，把 [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) 封装为 [Tauri 2](https://v2.tauri.app/) 应用，完全离线运行；提供 Windows（NSIS / MSI）、Linux（AppImage / deb）与 macOS（Universal DMG，Apple Silicon + Intel）安装包，[前往下载](https://github.com/mlightcad/mlightcad-studio/releases/)。

### 示例应用（Demo Apps）

官方示例应用，展示如何把 MLightCAD 集成到你自己的产品中：

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — 基于 [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) 的极简 vanilla TypeScript 宿主：打开本地或 CDN 的 DXF/DWG，用小型工具栏驱动命令，并懒加载 HTML/PDF/SVG 导出插件（不含完整 Vue UI）。
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — 基于 [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) 的完整 Vue 3 应用，含菜单、功能区、对话框、命令行与状态栏（[在线演示](https://mlightcad.github.io/cad-viewer-example/)）。
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Next.js「CAD 网盘」演示：分片断点续传上传 DWG/DXF、SQLite 文件列表与预览缩略图，并支持以**浏览器实时解析**（`cad-simple-viewer`）或**服务端 ACEX 预渲染**（打开更快、内存更少）两种方式查看图纸。

![MLightCAD Quick Demo](./assets/cad-viewer.gif)

## 功能特性

- **高性能**：大体量 DWG/DXF 文件也能以流畅的 60+ FPS 渲染
- **无需后端**：文件在浏览器本地解析与处理
- **数据更安全**：文件不离开本地设备，保护隐私
- **易于集成**：无需服务器或后端基础设施
- 模块化架构，便于第三方系统集成
- **清晰的分层架构**：模型层 → 渲染层 → 视图层 → UI / 插件，低层包不依赖高层包，并额外提供可独立部署的无头导出与 CLI；详见[架构总览](https://mlightcad.com/cad-viewer/docs/zh/development/architecture-overview.html)
- **插件系统**：可扩展的插件架构，官方提供 UI、AI 助手及 HTML/PDF/SVG 导出等插件，详见[插件系统开发指南](https://mlightcad.com/cad-viewer/docs/zh/development/plugin-system.html)
- **移动端布局与触控**：`@mlightcad/cad-simple-viewer` 内置响应式手机/平板布局与触控手势（双指缩放、单指平移、点选），无需单独的移动端应用即可在移动浏览器中使用
- **导出为离线 HTML**：将当前图纸导出为单个自包含 `.html` 文件，内嵌查看器（平移缩放、范围缩放、图层、距离测量、中英文界面），可在任意浏览器中离线打开，无需 MLightCAD 实例或后端。
- 支持离线与在线编辑流程
- 基于 THREE.js 的 3D 渲染引擎，包含多项性能优化
- 面向可扩展与二次开发，适配 CMS、Notion、微信等平台

## AI 能力

MLightCAD 内置一套面向 AI 的 CAD 能力。脚本与工具调用都在本地执行，图纸数据不出本机。

### CAD 脚本
- 内置沙箱化的 JavaScript 脚本运行时，通过统一的 `cad.*` 主机 API 查询实体、绘制、修改、测量与导出
- 一条脚本即可在一次调用中完成筛选、测量、修改与自检，避免大量工具往返和 token 消耗
- 执行前做 AST 校验：禁止 `import`、`eval`、网络与页面访问，并带步数/超时预算和快照数量上限
- 提供脚本控制台，可手写脚本直接运行，无需任何模型参与；脚本内可导出 DXF / PDF / HTML 等格式

### AI 智能体
- 提供自然语言对话面板：描述需求后，模型会编写并执行 `cad.*` 脚本完成绘图、查询与编辑
- 基于 Vercel AI SDK，模型与 API Key 在统一的 AI 模型设置中配置
- 提供 Simple / High 两种推理模式，High 模式会在复杂任务后截图并做视觉校验

### MCP
- 通过 `@mlightcad/cad-mcp-server` 把同一套脚本工具目录以 stdio MCP 暴露给外部 AI 客户端（如 Claude Desktop、Cursor）
- 外部助手可打开图纸、查询实体、执行脚本并保存结果，能力与内置智能体一致

### 智能块
- 自动查找所选对象的所有相同副本，并转换为块参照
- 可在整个图形范围内查找重复对象并批量转换为块
- 转换时可把仅有文字不同的副本（如房间号）自动变为块属性，并可设置最小收益阈值

### PDF 图纸复原
- 从 PDF 页面导入矢量几何并重建真实 CAD 图元——圆/圆弧/椭圆/样条、带凸度多段线、线宽与虚线线型、字体样式、实体填充与图案填充、图像；重复绘制的 Form XObject 会自动还原为块参照
- 可用一段已知距离校准导入图形的比例
- 把被打散成线条的文字识别回 CAD 文本实体：先用内置字形字典本地识别，剩余的交由 OCR / 视觉模型批量识别
- 从箭头、尺寸线和文字中还原线性、半径、直径和角度标注，并在复核面板中确认数值、选择或新建标注样式

## 一行代码嵌入 DWG/DXF

用一行 `<iframe>` 即可在任意网页中打开 DWG/DXF——**无需 CAD 后端，也无需把图纸上传到第三方云**。文件从你自己的 URL 拉取，并在访客浏览器中完成解析与渲染，开箱即用审查能力（平移、缩放、测量、批注）。

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1"
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

完整介绍与在线体验：[Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4)。

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### 安装

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 开发

```bash
# 启动完整版查看器（cad-viewer）
pnpm dev

# 或启动简易版查看器
pnpm dev:simple

# 或启动图纸对比查看器（cad-diff-viewer）
pnpm dev:diff
```

### 构建

```bash
pnpm build
```

### 预览

```bash
# 预览完整版查看器
pnpm preview

# 预览简易版查看器
pnpm preview:simple
```

## 使用说明

初次使用 MLightCAD？**[用户指南](https://mlightcad.com/cad-viewer/docs/)** 提供了分步说明，涵盖查看器界面、桌面端与触屏操作、批注和测量工具。

### 桌面浏览器操作
- **选择**：鼠标左键单击实体
- **缩放**：滚动鼠标滚轮上/下
- **平移**：按住鼠标中键拖拽
- **删除**：选中实体后按 `Del` 键

### 平板/手机浏览器操作
- **选择**：轻触实体
- **缩放**：双指捏合放大/缩小
- **平移**：单指拖动移动视图

## 性能优化

MLightCAD 针对复杂图纸渲染进行了多项优化，可在保持高帧率的同时处理大规模 DXF/DWG 文件：

- **自定义着色器材质**：在 GPU 侧高效绘制复杂线型与剖面填充
- **几何体合批**：对相同材质的点/线/面进行合并，显著减少 draw call
- **实例化渲染**：针对重复几何体进行实例化优化
- **缓冲几何优化**：高效的内存管理与几何合并，降低 GPU 开销
- **材质缓存**：复用相似实体的材质以减少状态切换
- **WebGL 优化**：充分利用现代 WebGL 的硬件加速能力

这些优化使得 MLightCAD 能够在渲染大量复杂实体的同时保持交互顺畅。

#### 自包含 HTML 内存占用

打开样例图纸 [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) 时，内存占用大致如下：

| 查看器 | 内存占用 |
|--------|----------|
| AutoCAD 2020 | 320 MB |
| 浩辰看图王 | 246 MB |
| 自包含 HTML（测量模式） | 56 MB |
| 自包含 HTML（查看模式） | 33 MB |

在查看模式下，离线 HTML 查看器比 AutoCAD 2020 约低 **83%**、比浩辰看图王约低 **77%**，同时仍支持平移缩放、图层切换与距离测量（测量模式）。

## 已知问题

默认的开源 DWG 方案基于 [LibreDWG](https://github.com/LibreDWG/libredwg)，通过可选的 `@mlightcad/libredwg-converter` 包提供。它可以处理不少图纸，但支持的 entity 类型仍然比较少，WASM bundle 体积更大、启动更慢、内存占用更高，解析大型 DWG 时还可能出现内存溢出；另外，对于闭源商业产品还需要考虑 GPL license 的传导问题。`@mlightcad/cad-simple-viewer` **默认不依赖、也不注册**该 converter — 宿主应用（参见各 example 包）需自行显式接入。

如果你需要更好的兼容性、更低的内存占用、更大的文件支持，或者更清晰的商业授权方案，请查看我们的 [**专有 DWG 解析器**](./PROPRIETARY-PARSER.zh-CN.md)。

| 项目 | 基于 LibreDWG 的解析器 | 专有 DWG 解析器 |
|------|-------------------------|------------------|
| 支持的 entities | 类型较少 | 覆盖更广 |
| Bundle 体积 | ~13 MB | ~437 KB |
| 加载速度 | 启动较慢 | 启动很快 |
| 内存占用 | 更高 | 更低 |
| 大型 DWG 文件 | 可能内存溢出 | 无此问题 |
| License | 有 GPL 传导风险 | 无 GPL 传导问题 |

## 路线图（Roadmap）

MLightCAD 的目标是打造一个**运行在浏览器中、功能完整、模块化且与前端框架无关的二维 CAD 系统**——查看、对比、编辑共享同一个内核。

路线图统一维护在 Wiki 中，既包含仍在开发中的平台能力（细节层次渲染、命名视图、自定义实体等），也包含正在推进的 AI 方向（图纸理解、自动化审阅、扫描图纸识别、可验证的自然语言编辑等）：

→ **[Roadmap（Wiki）](https://github.com/mlightcad/cad-viewer/wiki/Roadmap)**

## 参与贡献（Contributing）

欢迎各种形式的贡献！你可以通过提交 issue 或 pull request 来修复 bug、添加新功能或提出建议。  
在提交 bug 报告时，如果能提供有问题的图纸链接，将有助于问题的复现与修复。

## 许可证

MLightCAD monorepo 主体采用 [MIT](LICENSE) 授权。

DXF 加载使用 `@mlightcad/data-model` 中内置的 MIT 解析器。DWG 加载为**按需接入（opt-in）**：`@mlightcad/cad-simple-viewer` 不依赖 GPL 的 LibreDWG 包。若宿主需要开源 DWG 支持，需自行添加 `@mlightcad/libredwg-converter`（GPL-3.0）、部署其 worker 与 wasm，并注册 converter。若您交付闭源产品且无法向客户分发 GPL 代码，请改用 [**专有 DWG 解析器**](./PROPRIETARY-PARSER.zh-CN.md)。

→ **专有解析器说明：** [PROPRIETARY-PARSER.zh-CN.md](./PROPRIETARY-PARSER.zh-CN.md)（支持范围、授权条款、价格、集成方式、GPL 合规、支持维护）


