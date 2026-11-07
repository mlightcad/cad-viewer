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
| `ellipse` / non-uniform circle | closed polyline approximation |
| `path` (M/L/H/V/C/Q/A/Z/…) | polylines (curves tessellated) |
| `text` / simple `tspan` | `AcDbText` |
| nested `g` + `transform` | applied into geometry |

Ignored: filters, masks, patterns, CSS classes/stylesheets, `<use>` /
`<symbol>`, `<image>`, fill → hatch.

Coordinates are flipped from SVG Y-down to CAD Y-up using the root `viewBox`
(or `height`).

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
