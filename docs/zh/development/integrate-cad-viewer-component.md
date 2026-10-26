---
title: "集成 Vue 组件"
---

# 集成 Vue 组件

**cad-viewer** 是一个**高性能**的 Vue 3 组件，用于**完全在浏览器中查看和编辑 CAD 文件（DXF、DWG），无需任何后端服务器**。它提供现代用户界面、状态管理，并与经过优化的渲染引擎无缝集成，从而在浏览器中实现流畅、性能卓越的 CAD 工作流程。

## 主要特性

- **高性能**的 CAD 编辑和查看，渲染帧率流畅，可达 60+ FPS
- **无需后端** - 文件完全在浏览器中解析和处理
- **增强的数据安全性** - 文件永远不会离开你的设备，确保完全的隐私
- **本地文件支持** - 通过文件对话框或拖放直接从你的电脑加载 DWG/DXF 文件
- **远程文件支持** - 自动从 URL 加载 CAD 文件
- **易于集成** - 第三方集成无需服务器搭建或后端基础设施
- **可自定义 UI** - 控制工具栏、命令行、坐标和性能统计的可见性
- **可自定义资源** - 为字体、模板和示例文件设置自定义基础 URL
- 针对大型 CAD 文件处理优化的现代 UI
- 图层、实体和设置的状态管理
- 与经过优化的 SVG 和 THREE.js 渲染器集成
- 对话框、工具栏和命令行界面
- 用于在你自己的应用中嵌入高性能 CAD 查看器的 Vue 3 组件

## 何时应该选择 cad-viewer？

如果你想要一个**开箱即用的 Vue 3 组件**，自带现代 UI、对话框、工具栏和状态管理，用于查看和编辑 CAD 文件，请使用 `cad-viewer`。以下情况该包非常理想：

- 你需要以最少的配置，快速将高性能的 CAD 查看器/编辑器嵌入到 Vue 应用中。
- 你需要同时支持本地文件加载（来自用户电脑）和远程文件加载（来自 URL）。
- 你需要一个开箱即用地处理文件加载、渲染、图层/实体管理和用户交互的解决方案。
- 你希望与经过优化的 SVG 和 THREE.js 渲染器、国际化以及主题无缝集成。
- 你**不**想从零开始构建自己的 UI。

**推荐用于：** 大多数需要以精致用户界面显示 CAD 文件的 Web 应用、仪表盘或平台。

## 纯浏览器架构

该 Vue 3 组件完全运行在浏览器中，**不依赖任何后端**。DWG/DXF 文件使用 WebAssembly 和 JavaScript 在本地解析和处理，提供：

- **零服务器要求** - 只需静态文件托管即可将组件部署到任意环境
- **完整的数据隐私** - 无论从本地还是从 URL 加载，CAD 文件永远不会离开用户的设备
- **本地文件支持** - 用户可以使用内置文件对话框直接从电脑加载文件
- **远程文件支持** - 提供 URL 时自动加载文件
- **即时集成** - 无需复杂的后端搭建或 API 配置
- **离线能力** - 加载完成后，在没有网络连接的情况下也能工作
- **对第三方友好** - 可轻松嵌入任何 Vue 3 应用，无需担心服务端问题

## 文件加载方式

MlCadViewer 组件支持多种加载 CAD 文件的方式：

### 1. 本地文件加载
用户可以直接从电脑加载文件：
- **文件对话框**：点击主菜单（☰）并选择 "Open"，浏览并选择本地 DWG/DXF 文件
- **拖放**：直接将 CAD 文件拖放到查看器上（若你的应用实现了该功能）
- **文件输入**：使用内置的文件读取组件以编程方式选择文件
- **组件 Prop**：将 `File` 对象直接传给 `localFile` prop 即可自动加载

#### 示例：通过文件输入配合 localFile prop
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. 远程文件加载
自动从 URL 加载文件：
- **URL Prop**：提供 `url` prop，组件挂载时自动加载文件
- **动态加载**：更改 `url` prop 即可加载不同的文件，而无需重新挂载组件

### 3. 支持的文件格式
- **DWG 文件**：二进制 AutoCAD 图纸格式（以 ArrayBuffer 读取）
- **DXF 文件**：ASCII/二进制 AutoCAD 图纸交换格式（以文本读取）

## 安装

```bash
npm install @mlightcad/cad-viewer
```

## 使用

请参考子包 `cad-editor-demo` 作为示例。

### 基本用法

首先，在 package.json 中添加以下依赖。

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

然后按如下方式创建 Vue 组件。

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer 组件

`MlCadViewer` 是主 Vue 3 组件，提供完整的 CAD 查看和编辑界面。它包含工具栏、图层管理、命令行、状态栏以及各种对话框，带来功能齐全的 CAD 体验。

### 组件属性（Props）

`MlCadViewer` 组件接受以下 props：

| 属性            | 类型                        | 默认值     | 描述                                                                                                                                              |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | UI 语言。`'default'` 使用浏览器的区域设置。同时影响查看器 UI 和 Element Plus 组件。                                              |
| `url`               | `string`                    | `undefined` | CAD 文件（DWG/DXF）的远程 URL。如果提供，组件挂载时会自动获取并打开该文件。更新该 prop 会动态重新加载文件。 |
| `localFile`         | `File`                      | `undefined` | 作为 `File` 对象的本地 CAD 文件。组件挂载时自动打开，并在变化时重新加载。若同时提供，**优先于 `url`**。        |
| `background`        | `number`                    | `undefined` | CAD 视图的背景颜色，为 24 位十六进制 RGB 值（例如 `0x000000`）。变化时会动态更新。                                  |
| `baseUrl`           | `string`                    | `undefined` | 用于加载字体、模板和示例文件等外部资源的基础 URL。在 CDN 上托管资源时非常有用。                               |
| `useMainThreadDraw` | `boolean`                   | `false`     | 控制渲染模式。`false` 使用 Web Worker（推荐用于大型图纸）。`true` 强制在主线程上渲染。                          |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | 查看器的初始主题。可以动态更新，以在深色和浅色模式之间切换。      

