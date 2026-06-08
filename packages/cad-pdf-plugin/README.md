# @mlightcad/cad-pdf-plugin

PDF **export** and **import** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers two system commands:

| Command | Description |
|---------|-------------|
| `cpdf` | Export the current drawing to a vector PDF (SVG pipeline → jsPDF) |
| `ipdf` | Import vector geometry from a PDF file into model space |

The plugin is designed for **lazy loading** so PDF libraries (`jspdf`, `pdfjs-dist`, `svg2pdf.js`) are only downloaded when a user runs `cpdf` or `ipdf`.

## Key features

- **Vector PDF export** — renders model-space entities via `@mlightcad/cad-svg-plugin`, then converts SVG to PDF with `svg2pdf.js`
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
- `@mlightcad/cad-svg-plugin`

Runtime dependencies (bundled with this package):

- `jspdf`
- `pdfjs-dist`
- `svg2pdf.js`

## Build

Produces `dist/index.js` (main library) and `dist/register.js` (lazy-registration entry).

```bash
pnpm --filter @mlightcad/cad-pdf-plugin build
```

## Usage

### Lazy registration (recommended)

Register the plugin with the document manager's plugin manager. Import from the `/register` subpath so only the registration stub enters your initial bundle; the main plugin chunk loads on first use of `cpdf` or `ipdf`:

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
// Export current drawing to PDF
await AcApDocManager.instance.editor.executeCommand('cpdf')

// Open file picker and import PDF vectors
await AcApDocManager.instance.editor.executeCommand('ipdf')
```

`cad-viewer` registers this plugin automatically via `registerLazyPlugins()` in its app bootstrap.

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
import { AcApPdfConvertor, AcApPdfImportConvertor } from '@mlightcad/cad-pdf-plugin'

// Export
const context: AcApContext = /* active context */
await new AcApPdfConvertor().convert(context)

// Import from bytes
const buffer: ArrayBuffer = /* PDF file */
await new AcApPdfImportConvertor().convert(context, buffer, 1) // page 1
```

## How it works

### Export (`cpdf`)

1. Iterate model-space entities and render with `AcSvgRenderer` (respects linetype scale, lineweight display, font mapping, background/foreground colors).
2. Parse the SVG and pass it to `svg2pdf.js` inside a `jsPDF` document sized to the SVG viewBox.
3. Trigger a browser download as `drawing.pdf`.

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
| `AcApConvertToPdfCmd` | `cpdf` command class |
| `AcApImportPdfCmd` | `ipdf` command class |
| `AcApPdfConvertor` | SVG → PDF export utility |
| `AcApPdfImportConvertor` | PDF → CAD entities import utility |

## Project layout

| Path | Role |
|------|------|
| `src/register.ts` | Lazy plugin registration (`/register` entry) and `createPdfPlugin` |
| `src/AcApPdfPlugin.ts` | Plugin lifecycle (`onLoad` / `onUnload`) |
| `src/AcApConvertToPdfCmd.ts` | `cpdf` command |
| `src/AcApImportPdfCmd.ts` | `ipdf` command |
| `src/AcApPdfConvertor.ts` | Export pipeline (SVG renderer + jsPDF) |
| `src/AcApPdfImportConvertor.ts` | Import pipeline (pdf.js operator parsing) |

## Role in MLightCAD

This package extends `cad-simple-viewer` with optional PDF I/O. It depends on `cad-svg-plugin` for export quality parity with the existing SVG export command (`csvg`) and keeps heavy PDF dependencies out of the core viewer bundle through lazy loading.

## License

MIT
