---
title: "文件打开面板（落地页 UI）"
---

# 文件打开面板（落地页 UI）

本文说明如何构建**落地页文件选择器**，并通过 **`/file-open-panel`** 子路径把 **`@mlightcad/cad-simple-viewer`** 排除在首屏关键路径之外。

**DocManager 宿主请优先使用 [`acuiCreateFileOpenSession`](#quick-start-recommended)** — 它会挂载落地 UI、延迟创建查看器、附加云端源并打开图纸。当你自行驱动打开流程时使用 [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open)（例如 Vue `MlCadViewer` props）。仅在需要自定义菜单接线时使用底层 [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel)。

若要实现云端来源（OneDrive、Google Drive、自定义源），请参阅[数据源插件](./data-source-plugin)。

---

## 为什么要单独入口？

从 **主包** `@mlightcad/cad-simple-viewer` 导入文件打开 UI 时，过去会把 `AcApDocManager`、three.js 以及命令/视图栈一并打进首页 / 上传屏首屏。

从 **1.8.0** 起，请改用无 DocManager 依赖的子路径：

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

session 仅在用户打开内容时调用你的 `createDocManager` — 通常通过动态 import 主包实现。

参考应用：

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + 延迟 `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## 快速开始（推荐） {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// 可选云端源（动态 import 使 SDK 不进入首屏）：
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

每次打开时 session 会：

1. **一次**调用 `createDocManager`（之后缓存）
2. `attachSourcesTo(docManager.dataSourceManager)`，以便复用 MSAL / GIS 客户端
3. 执行 `openDocument` / `openUrl` / `newDocument`

可选钩子：`onBeforeOpen`、`onPrepareOpen`（DocManager 就绪后）、`onAfterOpen`。

销毁落地屏时调用 `session.dispose()`。编程式打开：`session.open({ kind: 'file' | 'url' | 'new', … })`。

---

## Session 选项

| 选项 | 说明 |
|--------|-------------|
| `host` | 接收面板根节点的元素 |
| `createDocManager` | 返回类 DocManager 对象（`dataSourceManager` + 打开 API） |
| `getOpenOptions?` | 透传给 openDocument / openUrl / newDocument |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | 生命周期钩子 |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | 与 landing 门面相同的 chrome 选项 |

常用 API：`landing`、`manager`、`registerSource()`、`open()`、`ensureDocManager()`、`dispose()`。

---

## `AcUiFileOpenLanding`（自定义打开） {#acuifileopenlanding-custom-open}

当宿主自行打开图纸时（Vue store + `MlCadViewer`、自定义进度 UI 等）：

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // 你的代码
  }
})

// DocManager / 查看器存在之后：
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// 或：acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`：`{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`。

---

## 面板 UI 做什么

session 与 landing 都会挂载 `AcUiFileOpenPanel`：

| 区域 | 行为 |
|------|------|
| 卡片主体 | 本地拖放区、URL 行，或云端「选择文件」/ 账号 chrome |
| 底部箭头 | **本地**、**URL**，以及已注册的云端源 |
| 可选 | **新建图纸** 按钮 |

面板**从不**直接访问 `AcApDocManager`。

---

## 懒加载说明

1. Landing / session 代码仅 import `@mlightcad/cad-simple-viewer/file-open-panel`。
2. `createDocManager`（或你的 `onOpen` 处理器）动态 import 主包。
3. 在 `createInstance` 之后注册导出插件 / OneDrive `/register`；云端插件可复用已从 landing 注册表 attach 的 source。

若落地页不挂载编辑器却需要 Vue i18n，优先使用 `@mlightcad/cad-editor/locale`。

---

## 底层 `AcUiFileOpenPanel` {#low-level-acuifileopenpanel}

需要自定义 `onDataSourceAction` / `onResult` 接线的高级宿主仍可直接使用 `AcUiFileOpenPanel`。新集成请优先 session 或 landing 门面。

---

## 检查清单

- [ ] 落地页从 `/file-open-panel` 导入，而非主包
- [ ] DocManager 宿主优先 `acuiCreateFileOpenSession`
- [ ] 自定义打开宿主使用 `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] 云端插件包采用动态 import
- [ ] 登录与选取保持为独立用户手势

---

## 相关文档

- [数据源插件](./data-source-plugin) — `AcApDataSource`、菜单辅助、编写云端插件
- [集成 Simple Viewer](./integrate-simple-cad-viewer) — 落地页之后的 `AcApDocManager`
- [集成 Vue 组件](./integrate-cad-viewer-component) — `MlCadViewer`
- [内置插件](./built-in-plugins) — OneDrive / Google Drive 包
- [本地化](./localization) — `main.dataSource.*` 字符串
- [升级指南](./upgrade-guide) — 1.8.0 中的 `/file-open-panel` 与 `/locale` 子路径
