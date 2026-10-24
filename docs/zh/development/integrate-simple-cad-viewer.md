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

集成分为两步：**初始化应用**（创建一次 `AcApDocManager` 单例），然后**打开图纸**。

### 初始化应用

`AcApDocManager` 是 `cad-simple-viewer` 的入口。它是一个单例：启动时调用一次 `AcApDocManager.createInstance(options)`，之后通过 `AcApDocManager.instance` 访问。再次调用 `createInstance` 只会返回已存在的实例，不会应用新的选项。

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

所有选项都是可选的，由 `AcApDocManagerOptions` 接口定义。

#### 画布与布局

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | 新建元素 | 承载画布的 HTML 容器。不传时会新建一个容器元素，需要你自己插入 DOM。 |
| `width` | `number` | 容器宽度 | 画布宽度（像素）。 |
| `height` | `number` | 容器高度 | 画布高度（像素）。 |
| `autoResize` | `boolean` | `false` | 为 `true` 时，画布自动跟随容器尺寸变化（窗口缩放、侧栏收起等）。 |
| `busyIndicatorHost` | `HTMLElement` | `container` | 忙碌遮罩（如导出加载动画）的宿主元素。建议设置为查看器外壳，让遮罩能覆盖功能区、工具栏和状态栏。 |

#### 渲染与字体

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | 控制 MTEXT 实体在哪里渲染。`true`：主线程渲染 — 内存占用更低但首帧更慢。`false`：Web Worker 渲染 — 内存占用更高但图纸显示更快。 |
| `preloadDefaultFonts` | `boolean` | `false` | 为 `true` 时，初始化阶段就预加载默认回退字体链。默认按需在绘制文字时加载字体。 |

#### Worker 与资源

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | 拉取字体、图纸模板等运行时资源的根地址。离线或私有化部署时指向你自己的资源副本。 |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | Worker 脚本地址：`mtextRender`（MTEXT 排版/字形 worker）和 `dwgParser`（可选的 DWG 解析 worker，用于就绪检查）。构建工具相关的坑见[配置 Worker URL](./configure-worker-urls)。 |
| `checkWorkersOnInit` | `boolean` | `false` | 为 `true` 时，初始化后通过 HEAD 请求校验配置的 worker 脚本地址，结果通过 `AcApDocManager.instance.workersReady` 和 `workersReady` 事件暴露。 |

#### UI 与产品开关

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | 为 `false` 时不安装内置 OPEN 命令的文件选择器（适用于自带打开 UI 的场景）。 |
| `disableExport` | `boolean` | `false` | 为 `true` 时不注册图纸导出命令及相关 UI 入口（`cdxf`、`pngout`、`jpgout`、`bmpout` 以及 HTML/PDF/SVG 导出）。这是产品/交互层面的开关，并非版权保护 — 图纸数据仍在内存中。 |
| `docsBaseUrl` | `string` | MLightCAD 文档站 | 应用内帮助链接使用的本地化用户指南页面根地址。 |
| `commandAliases` | `Record<string, string \| string[]>` | 内置别名 | 按命令全局名覆盖命令别名，例如 `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`。未列出的命令保留内置别名。 |

