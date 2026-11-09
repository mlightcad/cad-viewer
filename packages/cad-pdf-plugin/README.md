# @mlightcad/cad-pdf-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-pdf-plugin.svg)](https://www.npmjs.com/package/@mlightcad/cad-pdf-plugin)

PDF **export** and **import** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers system commands:

| Command | Description |
|---------|-------------|
| `-cpdf` | Export via **command-line prompts** (no dialog; AutoCAD-style `-` prefix) |
| `cpdf` | Same as `-cpdf` when no UI command is registered. In [`cad-editor`](../cad-editor), `cpdf` opens an **export options dialog** instead |
| `ipdf` | Import vector geometry from a PDF file into model space, recovering circles, arcs, ellipses and splines |
| `pdfscale` | Calibrate imported PDF geometry: pick two points of a known distance and type its real length |
| `pdftext` | Convert exploded text (SHX line text, outlined fonts) back into `AcDbText`, semi-automatically |
| `pdfblock` | Turn repeated geometry back into a block: select one instance, every rotated / mirrored copy is found and replaced |

The plugin is designed for **lazy loading** so PDF libraries (`pdf-lib` via `@mlightcad/pdf-renderer`, `pdfjs-dist`) are only downloaded when a user runs `-cpdf` / `cpdf` or `ipdf`.

## Key features

- **Vector PDF export** — renders model space and each paper-space layout as PDF pages with `@mlightcad/pdf-renderer` (native AcGi PDF backend). Paper-space pages include model content shown through viewports, clipped to each viewport frame.
- **Busy indicator** — export shows the same conversion spinner as `chtml` so the browser stays responsive
- **Export options** — model-space framing (`Extents` / `Display`), optional paper-space layouts, text mode (`Text` / `Vector`) and colour mode (`Color` / `Monochrome` — black content on white paper)
- **Shared core (1.8.0+)** — export logic lives in [`@mlightcad/cad-pdf-core`](../cad-pdf-core), which the headless [`@mlightcad/cad-pdf-exporter`](../cad-pdf-exporter) also uses so Node can export PDF without a browser ([upgrade guide](../../docs/development/upgrade-guide.md))
- **PDF import** — parses vector paths from a chosen PDF page and appends CAD entities. Bézier chains are rebuilt as true `AcDbCircle` / `AcDbArc` / `AcDbEllipse`, mixed line–arc outlines as bulged `AcDbPolyline`, free-form curves as exact `AcDbSpline`, and arcs a producer already flattened into short lines are refitted. Stroke widths become line weights and exact duplicate outlines are dropped
- **Scale calibration** — `pdfscale` rescales imported geometry from one known distance, since printed PDFs are rarely 1:1
- **Block recovery** — `ipdf` turns Form XObjects painted two or more times with identical content into a block definition with one reference per paint (rotation, mirroring and scale come from each paint's form matrix). `pdfblock` handles PDFs that draw repeated symbols inline: select one instance, pick a base point and name, and every copy under rotation and mirroring (optionally scaling) is highlighted for confirmation and replaced by a block reference
- **Text recovery** — real PDF text runs that continue one line are merged into one `AcDbText`. `pdftext` turns exploded text strokes back into text: it clusters strokes into lines (position, height, rotation), asks for each line's text, and learns every confirmed glyph shape, so lines whose glyphs are all known convert without asking. With an OCR recognizer registered in `AcApTextRecognitionService` (the CAD Agent plugin registers one that uses the configured vision model), each prompt is pre-filled with a suggestion
- **Plugin API** — implements `AcApPlugin`; register once with `registerLazyPdfPlugin`
- **Framework-agnostic** — no Vue/React dependency; works anywhere `cad-simple-viewer` runs

## Installation

```bash
pnpm add @mlightcad/cad-pdf-plugin
```

Peer dependencies:

- `@mlightcad/cad-pdf-core`
- `@mlightcad/cad-simple-viewer`
- `@mlightcad/data-model`
- `@mlightcad/mtext-parser`
- `@mlightcad/pdf-renderer`
- `@mlightcad/three-renderer`

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

In [`cad-editor`](../cad-editor), use `cpdf` to open the export options dialog; `-cpdf` remains available on the command line for prompt-based export.

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
    exportLayouts: true,
    textMode: 'text',
    colorMode: 'monochrome' // or 'color' (default)
  })
)

