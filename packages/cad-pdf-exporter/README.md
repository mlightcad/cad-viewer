# @mlightcad/cad-pdf-exporter

Headless (Node) export of DXF/DWG drawings to vector PDF.

> **1.8.0:** New package. Same shared pipeline as browser `cpdf`, via
> `@mlightcad/cad-pdf-core`, so server/CI export does not need Playwright or a
> browser. See the [upgrade guide](../../docs/development/upgrade-guide.md).

Uses `@mlightcad/data-model` + `@mlightcad/pdf-renderer` through
`@mlightcad/cad-pdf-core`, the same pipeline as the browser `cpdf` command in
`@mlightcad/cad-pdf-plugin`. **Does not** depend on
`@mlightcad/cad-simple-viewer` or a browser.

## Options

| Option          | Values                  | Default   | Notes |
| --------------- | ----------------------- | --------- | ----- |
| `colorMode`     | `color` / `monochrome`  | `color`   | `monochrome`: white paper, all drawing content black |
| `textMode`      | `text` / `vector`       | `text`    | `text` embeds fonts so text stays selectable |
| `exportLayouts` | `true` / `false`        | `true`    | `true`: model space and every paper-space layout, one page each |
| `title`         | string                  | file stem | PDF document title |
| `fontsDir`      | path                    | —         | Local font library (takes precedence over `fontsUrl`) |
| `fontsUrl`      | URL                     | jsDelivr  | Remote font library base URL |
| `fontMapping`   | `{ [from]: to }`        | —         | Font name substitutions |
| `dwgParser`     | `libredwg` / `dwg`      | `libredwg`| `dwg` needs the optional `@mlightcad/dwg-converter` |
| `dwgLicenseKey` | string                  | —         | License for `dwgParser: 'dwg'` |
| `drawNoPlotLayers` | `true` / `false`     | `false`   | `false`: omit no-plot layers (matches cad-editor / AutoCAD plot) |

Model space is always framed by drawable extents. A headless export has no
live view, so the plugin's `Display` framing is not offered.

In `monochrome` mode, linework and text are black and solid/gradient fills
become grey by luminance. Wipeouts still mask in white and raster images keep
their pixels. PNG and JPEG images are embedded; other raster formats (BMP,
GIF) need a browser canvas to convert, so they are skipped in Node.

## Example

After `pnpm build`, from this package:

```sh
node examples/export-pdf.mjs drawing.dwg drawing.pdf
node examples/export-pdf.mjs drawing.dwg drawing-bw.pdf --color-mode monochrome
node examples/export-pdf.mjs drawing.dwg drawing.pdf --text-mode vector --no-layouts --fonts-dir D:/cad-data
```

## API

```ts
import {
  convertDatabaseToPdf,
  exportFileToPdf
} from '@mlightcad/cad-pdf-exporter'

// File → file
await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome',
  // Local font library: a face folder, that folder with fonts.json, or a
  // cad-data checkout (faces resolved from its fonts/ directory).
  fontsDir: 'D:/code/cad-data'
})

// Already-open database → bytes
const bytes = await convertDatabaseToPdf(database, { title: 'drawing' })
```

## Fonts

Text is drawn by the same MText engine as the viewer, running on the Node
main thread. Fonts come from `fontsDir` or `fontsUrl` (by default the public
cad-data library on jsDelivr; set `HTTPS_PROXY` when the network needs a
proxy). With `textMode: 'text'`, TrueType/OpenType/WOFF faces are subset
and embedded. SHX fonts have nothing to embed, so their text is drawn as
vector glyphs.

## Related packages

- `@mlightcad/cad-pdf-core` — shared options and export pipeline
- `@mlightcad/cad-pdf-plugin` — browser `cpdf` / `-cpdf` commands
- `@mlightcad/cad-html-exporter` — the HTML counterpart of this package