#### 插件与打开默认值

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | 初始化时自动加载插件。`fromConfig` 接受插件实例或工厂函数；`fromFolder` 从目录加载插件文件（`folderPath`、`pluginList`、`continueOnError`）。见[插件系统](./plugin-system)。 |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` 或 `() => AcApOpenDatabaseOptions \| Promise<...>` | – | 通过内置 OPEN 对话框打开文件时使用的默认选项。可以是静态对象，也可以是同步/异步工厂函数。之后可通过 `AcApDocManager.instance.setOpenDocumentDefaults(...)` 更新。 |

#### 注册 DWG 转换器

`cad-simple-viewer` 默认**不注册** DWG 转换器（LibreDWG 采用 GPL 协议）。要打开 DWG 文件，请在打开前注册一个转换器，例如 `@mlightcad/libredwg-converter`：

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### 打开图纸

文档管理器提供两种打开图纸的方式。两者都返回 `Promise<boolean>`，成功打开时解析为 `true`：

```typescript
// 1. 从 URL 打开（由查看器负责拉取文件）
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. 从已有的文件内容打开（例如文件选择框）
const success = await docManager.openDocument(
  'plan.dwg',               // 文件名按扩展名决定 DWG 还是 DXF
  await file.arrayBuffer(), // ArrayBuffer 形式的文件内容
  options
)
```

两种方法接受同一个 `AcApOpenDatabaseOptions` 对象。不传时，管理器默认应用 `drawNoPlotLayers: false` 和 `progressiveRendering: false`。该类型由查看器层选项和 `@mlightcad/data-model` 的基础 `AcDbOpenDatabaseOptions` 组合而成。

#### 查看器选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | 访问模式：`Read`（0，仅查看）、`Review`（4，审阅，兼容 Read）、`Write`（8，完全读写，兼容前两者）。高值模式向下兼容。同时决定默认的 `openViewMode`（见下）。 |
| `progressiveRendering` | `boolean` | `false` | 控制图纸转换过程中是否边转换边绘制。`false`：所有实体转换完成前画布不重绘，打开遮罩会一直保留到延迟的文字/INSERT 字形任务结束。`true`：实体转换在事件循环中分片让出，几何体按批次落地即绘制；解析和转换进度完成后即可平移缩放，剩余几何继续在后台转换。交互查看大文件用 `true`，截图或需要确定性首帧时用 `false`。 |
| `openViewMode` | `AcApOpenViewMode` | Read/Review 为 `Extents`，Write 为 `Saved` | 用户尚未操作过的布局如何取景。`Extents`（`'extents'`）缩放到已转换几何体的范围。`Saved`（`'saved'`）恢复 AutoCAD 保存的视图（模型空间用 VPORT `*ACTIVE`；图纸空间在包含真实视口时用布局界限，否则用视口框）。 |
| `sysVars` | `AcApOpenSysVars` | – | 打开数据库时要覆盖的系统变量。键为系统变量名（不区分大小写），值可以是 `number`、`boolean`、`string` 或 `AcCmColor`。常见示例：`lwdisplay: false` 隐藏线宽，`paperbkcolor` 设置图纸空间背景色。 |
| `convertInvisibleLayers` | `boolean` | `false` | 为 `true` 时，打开过程中即转换关闭/冻结图层上的实体，离线 HTML/PDF 导出不再需要二次转换。交互查看保持 `false`（图层打开时会再转换）。 |
| `convertAllLayouts` | `boolean` | `false` | 为 `true` 时，打开期间/紧随其后注册并转换所有图纸空间布局，导出时无需等待用户逐个访问布局页签。 |
| `skipSpatialIndex` | `boolean` | `false` | 为 `true` 时，实体转换期间跳过层级空间索引的构建。该索引用于交互拾取和智能取景；无头 HTML/JPEG 导出只需要场景批次，可以跳过以节省时间和内存。 |
| `cooperativeYield` | `boolean` | `true` | 为 `false` 时，禁用实体转换过程中的协作式 `setTimeout` 让出，并跳过中途的 WebGL 绘制。无头脚本不需要响应式 UI，禁用让出可以缩短打开耗时。 |

#### 数据库选项（继承自 `@mlightcad/data-model`）

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | 每个处理块的最小实体数。更大的块可减少调度开销，官方示例使用 `1000`。上限为实体总数。 |
| `timeout` | `number` | 转换器默认值 | Web Worker 解析的超时时间（毫秒）。仅在所选转换器使用 worker 解析时生效。 |
| `encoding` | `string` | 自动检测 | 文本编码覆盖，作用于图层名、注释、文字和属性（例如 `'gbk'`、`'euc-kr'`）。不传时，DXF 读取 `$DWGCODEPAGE`，DWG 读取头中的代码页。显式传入优先于自动检测，适合声明代码页缺失或错误的文件。 |
| `drawNoPlotLayers` | `boolean` | `false` | 是否绘制不可打印图层（Defpoints、`*-NPLT` 等）上的实体。`true` = 桌面 AutoCAD 语义（屏幕上可见）；`false` = Web/发布查看器语义（不显示）。`AcApDocManager` 默认设为 `false`。 |
| `circleSides` | `number` | `50`（草稿） | 整圆细分的最大段数。值越小越省显存、HTML 导出越小；值越大越平滑。会被钳制到 DXF VPORT 允许范围。短弧仍使用更少的段数。 |
| `fileName` | `string` | – | 图纸文件名（含扩展名），更新打开数据库的只读 `DWGNAME` 系统变量。 |

#### 已废弃的选项

| 选项 | 状态 |
| --- | --- |
| `waitForTextGeometry` | 已忽略。渐进渲染的两个阶段现在都由 `progressiveRendering` 控制；传入会打印警告。 |
| `fontLoader`、`failOnFontLoadError` | 已移除。字体由文字渲染器在绘制时按需加载；传入会打印警告。 |

#### 示例

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('打开图纸失败')
}
```

如需跟踪打开流程，可以订阅 `AcApDocManager.instance.events` 上的事件：`documentToBeOpened`、`documentCreated`、`documentToBeActivated`、`documentActivated`、`documentToBeDestroyed` 和 `documentDestroyed`。

### 实时修改图纸

`cad-simple-viewer` 虽然不支持将图纸保存为 DWG/DXF 文件，但它为**实时修改图纸**提供了全面支持。你可以在图纸中添加、编辑和删除实体，查看器会自动更新以反映这些更改。

修改实体时，你直接操作底层的图纸数据库。查看器会自动检测这些更改并相应地更新显示。这种实时同步确保了：

- 所有修改都会立即可见
- 命令栈能够正确跟踪更改以支持撤销/重做操作。此功能即将实现。

这一能力使 `cad-simple-viewer` 适用于不仅需要显示 CAD 文件、还需要允许用户交互并修改图纸内容的应用。

**重要说明**：`cad-simple-viewer` 中的用法与 **AutoCAD RealDWG** **非常相似**。如果你熟悉 AutoCAD RealDWG 开发，会发现 API 结构和工作流程几乎完全相同。主要区别在于我们使用 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)，而不是原生 RealDWG 库。

在 [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) 中，演示了如何使用 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) 创建一张图纸。

## 在 MLightCAD 中的角色

该包充当核心逻辑层，连接前端 UI 与渲染引擎，并管理所有与文档相关的操作。

