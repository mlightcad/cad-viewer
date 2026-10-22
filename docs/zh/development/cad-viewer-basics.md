---
title: "CAD Viewer 基础"
---

# CAD Viewer 基础

本项目为用户提供了两个查看器：`cad-viewer` 和 `cad-simple-viewer`。选择哪个查看器取决于你的项目需求和期望的集成程度：

## 在以下情况使用 **cad-viewer**：

- 你想要一个**开箱即用的 Vue 3 组件**，自带现代 UI、对话框、工具栏和状态管理。
- 你需要以最少的配置，快速将高性能的 CAD 查看器/编辑器嵌入到 Vue 应用中。
- 你倾向于选择开箱即用地处理文件加载、渲染、图层/实体管理和用户交互的解决方案。
- 你希望与经过优化的 SVG 和 THREE.js 渲染器、国际化以及主题无缝集成。
- 你**不**想从零开始构建自己的 UI。

**推荐用于：** 大多数需要以精致用户界面显示 CAD 文件的 Web 应用、仪表盘或平台。

## 在以下情况使用 **cad-simple-viewer**：

- 你只需要**核心 CAD 逻辑**（文档管理、命令栈、渲染引擎集成），不依赖任何 UI 框架。
- 你想构建**自己的自定义 UI**，或将 CAD 功能集成到非 Vue 或非 Web 环境中。
- 处理大型 CAD 文件时需要最大的灵活性和性能，并计划将该逻辑接入自己的渲染或 UI 层。
- 你想要一个与框架无关、仅提供必要 CAD 操作和画布渲染的解决方案。

**推荐用于：** 自定义集成、无头 CAD 处理，或构建高度定制化 CAD 解决方案的高级用户。

**汇总表：**

| 包                  | 提供 UI | 框架  | 使用场景                                  |
|---------------------|-------------|-----------|-----------------------------------------------|
| `cad-viewer`        | 是         | Vue 3     | 带现代 UI 的开箱即用 CAD 查看器/编辑器       |
| `cad-simple-viewer` | 否          | 无      | 用于自定义或无头场景的核心 CAD 逻辑      |

更多详情，请参阅[**集成 Simple CAD Viewer**](./integrate-simple-cad-viewer) 和[**集成 CAD Viewer 组件**](./integrate-cad-viewer-component)。

## 示例

- [`cad-simple-viewer-example`](https://github.com/mlightcad/cad-simple-viewer-example)：演示如何在真实项目中使用 `cad-simple-viewer` 组件的示例应用。
- [`cad-viewer-example`](https://github.com/mlightcad/cad-viewer-example)：演示如何在真实项目中使用 `cad-viewer` 组件的示例应用。

