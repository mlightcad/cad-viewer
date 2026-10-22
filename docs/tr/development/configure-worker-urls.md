---
title: "Worker URL'lerini Yapılandırma"
---

# Worker URL'lerini Yapılandırma

Bu sayfa, özellikle modern SPA + paketleyici ortamlarında (Vite / Webpack / Rollup) **cad-viewer** kullanırken **Web Worker URL'lerinin nasıl doğru şekilde ayarlanacağını** açıklar.

Bu konu sıklıkla yanlış anlaşılır ve aşağıdaki gibi sorunların temel nedenidir:

-   Worker'ın geliştirme ortamında çalışıp üretim ortamında yüklenememesi
-   `xxx-worker.js` için 404 hataları
-   Hash yönlendirme (`#/route`) kullanıldığında Worker'ların bozulması
-   Göreli yollarla ilgili yanlış varsayımlar

[**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) tartışması bu kılavuzun arka planını sağlar.

## Worker URL'leri cad-viewer'da Nasıl Kullanılır?

cad-viewer'da birkaç özellik (dwg/dxf ayrıştırma, mtext işleme vb.) performans için **Web Workers** kullanır.

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

AcApDocManager örneği oluştururken worker URL'lerini şu şekilde yapılandırabilirsiniz:

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

Worker'ları şu şekilde oluşturur:

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ `workUrl`, JS modülüne göre değil belgeye (HTML sayfasına) göre çözümlenir.

## Worker URL Seçeneklerinin Karşılaştırılması

Geçerli sayfa URL'si `https://localhost/app/` ve ana modülünüz `https://localhost/app/assets/main.js` adresinden yükleniyorsa, workerUrl şu şekilde çözümlenir.

| workerUrl değeri                      | Çözümleme temeli     | Örnek çözümlenmiş URL  |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | Geçerli sayfa URL'si | /app/workers/worker.js |
| './workers/worker.js'                 | Geçerli sayfa URL'si | /app/workers/worker.js |
| '/workers/worker.js'                  | Site kökü            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | Mutlak               | /workers/worker.js     |

## `import.meta.url` Kullanmaktan Kaçının

Başka bir yol da worker URL'lerini şu şekilde oluşturmaktır:

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url` **geçerli modülün URL'sine** işaret eder. Bu nedenle geliştirme ve üretim modunda bazı tuhaf davranışlara yol açabilir.

Örneğin, geçerli sayfa URL'si `https://localhost` ve ana modülünüz `https://localhost/assets/main.js` adresinden yükleniyorsa, `Vite dev mode` içinde workerUrl şu şekilde çözümlenir.

| workerUrl değeri                      | Çözümleme temeli        | Geliştirme modunda çözümlenir | Üretim modunda çözümlenir  |
| ------------------------------------- | ----------------------- | ----------------------------- | -------------------------- |
| 'workers/worker.js'                   | Geçerli modül URL'si    | /src/workers/worker.js        | /assets/workers/worker.js  |
| './workers/worker.js'                 | Geçerli modül URL'si    | /src/workers/worker.js        | /assets/workers/worker.js  |
| '/workers/worker.js'                  | Site kökü               | /@fs/workers/worker.js        | /workers/worker.js         |
| 'https://localhost/workers/worker.js' | Mutlak                  | /workers/worker.js            | /workers/worker.js         |

Geliştirme ve üretim modunda farklı mantık oluşturmanız gerekir. Lütfen `import.meta.url` kullanmaktan kaçının.

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