### 组件事件

`MlCadViewer` 会触发生命周期事件，以便父组件接入查看器的创建和销毁过程。

| 事件     | 载荷 | 描述                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | 在 CAD 查看器完全初始化并可使用后触发。          |
| `destroy` | `void`  | 在 CAD 查看器被销毁并释放内部资源之前触发。 |

### UI 设置

`MlCadViewer` 从全局 `AcApSettingManager`（由 `@mlightcad/cad-simple-viewer` 提供）读取其 UI 可见性。在渲染查看器之前的任意位置配置这些标志即可自定义 UI。

| 设置                  | 类型      | 默认值 | 描述                                                                |
| ------------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`  | 控制主工具栏的可见性                                |
| `isShowMainMenu`         | `boolean` | `true`  | 控制主菜单的可见性                                   |
| `isShowCommandLine`      | `boolean` | `true`  | 控制命令行界面的可见性                      |
| `isShowCoordinate`       | `boolean` | `true`  | 控制坐标显示的可见性                          |
| `isShowEntityInfo`       | `boolean` | `true`  | 控制实体信息卡片的可见性                     |
| `isShowFileName`         | `boolean` | `true`  | 控制是否显示当前打开的文件名               |
| `isShowLanguageSelector` | `boolean` | `true`  | 控制语言选择器的可见性                           |
| `isShowStats`            | `boolean` | `false` | 控制性能统计（FPS、渲染耗时等）的可见性

#### 示例（推荐）
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### 说明

- 设置是全局的，`MlCadViewer` 会立即反映这些设置。
- 你可以在运行时使用同一个 `AcApSettingManager.instance` 引用更改它们。

### 基础 URL 配置

`baseUrl` 属性允许你自定义 CAD 查看器加载字体、模板和示例文件的位置。这在以下场景中特别有用：

- **自托管资源**：在 CDN 或服务器上托管自己的字体和模板
- **企业环境**：使用内部服务器提供 CAD 资源
- **离线部署**：从本地文件系统提供资源
- **自定义品牌**：使用自己的模板和字体

#### 默认行为
如果未提供 `baseUrl`，查看器使用默认 URL：`https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

#### 资源结构
使用自定义 `baseUrl` 时，请确保你的服务器具有以下结构：
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### 示例：自定义基础 URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

此配置将：
- 从 `https://my-company.com/cad-resources/fonts/` 加载字体
- 从 `https://my-company.com/cad-resources/templates/` 加载模板
- 为任何 "Quick New" 操作使用自定义基础 URL

### 组件功能

`MlCadViewer` 组件包括：

- **主菜单** - 文件操作（包括打开本地文件）、视图控制和设置
- **工具栏** - 绘图工具、缩放控制和选择工具
- **图层管理器** - 图层可见性和属性管理
- **命令行** - AutoCAD 风格的命令输入
- **状态栏** - 当前位置、缩放级别和系统状态
- **对话框管理器** - 用于各种操作的模态对话框
- **文件读取器** - 通过文件对话框加载本地文件，并支持拖放
- **实体信息** - 所选实体的详细信息
- **语言选择器** - UI 语言切换
- **主题支持** - 深色/浅色模式切换

### 事件处理

组件会自动处理各种事件：

- **文件加载** - 支持本地文件加载（通过文件对话框）、拖放以及基于 URL 的文件加载
- **错误消息** - 对失败的操作显示用户友好的错误消息
- **字体加载** - 通过适当的通知处理缺失字体
- **系统消息** - 显示状态更新和操作反馈

### 高级用法

关于以下高级用法，请参阅[集成 Vue 组件](./)。

- 注册 DWG 转换器以显示 DWG 格式的图纸
- 定义自己的字体加载器，从你的服务器加载字体
- 创建图纸或修改图纸

## 可用导出

### 主组件

- `MlCADViewer` - 主 CAD 查看器组件

### 命令

- `AcApLayerStateCmd` - 图层状态命令
- `AcApLogCmd` - 日志命令
- `AcApMissedDataCmd` - 缺失数据命令
- `AcApPointStyleCmd` - 点样式命令

### 组件

- `MlPointStyleDlg` - 点样式对话框
- `MlReplacementDlg` - 替换对话框
- 各种布局和 UI 组件

### 组合式函数

- `useCommands` - 命令管理
- `useCurrentPos` - 当前位置跟踪
- `useDark` - 深色模式支持
- `useDialogManager` - 对话框管理
- `useFileTypes` - 文件类型工具
- `useLayers` - 图层管理
- `useLayouts` - 布局管理
- `useMissedData` - 缺失数据处理
- `useSettings` - 设置管理
- `useSystemVars` - 系统变量

### 语言包

- `i18n` - 国际化实例
- 英文和中文语言文件

### 样式

- 用于样式的 CSS 和 SCSS 文件
- 深色模式支持
- Element Plus 集成

