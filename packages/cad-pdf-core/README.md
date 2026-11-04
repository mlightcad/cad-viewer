# @mlightcad/cad-pdf-core

Shared PDF export logic for MLightCAD: the export option model, the
MTEXT/SHAPE glyph provider, and the drawing database → PDF pipeline built on
`@mlightcad/pdf-renderer`.

> **1.8.0:** This package is new. PDF export was split out of the browser plugin
> so the same pipeline can run in the browser (`cad-pdf-plugin`) and in Node
> without a browser (`cad-pdf-exporter`). See the
> [upgrade guide](../../docs/development/upgrade-guide.md).

This package has **no** dependency on `@mlightcad/cad-simple-viewer` or the
DOM. Both consumers build on it:

- `@mlightcad/cad-pdf-plugin` — browser `cpdf` / `-cpdf` commands
- `@mlightcad/cad-pdf-exporter` — headless Node export, no browser

## Options

| Option          | Values                    | Default    |
| --------------- | ------------------------- | ---------- |
| `modelSpaceFit` | `extents` / `display`     | `extents`  |
| `exportLayouts` | `true` / `false`          | `true`     |
| `textMode`      | `text` / `vector`         | `text`     |
| `colorMode`     | `color` / `monochrome`    | `color`    |

`colorMode: 'monochrome'` writes white paper with lines, hatch patterns,
points and text in black. Solid and gradient fill areas become grey by
luminance, so light fills stay light and linework drawn over them stays
readable (pure black fills would hide it). Wipeouts still mask in white;
raster images keep their pixels.

## API

```ts
import {
  acexPdfExportDatabase,
  acexPdfResolveExportOptions
} from '@mlightcad/cad-pdf-core'

const bytes = await acexPdfExportDatabase(database, {
  ...acexPdfResolveExportOptions({ colorMode: 'monochrome' }),
  title: 'drawing',
  // Optional host services:
  // displayBox, fontMapping, glyphProvider, textFontResolver
})
```

The default glyph provider uses the `AcTrMTextRenderer` singleton from
`@mlightcad/three-renderer`. The host must initialize it before export.

## Peers

- `@mlightcad/data-model`
- `@mlightcad/mtext-parser`
- `@mlightcad/pdf-renderer`
- `@mlightcad/three-renderer`
