---
title: "升级 cad-simple-viewer 和 cad-viewer"
---

# 升级 cad-simple-viewer 和 cad-viewer

本指南介绍如何安全地升级 `@mlightcad/cad-simple-viewer` 和 `@mlightcad/cad-viewer`——为什么它们不能单独升级、哪些相关包必须一起迁移，以及两种可靠的方法来确定任意给定版本的正确兼容版本集。

## 概览

`@mlightcad/cad-simple-viewer` 和 `@mlightcad/cad-viewer` **不是独立的包**。它们属于一个紧密集成的生态系统，共享同一代码库和发布周期。每个版本都会捆绑一组协调一致的更新，涵盖插件、渲染器、data-model 包、文本渲染库以及第三方 UI 框架。

**仅单独升级 `cad-simple-viewer` 或 `cad-viewer` 可能导致难以察觉的运行时故障**，包括：

- 插件接口期望的 API 签名在新版（或旧版）核心中已经改变
- 核心期望的数据模型结构与旧版解析器/渲染器产出的结构不匹配
- 升级 libredwg-converter 后缺少 WebAssembly 或 worker 兼容性
- `mtext-renderer` / `mtext-parser` 版本漂移导致文本渲染异常
- Three.js 的破坏性变更或行为变更未在渲染器层同步对齐

始终**将整组相关包一起升级**。下面介绍两种确定正确版本的可靠方法。

---

## 生态系统一览

升级前，了解哪些包属于协同发布、哪些属于第三方会有所帮助。以下类别与同一个 cad-viewer 版本保持同步：

### 核心查看器包

| 包 | 作用 |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | 与框架无关的核心（文档管理、命令栈、渲染粘合层） |
| `@mlightcad/cad-viewer` | 构建在 cad-simple-viewer 之上的 Vue 3 + Element Plus UI 封装 |

### 插件——**必须与 cad-simple-viewer 版本完全一致**

| 包 | 用途 |
| --- | --- |
| `@mlightcad/cad-html-plugin` | 一键导出自包含 HTML |
| `@mlightcad/cad-pdf-plugin` | PDF 导出和 PDF 底图导入 |
| `@mlightcad/cad-svg-plugin` | SVG 导出 |
| `@mlightcad/cad-simple-ui-plugin` | 纯 DOM 工具栏、图层管理器、停靠面板 |
| `@mlightcad/cad-agent-plugin` | AI 智能体驱动的交互 |
| `@mlightcad/cad-onedrive-plugin` | OneDrive 集成 |
| `@mlightcad/cad-google-drive-plugin` | Google Drive 集成 |

> **经验法则：** 上面列表中的每个插件都应固定为与你正在升级到的 `cad-simple-viewer` **完全相同的版本号**（例如 `1.7.5`）。

### 内部渲染器层（与核心同版本，单独发布）

| 包 | 用途 |
| --- | --- |
| `@mlightcad/three-renderer` | 基于 THREE.js 的 2D/3D 渲染引擎 |
| `@mlightcad/pdf-renderer` | cad-pdf-plugin 用于生成 PDF 内容的后端 |

这些包由插件和 cad-simple-viewer 在内部使用。你通常**不会**直接安装它们，但它们的版本必须与你安装的插件兼容。

### 底层数据与文本层——**必须匹配发布版本中的版本**

| 包 | 说明 |
| --- | --- |
| `@mlightcad/data-model` | 核心实体/数据库类型；每个版本都会随查看器一起升级 |
| `@mlightcad/libredwg-converter` | DWG 解析的 WebAssembly 封装——DWG 支持依赖它 |
| `@mlightcad/mtext-parser` | MTEXT 内容解析器 |
| `@mlightcad/mtext-renderer` | MTEXT → THREE 几何渲染器 |
| `@mlightcad/mtext-input-box` | 画布内 MTEXT 编辑器控件 |

### 仅 cad-viewer 使用的 Vue UI 依赖

这些出现在 `pnpm-workspace.yaml` 的 overrides 中，但仅在使用 `@mlightcad/cad-viewer`（完整的 Vue 3 UI）时需要。cad-simple-viewer 的集成不会直接安装它们。

| 包 | 用途 |
| --- | --- |
| `@mlightcad/ribbon` | Ribbon UI 组件 |
| `@mlightcad/ui-components` | 共享 Vue UI 基础组件 |

### 第三方 peer 依赖（保持发布版本中固定的版本）

| 包 |
| --- |
| `three` |
| `vue`（仅 cad-viewer 使用） |
| `element-plus`（仅 cad-viewer 使用） |
| `vue-i18n`（仅 cad-viewer 使用） |
| `lodash-es` |

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

4. 将你使用的每个 `@mlightcad/cad-*-plugin` 更新为与 `cad-simple-viewer` / `cad-viewer` **相同的版本**：

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
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
