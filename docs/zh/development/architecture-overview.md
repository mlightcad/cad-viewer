---
title: "架构总览"
---

# 架构总览

CAD-Viewer 完全运行在浏览器中，**不依赖任何后端**。DWG/DXF 文件使用 WebAssembly 和 JavaScript 在本地解析和处理，从而确保：

- **零服务器要求** - 只需静态文件托管即可部署到任意环境
- **完整的数据隐私** - 文件永远不会离开用户的设备
- **即时集成** - 无需复杂的后端搭建或 API 配置
- **离线能力** - 在没有网络连接的情况下也能工作

CAD-Viewer 划分为多个子包，每个子包负责系统中的某个特定方面：

- **cad-viewer**：主 Vue 3 组件和前端应用，包括 UI 组件、对话框、工具栏、状态管理以及与渲染引擎的集成。
- **cad-simple-viewer**：文档管理、命令处理以及 UI 与渲染引擎集成的核心逻辑。与框架无关且不含 UI（仅画布）。
- **svg-renderer**：将 DWG/DXF 实体渲染为 SVG 图形，用于导出和可缩放的 2D 输出。
- **three-renderer**：使用 THREE.js 将 DWG/DXF 实体渲染为可交互的 2D/3D 图形，支持高级可视化和自定义着色器。

## 架构总览

**CAD-Viewer** 是一个高性能、纯浏览器的 DWG/DXF 查看器，采用模块化、可扩展的架构，支持加载、解析、渲染多种 CAD 数据格式并与之交互。系统划分为以下核心层次：

![架构总览](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

这种分层架构确保 **CAD-Viewer** 在面对不同的数据规模、渲染需求和部署环境时，依然能够保持高性能、低延迟和强大的可扩展性。

### **模型层**

- 通过 [`realdwg-web`](https://github.com/mlightcad/realdwg-web) 中的 [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) 模块，定义统一的 **数据模型（Data Model）**，用于描述解析后的 CAD 数据（包括几何实体、图层信息、视图参数等）。
- 通过 [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts) 实现统一的 CAD 文件转换接口，使不同的转换器能够将 CAD 数据转换为统一的数据模型。
- 通过 `realdwg-web` 中的 [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) 模块提供 DWG 解析能力，将 DWG 文件转换为统一的数据模型。
- 通过 [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json) 模块提供 DXF 解析能力，将 DXF 文件转换为统一的数据模型。
- 通过 `realdwg-web` 中的 [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) 模块提供几何引擎，支持各种几何计算（点、直线、多段线、样条曲线、圆、圆弧、椭圆、椭圆弧）以及数学运算（向量、矩阵等）。

这里简要说明一下为什么会定义 `AcDbDatabaseConverter` 接口：市面上现有的 DXF/DWG 读写和转换工具往往不够完整。我基于一些开源代码实现了 `@mlightcad/libredwg-converter` 和 `@mlightcad/dxf-json`。不过，目前最好的 DWG/DXF 解析和转换工具实际上是 [ODA](https://www.opendesign.com/products/drawings)。要使用它，必须购买许可证才能访问其源代码，然后可以基于它构建一个将 DXF/DWG 转换为 `@mlightcad/data-model` 中定义的数据模型的 WebAssembly 模块。如果有人碰巧把 ODA 的源代码分享给我，我也可以基于它实现一个转换器。

### **渲染层**

- 通过 `realdwg-web` 中的 [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) 模块定义统一的渲染接口，用于渲染各种类型的 CAD 实体。
- 在 `cad-viewer` 的 [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) 模块中实现该渲染接口，使用 Three.js 渲染所有实体类型。
- 在 `cad-viewer` 的 [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) 模块中实现该渲染接口，将图纸渲染为 SVG。

### **视图层**

- `cad-viewer` 中的 [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) 模块提供 CAD 文件的核心查看逻辑，例如文档管理、命令处理以及 UI 与渲染引擎之间的协调。它不依赖任何 UI 框架，除画布之外不提供任何 UI 元素。
- [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) 模块基于 `@mlightcad/cad-simple-viewer` 构建，提供基于 Vue 3 的 UI，包括菜单、工具栏、命令行、状态栏以及深色和浅色主题。它将所有核心功能打包为一个 Vue 3 组件，便于集成。

## 渲染引擎

渲染 DXF/DWG 文件会面临一些挑战：

- 高性能渲染包含大量实体的图纸。
- 复现 AutoCAD 的文字渲染效果。
- 支持线型和填充图案。

### 高性能渲染

对于大型图纸的高性能渲染，关键在于合并点、线和面以减少 **Draw Call**。THREE.js 通过 [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) 类为合并三角网格提供了部分解决方案。但它不支持合并点和线，甚至其面的合并也无法完全满足我们的需求。因此，我们参考 `BatchedMesh` 实现了若干类，用于合并点、线和面。你可以查看[这里的代码](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch)。

### 文字渲染

AutoCAD 使用 [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) 格式表示富文本，并使用一种特殊的 [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) 字体（一种仅用线条绘制的描边字体）来实现更快的渲染。主要挑战有：

- **解析 MText** – 通过 [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser) 包实现。
- **解析 SHX 字体** – 通过 [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser) 包实现。
- **渲染 MText** – 通过 [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer) 包实现。出于性能考虑，解析后的字体文件会缓存在浏览器的 IndexedDB 中，因此字体文件一旦下载并解析完成，后续渲染会更快。

为了调试文字渲染，我们构建了一个基于 THREE.js 的富文本编辑器 [mtext-editor](https://github.com/mlightcad/mtext-editor)。目前没有其他基于 THREE.js 的开源富文本编辑器，因此它可以复用作任何渲染引擎的文本编辑器。

### 线型和填充图案

AutoCAD 支持自定义线型和填充图案。我们已实现了其中一部分（尚不支持包含文字的线型）。所有线型和填充效果均使用 THREE.js 的 `ShaderMaterial` 实现。你可以查看[这里的代码](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style)。


