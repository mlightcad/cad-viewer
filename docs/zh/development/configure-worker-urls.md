---
title: "配置 Worker URL"
---

# 配置 Worker URL

本页说明在使用 **cad-viewer** 时，**如何正确设置 Web Worker URL**，特别是在现代 SPA + 打包器环境（Vite / Webpack / Rollup）中。

这个话题经常被误解，并且是以下问题的根本原因：

-   Worker 在生产环境中加载失败，但在开发环境中正常
-   `xxx-worker.js` 出现 404 错误
-   使用 hash 路由（`#/route`）时 Worker 失效
-   对相对路径的错误假设

[**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) 中的讨论为本指南提供了背景。

## cad-viewer 如何使用 Worker URL？

在 cad-viewer 中，若干功能（dwg/dxf 解析、mtext 渲染等）依赖 **Web Worker** 来提升性能。

```ts
/**
 * Defines URLs for Web Worker JavaScript bundles used by the CAD viewer.
 *
 * Each entry points to a standalone worker script responsible for
 * off-main-thread processing such as file parsing or text rendering.
 */
export interface AcApWebworkerFiles {
  /**
   * URL of the Web Worker bundle responsible for parsing DXF files.
   *
   * This worker performs DXF decoding and entity extraction in a
   * background thread to avoid blocking the UI.
   */
  dxfParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for parsing DWG files.
   *
   * DWG parsing is computationally expensive and must be executed
   * in a Web Worker to maintain UI responsiveness.
   */
  dwgParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for rendering MTEXT entities.
   *
   * This worker handles MTEXT layout, formatting, and glyph processing
   * independently from the main rendering thread.
   */
  mtextRender?: string | URL
}
```

创建 AcApDocManager 实例时，你可以这样配置 worker URL：

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

它会像这样创建 Worker：

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ `workUrl` 是相对于文档（HTML 页面）解析的，而不是相对于 JS 模块。

## Worker URL 选项对比

如果当前页面 URL 是 `https://localhost/app/`，而你的主模块从 `https://localhost/app/assets/main.js` 加载，那么 workerUrl 的解析结果如下。

| workerUrl 值                       | 解析基准      | 解析后 URL 示例   |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | 当前页面 URL | /app/workers/worker.js |
| './workers/worker.js'                 | 当前页面 URL | /app/workers/worker.js |
| '/workers/worker.js'                  | 站点根目录            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | 绝对路径             | /workers/worker.js     |

## 避免使用 `import.meta.url`

另一种方式是像这样创建 worker URL：

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url` 指向**当前模块的 URL**。因此它在开发模式和生产模式下可能会导致一些奇怪的行为。

例如，如果当前页面 URL 是 `https://localhost`，而你的主模块从 `https://localhost/assets/main.js` 加载，那么在 `Vite 开发模式`下 workerUrl 的解析结果如下。

| workerUrl 值                       | 解析基准        | 开发模式下的解析结果   | 生产模式下的解析结果     |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | 当前模块 URL | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | 当前模块 URL | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | 站点根目录              | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | 绝对路径             | /workers/worker.js     | /workers/worker.js        |

你必须在开发模式和生产模式下编写不同的逻辑。请避免使用 `import.meta.url`。

```ts
const isDev =
  typeof window !== 'undefined' &&
  !!window.location &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
if (isDev) {
  ...
} else {
  ...
}
```

