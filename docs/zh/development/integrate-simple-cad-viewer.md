---
title: "集成 Simple Viewer"
---

# 集成 Simple Viewer

**cad-simple-viewer** 提供 CAD 查看器的**高性能**核心组件，例如文档管理、命令处理以及 UI 与渲染引擎之间的协作。它在处理大型 CAD 文件时经过性能优化设计。

该模块不依赖任何 UI 框架，除画布之外不提供任何 UI。如果你希望把高性能 CAD 查看器集成到带有自定义 UI 的 Web 应用中，那么这个模块就是正确的选择。

## 主要特性
- 针对大文件优化的文档管理
- 高效的命令栈和撤销/重做操作
- 与渲染引擎优化的集成
- 以性能为中心的设置和上下文管理
- 与框架无关的设计，提供最大灵活性

## 何时应该选择 cad-simple-viewer？

如果你只需要**核心 CAD 逻辑**（文档管理、命令栈、渲染引擎集成），不依赖任何 UI 框架，请使用 `cad-simple-viewer`。以下情况该包非常理想：

- 你想构建**自己的自定义 UI**，或将 CAD 功能集成到非 Vue 或非 Web 环境中。
- 处理大型 CAD 文件时需要最大的灵活性和性能，并计划将该逻辑接入自己的渲染或 UI 层。
- 你想要一个与框架无关、仅提供必要 CAD 操作和画布渲染的解决方案。

**推荐用于：** 自定义集成、无头 CAD 处理，或构建高度定制化 CAD 解决方案的高级用户。

## 安装

```bash
npm install @mlightcad/cad-simple-viewer
```

## 使用

关于基本用法和高级用法，请参阅 [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example)。

`cad-simple-viewer` 虽然不支持将图纸保存为 DWG/DXF 文件，但它为**实时修改图纸**提供了全面支持。你可以在图纸中添加、编辑和删除实体，查看器会自动更新以反映这些更改。

修改实体时，你直接操作底层的图纸数据库。查看器会自动检测这些更改并相应地更新显示。这种实时同步确保了：

- 所有修改都会立即可见
- 命令栈能够正确跟踪更改以支持撤销/重做操作。此功能即将实现。

这一能力使 `cad-simple-viewer` 适用于不仅需要显示 CAD 文件、还需要允许用户交互并修改图纸内容的应用。

**重要说明**：`cad-simple-viewer` 中的用法与 **AutoCAD RealDWG** **非常相似**。如果你熟悉 AutoCAD RealDWG 开发，会发现 API 结构和工作流程几乎完全相同。主要区别在于我们使用 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)，而不是原生 RealDWG 库。

在 [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) 中，演示了如何使用 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) 创建一张图纸。

## 可用导出

### 核心类

- `AcApContext` - 主应用上下文
- `AcApDocManager` - 文档管理
- `AcApDocument` - 单个文档处理
- `AcApSettingManager` - 设置管理

### 命令

- `AcApOpenCmd` - 打开文件命令
- `AcApZoomCmd` - 缩放命令
- `AcApPanCmd` - 平移命令
- `AcApSelectCmd` - 选择命令
- `AcApConvertToSvgCmd` - SVG 转换命令

### 编辑器组件

- `AcEditor` - 主编辑器类
- `AcEdCommandStack` - 命令栈管理
- `AcEdSelectionSet` - 选择集处理
- `AcEdInputPoint` - 输入点管理

### 视图组件

- `AcTrScene` - 场景管理
- `AcTrLayoutView` - 布局视图处理
- `AcTrView2d` - 2D 视图管理

## 在 MLightCAD 中的角色

该包充当核心逻辑层，连接前端 UI 与渲染引擎，并管理所有与文档相关的操作。

