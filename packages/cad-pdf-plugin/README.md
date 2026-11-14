# @mlightcad/cad-pdf-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-pdf-plugin.svg)](https://www.npmjs.com/package/@mlightcad/cad-pdf-plugin)

PDF **export** and **import** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers system commands:

| Command | Description |
|---------|-------------|
| `-cpdf` | Export via **command-line prompts** (no dialog; AutoCAD-style `-` prefix) |
| `cpdf` | Same as `-cpdf` when no UI command is registered. In [`cad-editor`](../cad-editor), `cpdf` opens an **export options dialog** instead |
| `pdfimport` | Import vector geometry from a PDF file into model space through the Import PDF dialog, recovering circles, arcs, ellipses and splines |
| `-pdfimport` | Same import with command-line prompts (page, insertion point, `Scale`, `Mode`) instead of the dialog |
| `pdfscale` | Calibrate imported PDF geometry: pick two points of a known distance and type its real length |
| `pdftext` | Convert exploded text (SHX line text, outlined fonts) back into `AcDbText`, semi-automatically |
| `pdfblock` | Turn repeated geometry back into a block: select one instance, every rotated / mirrored copy is found and replaced |
| `pdfdim` | Turn exploded dimensions (arrows or ticks, lines, extension lines, texts — including stroke digits) back into linear, radius, diameter and angular dimensions via a review palette |

The plugin is designed for **lazy loading** so PDF libraries (`pdf-lib` via `@mlightcad/pdf-renderer`, `pdfjs-dist`) are only downloaded when a user runs `-cpdf` / `cpdf` or `pdfimport`.

## Key features

