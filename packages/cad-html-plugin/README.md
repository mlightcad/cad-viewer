# @mlightcad/cad-html-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-html-plugin.svg)](https://www.npmjs.com/package/@mlightcad/cad-html-plugin)

HTML **export** for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer): snapshot format, offline viewer runtime, and optional plugin integration.

| Command | Description |
|---------|-------------|
| `chtml` | Export the current drawing to a self-contained offline HTML file |

The plugin path is designed for **lazy loading** so the export bundle is only downloaded when a user runs `chtml`. Low-level APIs (`packHtml`, snapshot types, scene collectors) are also exported for custom pipelines and the headless CLI [`@mlightcad/cad-html-exporter-cli`](../cad-html-exporter-cli).

## Key features

- **Display-only snapshot** — layers, layouts, line/mesh batches, extents, and drawing units (no editable DXF/DWG payload)
- **Self-contained HTML** — gzip/base64 snapshot + inline viewer runtime; opens offline in any modern browser
- **Offline viewer** — pan/zoom (OrbitControls), layer panel, layout switching, measurement, object snap (OSNAP)
- **i18n** — embedded English / Chinese UI; initial language follows the browser (`zh*` → Chinese, otherwise English), with manual switch persisted in `localStorage`
- **Plugin API** — implements `AcApPlugin`; register once with `registerLazyHtmlPlugin`
- **Composable API** — build snapshots from your own pipeline or call `packHtml` with a pre-built snapshot

## Installation

```bash
pnpm add @mlightcad/cad-html-plugin
```

Peer dependencies:

- `@mlightcad/cad-simple-viewer` (for `chtml` / scene snapshot builder)
- `@mlightcad/data-model`
- `@mlightcad/three-renderer`
- `three`

Runtime dependency (bundled with this package):

- `fflate`

## Build

The package produces two artifacts:

| Output | Description |
|--------|-------------|
| `dist/index.js` | Library entry (snapshot types, codec, `packHtml`, `createHtmlPlugin`, …) |
| `dist/register.js` | Lightweight lazy-registration entry (safe for static import in app bundles) |
| `dist/viewer-runtime.iife.js` | Offline viewer bootstrap (loaded/inlined into exported HTML) |

```bash
pnpm --filter @mlightcad/cad-html-plugin build
```

Copy or serve `viewer-runtime.iife.js` from your app assets when using the browser export path (see **Integration** below).

## Usage

### Lazy registration (recommended)

Register the plugin with the document manager's plugin manager. Import from the `/register` subpath so only the registration stub enters your initial bundle; the main plugin chunk loads on first use of `chtml`:

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'

AcApDocManager.createInstance({
  container: document.getElementById('cad-container')!,
  htmlViewerRuntimeUrl: './viewer-runtime.iife.js'
})

registerLazyHtmlPlugin(AcApDocManager.instance.pluginManager)
```

Do **not** import `registerLazyHtmlPlugin` from the package root (`@mlightcad/cad-html-plugin`) in application code — that resolves to the full library build and defeats lazy loading.

After registration:

```typescript
await AcApDocManager.instance.editor.executeCommand('chtml')
// or
AcApDocManager.instance.sendStringToExecute('chtml')
```

`cad-viewer` registers this plugin automatically via `registerLazyPlugins()` in its app bootstrap.

### End-to-end export (command or convertor)

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

await new AcApHtmlConvertor().convert('my-drawing.dwg')
```

### Low-level snapshot assembly

```typescript
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExSnapshotV1,
  buildViewerMetadata,
  collectBatchesFromObject3D,
  buildOsnapCatalog,
  packHtml,
  HTML_VIEWER_RUNTIME_FILE
} from '@mlightcad/cad-html-plugin'

const snapshot: AcExSnapshotV1 = /* built via AcApHtmlSnapshotBuilder or manually */

const runtime = await fetch(`./${HTML_VIEWER_RUNTIME_FILE}`).then(r => r.text())
const html = packHtml(snapshot, {
  title: 'My Drawing',
  viewerRuntime: runtime
})
```

### Scene → snapshot (viewer integration)

```typescript
import { AcApHtmlSnapshotBuilder } from '@mlightcad/cad-html-plugin'

const snapshot = await new AcApHtmlSnapshotBuilder().buildAsync(
  view.cadScene,
  document.database,
  { title: 'Drawing', background: view.backgroundColor }
)
```

