# @mlightcad/cad-svg-converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SVG → [`AcDbDatabase`](https://github.com/mlightcad/realdwg-web) converter for
MLightCAD **File → Open**. Turns a basic SVG element subset into editable CAD
entities (lines, polylines, circles, text).

Document markup is parsed with the open-source
[`svg-parser`](https://www.npmjs.com/package/svg-parser) package (HAST tree).
Path `d` strings are then tessellated into polylines.

> Export to SVG remains in [`@mlightcad/cad-svg-plugin`](../cad-svg-plugin)
> (`csvg`). This package is **import / open only**.

## Supported subset (v1)

| SVG | CAD |
|-----|-----|
| `line` | `AcDbLine` |
| `polyline` / `polygon` / `rect` | `AcDbPolyline` |
| `circle` (uniform scale) | `AcDbCircle` |
| `ellipse` (uniform CTM) | `AcDbEllipse` |
| non-uniform scaled circle/ellipse | closed polyline approximation |
| `path` (M/L/H/V/C/Q/S/T/A/Z) | polylines (curves tessellated) |
| `text` / nested `tspan` text content | `AcDbText` |
| nested `g` + `transform` | applied into geometry |
| `stroke` / `stroke-width` (attr or inline `style`) | entity color / line weight |

Coordinates are flipped from SVG Y-down to CAD Y-up using the root `viewBox`
(or `width`/`height`; default viewport 300×150 when omitted). Unsupported
elements are skipped (`skippedElementCount`); conversion does not fail.

## Not yet converted (roadmap)

Use this list when extending v1. Items are grouped by how much work they need.

### Elements (skipped entirely today)

| SVG | Intended CAD mapping (suggestion) |
|-----|-----------------------------------|
| `image` | `AcDbRasterImage` / attached image |
| `use` / `symbol` | resolve `href` / `xlink:href` and instantiate referenced geometry |
| `defs` children beyond what `use` needs | keep as library definitions, not model-space entities |
| `a` (hyperlink wrapper) | walk children; optionally store URL as XData / hyperlink |
| `switch` | pick first matching child (or always first) |
| `foreignObject` | out of scope / skip |
| `canvas` / custom elements | skip |

### Shapes with missing attributes

| Gap | Notes |
|-----|-------|
| `rect` `rx` / `ry` | rounded corners → arc segments or polyline approximation |
| `polyline` / `polygon` with fewer than 2 points | currently dropped |
| zero-size `rect` / `circle` / `ellipse` | currently dropped |
| nested `<svg>` viewports | child `viewBox` / `x`/`y`/`width`/`height` not applied as a new viewport |
| units on lengths (`px`, `mm`, `%`, `em`, …) | only leading numeric part is parsed; `%` / font-relative sizes wrong |

### Path / curve fidelity

| Gap | Notes |
|-----|-------|
| curve → native CAD arcs/splines | C/Q/S/T/A are chord-tessellated (~16 segs); prefer `AcDbArc` / `AcDbSpline` where possible |
| configurable tessellation tolerance | `segmentsPerCurve` is fixed at call site |
| path `stroke-linecap` / `stroke-linejoin` / miter | not mapped |

### Text

| Gap | Notes |
|-----|-------|
| per-`tspan` position (`x`/`y`/`dx`/`dy`) | all tspans concatenated into one `AcDbText` at the parent `text` origin |
| `textPath` | skip / flatten |
| `text-anchor` / `dominant-baseline` / alignment-baseline | always treated as left / baseline-ish |
| `font-family` / `font-weight` / `font-style` | not mapped to CAD text style |
| multi-line / `xml:space` | whitespace collapsed via `trim` only |
| `AcDbMText` for rich runs | currently plain `AcDbText` only |

### Fill, paint, and presentation

| Gap | Notes |
|-----|-------|
| `fill` / `fill-opacity` → hatch or solid | fill is ignored; closed shapes are stroke-only polylines |
| `stroke-opacity` / `opacity` | ignored |
| `stroke-dasharray` / `stroke-dashoffset` | ignored (linetype) |
| gradients (`linearGradient` / `radialGradient`) | ignored |
| patterns (`pattern`) | ignored |
| `currentColor` / `inherit` / named SVG color quirks | only CSS colors that `AcCmColor.setRGBFromCss` accepts |
| presentation via `class` + `<style>` / external CSS | class selectors and stylesheets ignored; only element attrs + inline `style` for stroke |
| `marker` / `marker-start` / `marker-mid` / `marker-end` | ignored |
| `vector-effect="non-scaling-stroke"` | stroke width follows CTM scale into line weight heuristically |

### Clipping, masking, filters

| Gap | Notes |
|-----|-------|
| `clipPath` / `clip-path` | ignored |
| `mask` | ignored |
| `filter` / fe* primitives | ignored |
| `visibility` / `display="none"` | not checked (hidden geometry may still import) |

### Structure, layers, and metadata

| Gap | Notes |
|-----|-------|
| SVG layers / `inkscape:groupmode="layer"` / `data-name` | everything goes to model space; no CAD layers |
| `id` / `data-*` → entity name / XData | not preserved |
| groups as CAD blocks / anonymous blocks | `g` is flatten-only |
| `<title>` / `<desc>` / `<metadata>` | ignored |
| animation / SMIL / CSS transitions | ignored |

### Document / coordinate system

| Gap | Notes |
|-----|-------|
| `preserveAspectRatio` | not applied when fitting viewBox |
| nested `<svg>` as a nested viewport | treated like `g`; child `viewBox` / offsets ignored |
| non-uniform text / font-size under skewed CTM | height uses average uniform scale |
| CSS `transform` property | only the SVG `transform` attribute |
| `view` element / fragment identifiers | ignored |

## Installation

```bash
pnpm add @mlightcad/cad-svg-converter
```

Peer: `@mlightcad/data-model` (same version as the rest of MLightCAD).

## Registration

`@mlightcad/cad-simple-viewer` does **not** register this converter. Call once
at app startup (cad-editor does this in `initializeCadViewer`):

```ts
import { registerSvgConverter } from '@mlightcad/cad-svg-converter'

registerSvgConverter()
```

Then open `.svg` through the normal document APIs:

```ts
await AcApDocManager.instance.openDocument('drawing.svg', arrayBuffer)
// or
await AcApDocManager.instance.openUrl('https://example.com/drawing.svg')
```

## API

| Export | Description |
|--------|-------------|
| `registerSvgConverter` | Registers `'svg'` on `AcDbDatabaseConverterManager` |
| `ACDB_SVG_FILE_TYPE` | `'svg'` converter key |
| `AcDbSvgConverter` | `AcDbDatabaseConverter` implementation |
| `acdbSvgParseDocument` | SVG string → intermediate model |
| `acdbSvgModelToEntities` | Model → `AcDbEntity[]` |

## Build

```bash
pnpm --filter @mlightcad/cad-svg-converter build
```
