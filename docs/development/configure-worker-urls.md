---
title: "Configure Worker URLs"
---

# Configure Worker URLs

This page explains **how to correctly set Web Worker URLs** when using **cad-viewer**, especially in modern SPA + bundler environments (Vite / Webpack / Rollup).

This topic is frequently misunderstood and is the root cause of issues such as:

-   Worker failing to load in production but working in dev
-   404 errors for `xxx-worker.js`
-   Workers breaking when using hash routing (`#/route`)
-   Incorrect assumptions about relative paths

The discussion in [**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) provides the background for this guide.

## How Worker URLs Are Used In cad-viewer?

In cad-viewer, several features (dwg/dxf parsing, mtext renderering, etc.) rely on **Web Workers** for performance.

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

When creating an instance of AcApDocManager, you can configure worker URLs like this:

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

It will create workers like this:

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ The `workUrl` is resolved relative to the document (HTML page), not relative to JS module.

## Worker URL Options Compared

If the current page url is `https://localhost/app/` and your main module is loaded from `https://localhost/app/assets/main.js`, workerUrl is resolved as follows.

| workerUrl value                       | Resolution base      | Example resolved URL   |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | The current page URL | /app/workers/worker.js |
| './workers/worker.js'                 | The current page URL | /app/workers/worker.js |
| '/workers/worker.js'                  | Site root            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | Absolute             | /workers/worker.js     |

## Avoid Using `import.meta.url`

Another way is to create worker URLs like this:

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url` points to the **current module’s URL**. So it may result in some strange behaviors in dev and prod mode.

For example, if the current page url is `https://localhost` and your main module is loaded from `https://localhost/assets/main.js`, workerUrl is resolved as follows in `Vite dev mode`.

| workerUrl value                       | Resolution base        | Resolved in dev mode   | Resolved in prod mode     |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | The current module URL | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | The current module URL | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | Site root              | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | Absolute               | /workers/worker.js     | /workers/worker.js        |

You have to create different logic in dev and prod mode. Please avoid using `import.meta.url`.

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

