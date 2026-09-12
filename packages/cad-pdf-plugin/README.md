# @mlightcad/cad-pdf-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-pdf-plugin.svg)](https://www.npmjs.com/package/@mlightcad/cad-pdf-plugin)

PDF **export** and **import** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers system commands:

| Command | Description |
|---------|-------------|
| `-cpdf` | Export via **command-line prompts** (no dialog; AutoCAD-style `-` prefix) |
| `cpdf` | Same as `-cpdf` when no UI command is registered. In [`cad-viewer`](../cad-viewer), `cpdf` opens an **export options dialog** instead |
| `ipdf` | Import vector geometry from a PDF file into model space |

The plugin is designed for **lazy loading** so PDF libraries (`pdf-lib` via `@mlightcad/pdf-renderer`, `pdfjs-dist`) are only downloaded when a user runs `-cpdf` / `cpdf` or `ipdf`.

## Key features

- **Vector PDF export** — renders model space and each paper-space layout as PDF pages with `@mlightcad/pdf-renderer` (native AcGi PDF backend). Paper-space pages include model content shown through viewports, clipped to each viewport frame.
- **Busy indicator** — export shows the same conversion spinner as `chtml` so the browser stays responsive
- **Export options** — model-space framing (`Extents` / `Display`) and optional paper-space layouts
- **PDF import** — parses vector paths from the first page of a PDF (lines, polylines, Bézier curves) and appends CAD entities
- **Plugin API** — implements `AcApPlugin`; register once with `registerLazyPdfPlugin`
- **Framework-agnostic** — no Vue/React dependency; works anywhere `cad-simple-viewer` runs

## Installation

```bash
pnpm add @mlightcad/cad-pdf-plugin
```

Peer dependencies:

- `@mlightcad/cad-simple-viewer`
- `@mlightcad/data-model`
- `@mlightcad/pdf-renderer`

Runtime dependencies (bundled with this package):

- `pdfjs-dist` (import only)

## Build

Produces `dist/index.js` (main library) and `dist/register.js` (lazy-registration entry).

```bash
pnpm --filter @mlightcad/cad-pdf-plugin build
```

## Usage

### Lazy registration (recommended)

Register the plugin with the document manager's plugin manager. Import from the `/register` subpath so only the registration stub enters your initial bundle; the main plugin chunk loads on first use of `-cpdf`, `cpdf`, or `ipdf`:

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'

registerLazyPdfPlugin(AcApDocManager.instance.pluginManager)
```

Do **not** import `registerLazyPdfPlugin` from the package root in application code — that resolves to the full library build and defeats lazy loading.

Equivalent manual registration:

```typescript
import {
  createPdfPlugin,
  PDF_PLUGIN_NAME,
  PDF_PLUGIN_TRIGGERS
} from '@mlightcad/cad-pdf-plugin'

AcApDocManager.instance.pluginManager.registerLazyPlugin({
  name: PDF_PLUGIN_NAME,
  triggers: [...PDF_PLUGIN_TRIGGERS],
  loader: createPdfPlugin
})
```

After registration, users (or your UI) invoke commands through the editor:

```typescript
// Export current drawing to PDF (command-line prompts)
await AcApDocManager.instance.editor.executeCommand('-cpdf')

// Open file picker and import PDF vectors
await AcApDocManager.instance.editor.executeCommand('ipdf')
```

In [`cad-viewer`](../cad-viewer), use `cpdf` to open the export options dialog; `-cpdf` remains available on the command line for prompt-based export.

`cad-viewer` registers this plugin automatically via `registerLazyPlugins()` in its app bootstrap and registers the `cpdf` dialog command separately.

### Eager registration

If you prefer loading PDF support up front:

```typescript
import { AcApPdfPlugin } from '@mlightcad/cad-pdf-plugin'

await AcApDocManager.instance.pluginManager.loadPlugin(new AcApPdfPlugin())
```

### Programmatic convertors

You can bypass the command layer and call the convertors directly:

```typescript
import { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcApPdfConvertor,
  AcApPdfImportConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

// Export
const context: AcApContext = /* active context */
await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({
    modelSpaceFit: 'extents',
    exportLayouts: true
  })
)

// Import from bytes
const buffer: ArrayBuffer = /* PDF file */
await new AcApPdfImportConvertor().convert(context, buffer, 1) // page 1
```

## How it works

### Export (`-cpdf` / dialog)

1. Collect options: model-space framing (`Extents` / `Display`) and whether to export layouts.
2. Show the application busy overlay (same animation pattern as `chtml`).
3. Call `@mlightcad/pdf-renderer` `exportDatabaseToPdf`. With layouts enabled, model space and every paper space become one PDF page each.
4. Download the resulting PDF bytes.

### Import (`ipdf`)

1. Show a native file picker (`.pdf`).
2. Use `pdfjs-dist` to read operator lists from the selected page.
3. Convert path operators (move, line, cubic Bézier, close) into `AcDbLine` / `AcDbPolyline` entities in model space.

Import is **vector-only**; raster/scanned PDF pages produce no entities. Only the requested page is processed (default: page 1).

## Main exports

| Export | Role |
|--------|------|
| `createPdfPlugin` | Async factory used by lazy loader |
| `PDF_PLUGIN_NAME`, `PDF_PLUGIN_TRIGGERS` | Plugin id and command triggers |
| `@mlightcad/cad-pdf-plugin/register` | `registerLazyPdfPlugin` and registration constants |
| `AcApPdfPlugin` | `AcApPlugin` implementation |
| `AcApConvertToPdfCmd` | `-cpdf` / fallback `cpdf` command class |
| `AcApImportPdfCmd` | `ipdf` command class |
| `AcApPdfConvertor` | CAD → PDF export utility |
| `AcApPdfExportOptions`, `resolveAcApPdfExportOptions` | Export option types and defaults |
| `AcApPdfImportConvertor` | PDF → CAD entities import utility |

## Project layout

| Path | Role |
|------|------|
| `src/register.ts` | Lazy plugin registration (`/register` entry) and `createPdfPlugin` |
| `src/AcApPdfPlugin.ts` | Plugin lifecycle (`onLoad` / `onUnload`) |
| `src/AcApConvertToPdfCmd.ts` | `-cpdf` command (command-line prompts) |
| `src/AcApImportPdfCmd.ts` | `ipdf` command |
| `src/AcApPdfConvertor.ts` | Export pipeline (`exportDatabaseToPdf`) |
| `src/AcApPdfExportOptions.ts` | Export option types and defaults |
| `src/AcApPdfImportConvertor.ts` | Import pipeline (pdf.js operator parsing) |

## Role in MLightCAD

This package extends `cad-simple-viewer` with optional PDF I/O. Export uses `@mlightcad/pdf-renderer`; import uses `pdfjs-dist`. Heavy PDF dependencies stay out of the core viewer bundle through lazy loading.

## License

MIT