### Headless / CLI

For DXF/DWG → HTML without a browser UI, use [`@mlightcad/cad-html-exporter-cli`](../cad-html-exporter-cli). It runs the same snapshot + `packHtml` pipeline inside Playwright.

## Integration checklist

When embedding HTML export in a web app:

1. Build `@mlightcad/cad-html-plugin` and expose `viewer-runtime.iife.js` at a URL your app can `fetch` (e.g. Vite `public/` copy — see `cad-viewer-example` / `cad-simple-viewer-example` vite configs).
2. Register via `@mlightcad/cad-html-plugin/register` (or load the plugin eagerly).
3. Optionally set `htmlViewerRuntimeUrl` on `AcApDocManager.createInstance()` to override the default `./viewer-runtime.iife.js` path.
4. Ensure fonts used by the drawing are reachable during export if you rely on web-font substitution.

The generated HTML itself needs **no backend**; only the export step may fetch the runtime bundle and fonts.

Subpath exports:

```typescript
import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import '@mlightcad/cad-html-plugin/viewer-runtime' // dist/viewer-runtime.iife.js
```

## Main exports

| Export | Role |
|--------|------|
| `createHtmlPlugin` | Async factory used by the lazy loader |
| `HTML_PLUGIN_NAME`, `HTML_PLUGIN_TRIGGERS` | Plugin id and command triggers |
| `@mlightcad/cad-html-plugin/register` | `registerLazyHtmlPlugin` and registration constants |
| `AcApExportHtmlCmd`, `AcApHtmlConvertor` | `chtml` command and full export workflow |
| `AcApHtmlSnapshotBuilder` | Live Three.js scene → `AcExSnapshotV1` |
| `packHtml`, `AcExPackHtmlOptions` | Assemble HTML from snapshot + runtime source |
| `HTML_VIEWER_RUNTIME_FILE` | Default runtime filename (`viewer-runtime.iife.js`) |
| `AcExSnapshotV1`, `ACEX_SNAPSHOT_VERSION`, batch/layer types | Snapshot schema |
| `encodeSnapshot`, `decodeSnapshot` | Gzip/base64 codec for embedded payloads |
| `collectBatchesFromObject3D` | THREE.js scene → line/mesh batches |
| `buildViewerMetadata` | Database → viewer meta (units, extents, background, …) |
| `buildOsnapCatalog`, OSNAP primitive helpers | Analytic snap geometry for the offline viewer |
| `AcExHtmlI18n`, `detectAcExHtmlLocale`, `detectBrowserAcExHtmlLocale`, `resolveAcExHtmlLocale` | Viewer UI strings and locale detection |

## Project layout

| Path | Role |
|------|------|
| `src/register.ts` | Lazy plugin registration (`/register` entry) and `createHtmlPlugin` |
| `src/AcApHtmlPlugin.ts` | Plugin lifecycle (`onLoad` / `onUnload`) |
| `src/AcApExportHtmlCmd.ts` | `chtml` command |
| `src/AcApHtmlConvertor.ts` | Export orchestration (snapshot, runtime fetch, download) |
| `src/AcApHtmlSnapshotBuilder.ts` | Three.js scene → snapshot builder |
| `src/AcExSnapshotTypes.ts` | Snapshot schema (v1) |
| `src/AcExSnapshotCodec.ts` | Encode/decode embedded snapshot script tag |
| `src/AcExSceneBatchCollector.ts` | THREE.js traversal → export batches |
| `src/AcExHtmlPackager.ts` | `packHtml` — shell + snapshot + runtime |
| `src/AcExHtmlViewerRuntime.ts` | Offline viewer (built as IIFE) |
| `src/AcExHtmlShell.ts` | Static HTML/CSS shell markup |
| `src/AcExOsnap*.ts` | Object snap index and primitives |
| `src/AcExMeasurement.ts` | Distance/area measurement in the offline viewer |
| `src/AcExHtmlI18n.ts` | English / Chinese UI messages |

## Role in MLightCAD

This package combines the **export format / offline viewer runtime** with **viewer integration** (plugin, snapshot builder, `chtml` command). `@mlightcad/cad-simple-viewer` stays free of HTML export code; heavy export logic can be lazy-loaded. `@mlightcad/cad-html-exporter-cli` provides a Node/Playwright entry point for batch conversion.

## License

MIT