// Import from bytes
const buffer: ArrayBuffer = /* PDF file */
await new AcApPdfImportConvertor().convert(context, buffer, 1) // page 1

// ...or with full options
await new AcApPdfImportConvertor().convert(context, buffer, {
  pageNumber: 2,
  insertionPoint: { x: 1000, y: 0 },
  scale: 100, // drawing printed at 1:100
  recognizeCurves: true, // default; false = flatten curves like before
  curveRecognition: { tolerance: 0.01, splines: true },
  lineWeights: true,
  removeDuplicates: true
})
```

The pure recognition step is also exported: `recognizePdfCurves(segments)` turns the exact segments of one `PdfImportedSubpath` into `PdfRecognizedShape`s, and `buildPdfImportShapes(content, options)` runs it over a whole page with placement and de-duplication.

## How it works

### Export (`-cpdf` / dialog)

1. Collect options: model-space framing (`Extents` / `Display`), whether to export layouts, text mode (`Text` / `Vector`) and colour mode (`Color` / `Monochrome`).
2. Show the application busy overlay (same animation pattern as `chtml`).
3. Call `@mlightcad/cad-pdf-core` `acexPdfExportDatabase` (built on `@mlightcad/pdf-renderer`). With layouts enabled, model space and every paper space become one PDF page each. Monochrome paints linework and text black on white paper (solid fills become grey).
4. Download the resulting PDF bytes.

### Block recovery (`pdfblock`)

1. Select one instance. Lines, arcs, circles, polylines, ellipses, splines and text take part; other entity types are left alone.
2. Pick the base point. The `Scale` keyword toggles matching scaled copies; it is off by default.
3. Enter the block name. A free `PDF_BLOCK_n` name is pre-filled.
4. `recognition/pdfShapeMatching.ts` takes two anchor shapes: the largest one, and the one farthest from it. Each candidate pair of anchors fixes a similarity transform, and a copy counts only if every template shape lands on a free shape of the same kind, size and point set.
5. All copies are highlighted. Choose `Yes` (replace all), `No` (only the selection becomes a block) or `Review` (Yes / No / All / Exit per copy).

### Text recovery (`pdftext`)

1. Select the strokes; a window around the text is enough. Strokes much larger than the text (frames, table lines) are ignored.
2. Strokes within a word gap form phrases. Each phrase gets its baseline direction from the minimum-height oriented bounding box, then splits into rows and lines (`recognition/pdfGlyphClustering.ts`). The cap height and baseline ignore descenders.
3. Lines whose glyphs are all in the session's glyph dictionary (`recognition/pdfGlyphDictionary.ts`) are converted immediately. For the others, the strokes are highlighted and the prompt shows `<suggestion>` when the dictionary or OCR has one. Enter accepts the suggestion or skips; Esc stops and keeps what was converted.
4. Typed text whose character count matches the glyph boxes teaches the dictionary: each glyph's normalized, quantized stroke geometry maps to its character.

### Import (`ipdf`)

1. Show a native file picker (`.pdf`).
2. Prompt for the page (multi-page files only), then the insertion point, with `Scale` and `Curves` (curve recognition on/off) options. Enter accepts the origin.
3. Use `pdfjs-dist` to read operator lists from the selected page.
4. Keep every path as exact segments (lines and cubic Béziers; quadratics are degree-elevated) in model-space millimeters, and `showText` runs as `AcDbText`.
5. Recognize CAD curves per subpath (`recognition/pdfCurveRecognition.ts`): a cubic whose samples and end tangents match one circle becomes an arc; consecutive arcs on the same circle merge, and a closed 360° chain becomes a circle. Chains that fit a conic become an ellipse. Runs of at least six short, evenly turning lines (turn ≤ 15°, so octagons stay polygons) are refitted as arcs. Lines plus arcs give a bulged polyline; pure free-form chains give an exact spline (triple interior knots). Default tolerance: max(0.01 mm, 0.2 % of the radius).
6. Group top-level Form XObject paints whose geometry is identical in form space (`recognition/pdfFormBlocks.ts`; PDF.js inlines forms without naming them). Each group of two or more becomes a `PDF_FORM_n` block, and each paint becomes a reference whose transform comes from its form matrix. Paints with shear stay as plain geometry. Turn this off with `formBlocks: false`.
7. Map PDF optional content groups to CAD layers when present.
8. Remap paper-contrast ink to ACI 7 (AutoCAD foreground): black ink on white PDF paper, or white ink on dark PDF paper. ACI 7 follows the CAD canvas background.

Import is **vector-only**; raster/scanned PDF pages produce no entities. Only the requested page is processed (default: page 1). Form XObject `/Matrix` is applied so nested content keeps its placement.

## Main exports

| Export | Role |
|--------|------|
| `createPdfPlugin` | Async factory used by lazy loader |
| `PDF_PLUGIN_NAME`, `PDF_PLUGIN_TRIGGERS` | Plugin id and command triggers |
| `@mlightcad/cad-pdf-plugin/register` | `registerLazyPdfPlugin` and registration constants |
| `AcApPdfPlugin` | `AcApPlugin` implementation |
| `AcApConvertToPdfCmd` | `-cpdf` / fallback `cpdf` command class |
| `AcApImportPdfCmd` | `ipdf` command class |
| `AcApPdfScaleCmd` | `pdfscale` command class |
| `AcApPdfTextCmd` | `pdftext` command class |
| `AcApPdfBlockCmd` | `pdfblock` command class |
| `findPdfShapeMatches`, `buildPdfFormBlocks`, `pdfEntityToFeature` | Block recovery building blocks |
| `clusterPdfTextStrokes`, `PdfGlyphDictionary`, `mergePdfTextRuns`, `pdfEntityToStroke` | Text recovery building blocks |
| `AcApPdfImportOptions`, `resolveAcApPdfImportOptions` | Import options (page, placement, scale, curve recognition) |
| `recognizePdfCurves`, `buildPdfImportShapes`, `PdfRecognizedShape` | Curve recognition and page-level shape building |
| `AcApPdfConvertor` | CAD → PDF export utility |
| `AcApPdfExportOptions`, `AcApPdfColorMode`, `resolveAcApPdfExportOptions` | Export option types and defaults (aliases of `@mlightcad/cad-pdf-core`) |
| `AcApPdfImportConvertor` | PDF → CAD entities import utility |
| `extractPdfImportSubpaths`, `PDF_IMPORT_FOREGROUND_COLOR`, `PdfImportExtractOptions`, contrast helpers | Programmatic vector import / ACI 7 remapping |

## Project layout

| Path | Role |
|------|------|
| `src/register.ts` | Lazy plugin registration (`/register` entry) and `createPdfPlugin` |
| `src/AcApPdfPlugin.ts` | Plugin lifecycle (`onLoad` / `onUnload`) |
| `src/AcApConvertToPdfCmd.ts` | `-cpdf` command (command-line prompts) |
| `src/AcApImportPdfCmd.ts` | `ipdf` command |
| `src/AcApPdfScaleCmd.ts` | `pdfscale` command |
| `src/AcApPdfTextCmd.ts` | `pdftext` command |
| `src/AcApPdfBlockCmd.ts` | `pdfblock` command |
| `src/pdfEntityFeatures.ts` | Describes entities for instance matching |
| `src/pdfEntityStrokes.ts` | Samples curve entities into strokes |
| `src/AcApPdfImportOptions.ts` | Import option types and defaults |
| `src/pdfImportShapes.ts` | Page-level recognition, placement and de-duplication |
| `src/recognition/` | Pure geometry: curve recognition and fitting helpers |
| `src/AcApPdfConvertor.ts` | Browser export: view box, fonts, download (rendering via `cad-pdf-core`) |
| `src/AcApPdfExportOptions.ts` | Export option types and defaults |
| `src/AcApPdfImportConvertor.ts` | Import pipeline (pdf.js operator parsing) |

## Role in MLightCAD

This package extends `cad-simple-viewer` with optional PDF I/O. Export uses `@mlightcad/cad-pdf-core` (on top of `@mlightcad/pdf-renderer`); import uses `pdfjs-dist`. Heavy PDF dependencies stay out of the core viewer bundle through lazy loading.

## License

MIT
