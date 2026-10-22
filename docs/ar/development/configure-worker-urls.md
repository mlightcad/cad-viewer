---
title: "تهيئة عناوين Worker"
---

# تهيئة عناوين Worker

تشرح هذه الصفحة **كيفية ضبط عناوين Web Worker بشكل صحيح** عند استخدام **cad-viewer**، لا سيما في بيئات تطبيقات الصفحة الواحدة (SPA) مع أدوات التجميع الحديثة (Vite / Webpack / Rollup).

كثيرًا ما يُساء فهم هذا الموضوع، وهو السبب الجذري لمشكلات مثل:

-   فشل تحميل Worker في بيئة الإنتاج بينما يعمل في بيئة التطوير
-   أخطاء 404 للملف `xxx-worker.js`
-   تعطّل Workers عند استخدام التوجيه بالتجزئة (`#/route`)
-   افتراضات خاطئة حول المسارات النسبية

يوفر النقاش في [**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) خلفية هذا الدليل.

## كيف تُستخدم عناوين Worker في cad-viewer؟

في cad-viewer، تعتمد عدة ميزات (تحليل dwg/dxf، عرض mtext، وغيرها) على **Web Workers** لأجل الأداء.

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

عند إنشاء نسخة من AcApDocManager، يمكنك تهيئة عناوين Worker على النحو التالي:

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

سيُنشئ Workers على النحو التالي:

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ يُحلّ `workUrl` نسبةً إلى المستند (صفحة HTML)، وليس نسبةً إلى وحدة JS.

## مقارنة خيارات عنوان Worker

إذا كان عنوان الصفحة الحالية هو `https://localhost/app/` وكانت وحدتك الرئيسية تُحمَّل من `https://localhost/app/assets/main.js`، يُحلّ workerUrl على النحو التالي.

| قيمة workerUrl                       | أساس الحل      | مثال على العنوان المحلول   |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | عنوان الصفحة الحالية | /app/workers/worker.js |
| './workers/worker.js'                 | عنوان الصفحة الحالية | /app/workers/worker.js |
| '/workers/worker.js'                  | جذر الموقع            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | مطلق             | /workers/worker.js     |

## تجنّب استخدام `import.meta.url`

هناك طريقة أخرى لإنشاء عناوين Worker على النحو التالي:

```
new URL('./xxx-worker.js', import.meta.url)
```

يشير `import.meta.url` إلى **عنوان الوحدة الحالية**. لذلك قد يؤدي إلى سلوكيات غريبة في وضعي التطوير والإنتاج.

على سبيل المثال، إذا كان عنوان الصفحة الحالية هو `https://localhost` وكانت وحدتك الرئيسية تُحمَّل من `https://localhost/assets/main.js`، يُحلّ workerUrl على النحو التالي في `Vite dev mode`.

| قيمة workerUrl                       | أساس الحل        | يُحلّ في وضع التطوير   | يُحلّ في وضع الإنتاج     |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | عنوان الوحدة الحالية | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | عنوان الوحدة الحالية | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | جذر الموقع              | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | مطلق               | /workers/worker.js     | /workers/worker.js        |

عليك إنشاء منطق مختلف في وضعي التطوير والإنتاج. يرجى تجنّب استخدام `import.meta.url`.

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