- **Vector PDF export** — renders model space and each paper-space layout as PDF pages with `@mlightcad/pdf-renderer` (native AcGi PDF backend). Paper-space pages include model content shown through viewports, clipped to each viewport frame.
- **Busy indicator** — export shows the same conversion spinner as `chtml` so the browser stays responsive
- **Export options** — model-space framing (`Extents` / `Display`), optional paper-space layouts, text mode (`Text` / `Vector`) and colour mode (`Color` / `Monochrome` — black content on white paper)
- **Shared core (1.8.0+)** — export logic lives in [`@mlightcad/cad-pdf-core`](../cad-pdf-core), which the headless [`@mlightcad/cad-pdf-exporter`](../cad-pdf-exporter) also uses so Node can export PDF without a browser ([upgrade guide](../../docs/development/upgrade-guide.md))
- **PDF import** — parses vector paths from a chosen PDF page and appends CAD entities. Bézier chains are rebuilt as true `AcDbCircle` / `AcDbArc` / `AcDbEllipse`, mixed line–arc outlines as bulged `AcDbPolyline`, free-form curves as exact `AcDbSpline`, and arcs a producer already flattened into short lines are refitted. Stroke widths become line weights, dashed strokes get matching `PDF_DASH_*` linetypes, PDF fonts become `PDF_<family>` text styles, filled areas become solid hatches in paint order (`fillHatches`), pattern hatches that the PDF holds as short lines are rebuilt as `AcDbHatch` with their `acadiso.pat` pattern, scale and angle (`recognizeHatches`, kept only when re-drawing reproduces the lines), and exact duplicate outlines are dropped
- **Scale calibration** — `pdfscale` rescales imported geometry from one known distance, since printed PDFs are rarely 1:1. When the selection holds exploded dimensions, the scale their texts imply pre-fills the real length
- **Block recovery** — `pdfimport` turns Form XObjects painted two or more times with identical content into a block definition with one reference per paint (rotation, mirroring and scale come from each paint's form matrix). `pdfblock` handles PDFs that draw repeated symbols inline: select one instance, pick a base point and name, and every copy under rotation and mirroring (optionally scaling) is highlighted for confirmation and replaced by a block reference
- **Dimension recovery** — `pdfdim` recognizes linear (any angle, inside or outside arrows, architectural ticks, chained), radius, diameter and angular dimensions in a selected area, including value text still drawn as strokes (grid template matcher, no LLM). A review palette lets you edit values, pick or create a dim style (shared style preview), then Apply; Cancel leaves the drawing unchanged. It infers the drawing scale from the texts and pins paper sizes via entity overrides onto a `PDF_DIM` (or new) style so a large inherited DIMSCALE cannot hide extensions, and a 1:100 drawing keeps its real values
- **Text recovery** — real PDF text runs that continue one line are merged into one `AcDbText`. `pdftext` turns exploded text strokes back into text: it clusters strokes into lines (position, height, rotation), reads lines made of known glyph shapes from its glyph dictionary, and, with an OCR recognizer registered in `AcApTextRecognitionService` (`@mlightcad/cad-llm-plugin` registers one that uses the configured vision model), sends all other lines at once via `recognizeBatch` and converts the whole selection in one edit. Only lines nothing could read are prompted; typed glyph shapes are learned.
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

Register the plugin with the document manager's plugin manager. Import from the `/register` subpath so only the registration stub enters your initial bundle; the main plugin chunk loads on first use of `-cpdf`, `cpdf`, or `pdfimport`:

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

// Open the file picker and the Import PDF dialog, then import PDF vectors
await AcApDocManager.instance.editor.executeCommand('pdfimport')
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
  mode: 'recover', // default; 'visual' keeps the PDF look (see below)
  recognizeCurves: true, // recover mode default; false = flatten curves
  curveRecognition: { tolerance: 0.01, splines: true },
  lineWeights: true,
  removeDuplicates: true,
  dashLinetypes: true, // PDF_DASH_* linetypes for dashed strokes
  textStyles: true, // PDF_<family> text styles
  fillHatches: true, // false: filled areas import as outlines only
  recognizeHatches: true, // rebuild pattern hatches from their strokes
  fitTextWidth: true, // stretch/squeeze text to its PDF width
  images: true // raster images become AcDbRasterImage (PDF_IMAGE_n.png)
})
```

`mode` picks the defaults of the reconstruction options. `'recover'` turns on `recognizeCurves`, `removeDuplicates`, `mergeTextRuns`, `formBlocks` and `textStyles` to rebuild the source drawing. `'visual'` turns them off, so every path becomes a line or flattened polyline and every text run its own `AcDbText`, keeping the page exactly as painted (the behaviour before curve recovery). Line weights and dash linetypes stay on in both modes, and any option passed explicitly overrides the mode.

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

### Dimension recovery (`pdfdim`)

1. Select the area; lines, closed triangles, circles, arcs and texts take part. Exploded stroke text (before `pdftext`) is included: the glyph dictionary and a built-in digit/symbol template matcher read it locally — no LLM. When strokes still cannot be read, linear dimensions fall back to the measured length.
2. `recognition/pdfDimensionPattern.ts` finds the parts:
   - **Arrowheads**: slender closed triangles. The tip is the sharpest corner, and the direction runs from the base midpoint to the tip.
   - **Ticks**: short oblique lines at the ends of a longer line.
   - **Linear dimensions**: two terminators on a common axis pointing apart or together, plus a numeric text beside them. Pairs are taken shortest first, so chained dimensions stay separate. Perpendicular lines through the tips are extension lines and give the definition points; chained dimensions may share them.
   - **Radius and diameter**: an arrow whose tip touches a circle and points along its radius, plus an `R…` or `Ø…` text.
   - **Angular**: an arc with an arrow at each end pointing along it, a value text near its middle, and radial extension lines. These become `AcDb3PointAngularDimension`; angles are compared without DIMLFAC, and a `°` counts as a plain number.
3. The most common text / measured-length ratio among linear dimensions is the drawing scale. It is snapped to 1, 2, 2.5 or 5 × 10ⁿ when within 1 %. Stroke misreadings such as a run of `1`s are replaced by the measured length when they disagree with that scale.
4. A palette review opens (like `pdftext` / `pdfhatch`): edit each value, include or skip rows, pick an existing dim style or create a new one, then Apply. Without a DOM, every dimension found is converted directly.
5. The chosen style is created or updated when it is `PDF_DIM` or brand-new. It starts from the current style, then takes the measured text height, arrow size and extension, forces both extension lines on, sets arrow fit from inside/outside tips, and DIMLFAC = scale; ticks set `_ArchTick`. Other existing styles are left unchanged.
6. Each accepted dimension becomes `AcDbRotatedDimension`, `AcDbRadialDimension` or `AcDbDiametricDimension`. Texts that are not plain numbers, or that disagree with measurement × scale, are kept as text overrides. The source shapes are erased.

### Text recovery (`pdftext`)

1. Select the strokes; a window around the text is enough. Strokes much larger than the text (frames, table lines) are ignored.
2. Strokes within a word gap form phrases. Each phrase gets its baseline direction from the minimum-height oriented bounding box, then splits into rows and lines (`recognition/pdfGlyphClustering.ts`). The cap height and baseline ignore descenders.
3. Lines whose glyphs are all in the session's glyph dictionary (`recognition/pdfGlyphDictionary.ts`) are read from it. All other lines are rendered to images and sent to OCR in one `AcApTextRecognitionService.recognizeBatch` call (the LLM recognizer packs up to 20 images per request). Recognizer errors are shown to the user once per run.
4. Everything read is converted in one append and one erase. Only lines still unread are highlighted for the user to type; empty skips, Esc stops and keeps what was converted. The run is one undo step.
5. Typed text whose character count matches the glyph boxes teaches the dictionary: each glyph's normalized, quantized stroke geometry maps to its character. The 5000 most recently confirmed shapes are kept in `localStorage`, so later sessions and other drawings with the same font benefit.

### Import (`pdfimport`)

1. Show a native file picker (`.pdf`).
2. Open the Import PDF dialog (`AcUiPdfImportDialog`, framework-free, built on `AcUiDialog`): file name with Browse, page number with a page preview or thumbnail grid and the page size, insertion point X/Y or "Specify insertion point on-screen", scale, and import mode (`Recover` rebuilds the drawing, default; `Visual` keeps the PDF look). Location, scale and mode are remembered for the next `pdfimport`. With the on-screen option, OK is followed by one insertion point prompt (Enter accepts the origin). `-pdfimport` skips the dialog and prompts for the page (multi-page files only), then the insertion point with `Scale` and `Mode` options.
3. Use `pdfjs-dist` to read operator lists from the selected page.
4. Keep every path as exact segments (lines and cubic Béziers; quadratics are degree-elevated) in model-space millimeters, and `showText` runs as `AcDbText`.
5. In `Recover` mode, recognize CAD curves per subpath (`recognition/pdfCurveRecognition.ts`): a cubic whose samples and end tangents match one circle becomes an arc; consecutive arcs on the same circle merge, and a closed 360° chain becomes a circle. Chains that fit a conic become an ellipse. Runs of at least six short, evenly turning lines (turn ≤ 15°, so octagons stay polygons) are refitted as arcs. Lines plus arcs give a bulged polyline; pure free-form chains give an exact spline (triple interior knots). Default tolerance: max(0.01 mm, 0.2 % of the radius).
6. In `Recover` mode, group top-level Form XObject paints whose geometry is identical in form space (`recognition/pdfFormBlocks.ts`; PDF.js inlines forms without naming them). Each group of two or more becomes a `PDF_FORM_n` block, and each paint becomes a reference whose transform comes from its form matrix. Paints with shear stay as plain geometry. Turn this off with `formBlocks: false`.
7. Map PDF optional content groups to CAD layers when present.
8. Remap paper-contrast ink to ACI 7 (AutoCAD foreground): black ink on white PDF paper, or white ink on dark PDF paper. ACI 7 follows the CAD canvas background.

9. Fit each text to its PDF advance width: the text is measured in the font the viewer will draw it with (`AcApFontUtil.measureTextWidth`, which mirrors the TEXT renderer's style font → big font → default font lookup) and its width factor is set to `pdfWidth / measuredWidth`. Turn this off with `fitTextWidth: false`.
10. Turn image paints (`paintImageXObject`, inline images) into `AcDbRasterImage` entities (`pdfImportImages.ts`). Each image is redrawn with its full placement (rotation, mirroring, skew) into an upright PNG covering its bounding box, so the entity needs no rotation. Dark ink on transparency (QR codes, stamps) is laid on white, as on the PDF page. The PNG lives in memory on the entity; the `PDF_IMAGE_n.png` definition is a name only, because DWG/DXF reference images as external files. Turn this off with `images: false`. Image masks and clipping paths are not applied.

Only the requested page is processed (default: page 1). Form XObject `/Matrix` is applied so nested content keeps its placement.

## Main exports

| Export | Role |
|--------|------|
| `createPdfPlugin` | Async factory used by lazy loader |
| `PDF_PLUGIN_NAME`, `PDF_PLUGIN_TRIGGERS` | Plugin id and command triggers |
| `@mlightcad/cad-pdf-plugin/register` | `registerLazyPdfPlugin` and registration constants |
| `AcApPdfPlugin` | `AcApPlugin` implementation |
| `AcApConvertToPdfCmd` | `-cpdf` / fallback `cpdf` command class |
| `AcApImportPdfCmd` | `pdfimport` command class |
| `AcApImportPdfPromptCmd` | `-pdfimport` command class |
| `AcUiPdfImportDialog` | Import PDF dialog opened by `pdfimport` (page preview, location, scale, mode) |
| `AcApPdfScaleCmd` | `pdfscale` command class |
| `AcApPdfTextCmd` | `pdftext` command class |
| `AcApPdfBlockCmd` | `pdfblock` command class |
| `AcApPdfDimCmd` | `pdfdim` command class |
| `AcApPdfDimSession`, `AcUiPdfDimPanel` | Review state and palette UI for `pdfdim` |
| `recognizePdfDimensions`, `suggestPdfDimensionScale`, `pdfArrowFromPolygon`, `parsePdfDimensionValue`, `recognizePdfDimStrokeText` | Dimension recognition (including lightweight stroke digits) |
| `pdfEntitiesToDimInput`, `acapPdfEnsureDimStyle`, `acapPdfCreateDimensions`, `acapPdfNiceScale` | Dimension conversion against a database |
| `findPdfShapeMatches`, `buildPdfFormBlocks`, `pdfEntityToFeature` | Block recovery building blocks |
| `clusterPdfTextStrokes`, `PdfGlyphDictionary`, `mergePdfTextRuns`, `pdfEntityToStroke` | Text recovery building blocks |
| `AcApPdfImportOptions`, `resolveAcApPdfImportOptions` | Import options (mode, page, placement, scale, curve recognition) |
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
| `src/AcApImportPdfCmd.ts` | `pdfimport` command |
| `src/AcApPdfScaleCmd.ts` | `pdfscale` command |
| `src/AcApPdfTextCmd.ts` | `pdftext` command |
| `src/AcApPdfBlockCmd.ts` | `pdfblock` command |
| `src/AcApPdfDimCmd.ts` | `pdfdim` command |
| `src/pdfDimensionConvert.ts` | Dimension entities and the `PDF_DIM` style |
| `src/acapPdfPrompts.ts` | Shared Yes / No / Review prompt |
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
