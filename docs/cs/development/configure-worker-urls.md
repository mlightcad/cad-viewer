---
title: "Konfigurace adres URL Worker"
---

# Konfigurace adres URL Worker

Tato stránka vysvětluje, **jak správně nastavit adresy URL Web Worker** při používání **cad-viewer**, zejména v prostředích moderních SPA + bundlerů (Vite / Webpack / Rollup).

Toto téma je často nepochopeno a je hlavní příčinou problémů, jako jsou:

-   Worker se v produkci nenačte, ale ve vývoji funguje
-   chyby 404 pro `xxx-worker.js`
-   Workery přestanou fungovat při použití hash routingu (`#/route`)
-   nesprávné předpoklady o relativních cestách

Diskuse v [**Issue #54**](https://github.com/mlightcad/cad-viewer/issues/54) poskytuje kontext pro tuto příručku.

## Jak se adresy URL Worker používají v cad-viewer?

V cad-viewer několik funkcí (parsování dwg/dxf, vykreslování mtext atd.) využívá **Web Workers** kvůli výkonu.

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

Při vytváření instance AcApDocManager můžete adresy URL Worker nakonfigurovat takto:

```
AcApDocManager.createInstance({
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dxfParser: './workers/dxf-parser-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})
```

Workery se vytvoří takto:

```
new Worker(workerUrl, { type: 'module' })
```

⚠️ Adresa `workUrl` se resolvuje relativně k dokumentu (HTML stránce), nikoli relativně k modulu JS.

## Porovnání možností adresy URL Worker

Pokud je aktuální adresa stránky `https://localhost/app/` a váš hlavní modul je načten z `https://localhost/app/assets/main.js`, adresa workerUrl se resolvuje následovně.

| Hodnota workerUrl                       | Základ resolvování      | Příklad výsledné adresy URL   |
| ------------------------------------- | -------------------- | ---------------------- |
| 'workers/worker.js'                   | Aktuální adresa stránky | /app/workers/worker.js |
| './workers/worker.js'                 | Aktuální adresa stránky | /app/workers/worker.js |
| '/workers/worker.js'                  | Kořen webu            | /workers/worker.js     |
| 'https://localhost/workers/worker.js' | Absolutní             | /workers/worker.js     |

## Vyhněte se použití `import.meta.url`

Další možností je vytvářet adresy URL Worker takto:

```
new URL('./xxx-worker.js', import.meta.url)
```

`import.meta.url` ukazuje na **adresu URL aktuálního modulu**. Může proto vést k podivnému chování ve vývojovém i produkčním režimu.

Pokud je například aktuální adresa stránky `https://localhost` a váš hlavní modul je načten z `https://localhost/assets/main.js`, adresa workerUrl se v `Vite dev mode` resolvuje následovně.

| Hodnota workerUrl                       | Základ resolvování        | Resolvováno ve vývojovém režimu   | Resolvováno v produkčním režimu     |
| ------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| 'workers/worker.js'                   | Adresa URL aktuálního modulu | /src/workers/worker.js | /assets/workers/worker.js |
| './workers/worker.js'                 | Adresa URL aktuálního modulu | /src/workers/worker.js | /assets/workers/worker.js |
| '/workers/worker.js'                  | Kořen webu              | /@fs/workers/worker.js | /workers/worker.js        |
| 'https://localhost/workers/worker.js' | Absolutní               | /workers/worker.js     | /workers/worker.js        |

Musíte vytvořit odlišnou logiku ve vývojovém a produkčním režimu. Vyhněte se prosím použití `import.meta.url`.

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
