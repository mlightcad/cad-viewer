---
title: "Worker URL の設定"
---

# Worker URL の設定

このページでは、**cad-viewer** を使用する際に **Web Worker の URL を正しく設定する方法**、特にモダンな SPA + バンドラー環境（Vite / Webpack / Rollup）での設定方法について説明します。

このトピックは誤解されやすく、次のような問題の根本原因になります：

-   開発環境では動作するが、本番環境で Worker が読み込まれない
-   `xxx-worker.js` の 404 エラー
-   ハッシュルーティング（`#/route`）を使用すると Worker が壊れる
-   相対パスに関する誤った前提

[**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) での議論が、このガイドの背景になっています。

## cad-viewer での Worker URL の使用

cad-viewer では、いくつかの機能（dwg/dxf の解析、mtext のレンダリングなど）が性能のために **Web Worker** に依存しています。

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

AcApDocManager のインスタンスを作成する際に、次のように Worker URL を設定できます：

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

次のように Worker が作成されます：

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ `workUrl` は JS モジュールではなく、ドキュメント（HTML ページ）を基準に解決されます。

## Worker URL オプションの比較

現在のページ URL が `https://localhost/app/` で、メインモジュールが `https://localhost/app/assets/main.js` から読み込まれている場合、workerUrl は次のように解決されます。

| workerUrl の値                       | 解決の基準      | 解決後の URL の例   |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | 現在のページ URL | /app/workers/worker.js |
| './workers/worker.js'                 | 現在のページ URL | /app/workers/worker.js |
| '/workers/worker.js'                  | サイトルート            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | 絶対 URL             | /workers/worker.js     |

## `import.meta.url` の使用を避ける

別の方法として、次のように Worker URL を作成できます：

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url` は**現在のモジュールの URL** を指します。そのため、開発モードと本番モードで奇妙な動作を引き起こす可能性があります。

たとえば、現在のページ URL が `https://localhost` で、メインモジュールが `https://localhost/assets/main.js` から読み込まれている場合、`Vite dev mode` では workerUrl は次のように解決されます。

| workerUrl の値                       | 解決の基準        | 開発モードでの解決結果   | 本番モードでの解決結果     |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | 現在のモジュール URL | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | 現在のモジュール URL | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | サイトルート              | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | 絶対 URL               | /workers/worker.js     | /workers/worker.js        |

開発モードと本番モードで異なるロジックを作成する必要があります。`import.meta.url` の使用は避けてください。

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
