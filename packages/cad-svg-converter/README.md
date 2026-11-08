# @mlightcad/cad-svg-converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SVG → [`AcDbDatabase`](https://github.com/mlightcad/realdwg-web) converter for
MLightCAD **File → Open**. Turns a practical SVG subset into editable CAD
entities (lines, polylines, circles, text, solid hatches).

Document markup is parsed with the open-source
[`svg-parser`](https://www.npmjs.com/package/svg-parser) package (HAST tree).
Path `d` strings are then tessellated into polylines.

> Export to SVG remains in [`@mlightcad/cad-svg-plugin`](../cad-svg-plugin)
> (`csvg`). This package is **import / open only**.

## Supported subset (v2)

| SVG | CAD |
|-----|-----|
| `line` | `AcDbLine` |
| `polyline` / `polygon` / `rect` | `AcDbPolyline` (stroke) and/or `AcDbHatch` (fill) |
| `rect` `rx` / `ry` | closed polyline with corner bulges |
| `circle` (uniform scale) | `AcDbCircle` / solid hatch |
| `ellipse` (uniform CTM) | `AcDbEllipse` / solid hatch |
| non-uniform scaled circle/ellipse | closed polyline approximation |
| `path` (M/L/H/V/C/Q/S/T/A/Z) | polylines (curves tessellated) + hatch when closed+filled |
| `text` / nested `tspan` text content | `AcDbText` |
| `text-anchor` (`start` / `middle` / `end`) | horizontal text alignment |
| nested `g` + `transform` | applied into geometry |
| presentation inheritance on `g` / `svg` | fill, stroke, opacities, dash, text-anchor |
| `fill` / `fill-opacity` | solid `AcDbHatch` (+ transparency) |
| `stroke` / `stroke-width` / `stroke-opacity` | entity color / line weight / transparency |
| `stroke-dasharray` | custom linetype (`SVG_DASH_*`) |
| `opacity` | multiplies into fill/stroke transparency |
| `display="none"` / `visibility` | skipped when hidden |
| `a` | children walked |
| `switch` | first matching child |
| `defs` / `symbol` + `use` | href/`xlink:href` `#id` instantiated (defs not in model space) |
| nested `<svg>` viewport | child `viewBox` + `x`/`y`/`width`/`height` (simple meet) |

Coordinates are flipped from SVG Y-down to CAD Y-up using the root `viewBox`
(or `width`/`height`; default viewport 300×150 when omitted). SVG paint
defaults apply at leaves (`fill=#000`, `stroke=none`). Unsupported elements
are skipped (`skippedElementCount`); conversion does not fail.

## Not yet converted (roadmap)

Use this list when extending v2. Items are grouped by how much work they need.

### Elements (skipped entirely today)

| SVG | Intended CAD mapping (suggestion) |
|-----|-----------------------------------|
| `image` | `AcDbRasterImage` / attached image |
| `foreignObject` | out of scope / skip |
| `canvas` / custom elements | skip |

### Shapes with missing attributes

| Gap | Notes |
|-----|-------|
| `polyline` / `polygon` with fewer than 2 points | currently dropped |
| zero-size `rect` / `circle` / `ellipse` | currently dropped |
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
| `dominant-baseline` / alignment-baseline | always treated as baseline-ish |
| `font-family` / `font-weight` / `font-style` | not mapped to CAD text style |
| multi-line / `xml:space` | whitespace collapsed via `trim` only |
| `AcDbMText` for rich runs | currently plain `AcDbText` only |

### Fill, paint, and presentation

| Gap | Notes |
|-----|-------|
| gradients (`linearGradient` / `radialGradient`) | ignored (`url(#…)` fill skipped; may fall back to default black) |
| patterns (`pattern`) | ignored |
| `currentColor` / `inherit` / named SVG color quirks | only CSS colors that `AcCmColor.setRGBFromCss` accepts |
| presentation via `class` + `<style>` / external CSS | class selectors and stylesheets ignored; attrs + inline `style` only |
| `marker` / `marker-start` / `marker-mid` / `marker-end` | ignored |
| `vector-effect="non-scaling-stroke"` | stroke width follows CTM scale into line weight heuristically |

### Clipping, masking, filters

| Gap | Notes |
|-----|-------|
| `clipPath` / `clip-path` | ignored |
| `mask` | ignored |
| `filter` / fe* primitives | ignored |

### Structure, layers, and metadata

| Gap | Notes |
|-----|-------|
| SVG layers / `inkscape:groupmode="layer"` / `data-name` | everything goes to model space; no CAD layers |
| `id` / `data-*` → entity name / XData | not preserved |
| groups as CAD blocks / anonymous blocks | `g` is flatten-only; `use` instantiates by copy |
| `<title>` / `<desc>` / `<metadata>` | ignored |
| animation / SMIL / CSS transitions | ignored |
| hyperlink URL on `a` | children imported; URL not stored |

### Document / coordinate system

| Gap | Notes |
|-----|-------|
| full `preserveAspectRatio` variants | nested viewport uses simple uniform “meet” only |
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
| `acdbSvgModelToEntities` | Model → `AcDbEntity[]` (optional `AcDbDatabase` for dash linetypes) |

## Build

```bash
pnpm --filter @mlightcad/cad-svg-converter build
```
