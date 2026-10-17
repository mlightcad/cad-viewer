# @mlightcad/cad-html-exporter

Headless (Node) export of DXF/DWG drawings to offline HTML.

Uses `@mlightcad/data-model` + `@mlightcad/three-renderer` for geometry
conversion and `@mlightcad/cad-html-core` for ACEX packing. **Does not**
depend on `@mlightcad/cad-simple-viewer` or a browser.

## Formats

- `single` (default) — one self-contained `.html`. Small drawings embed a
  monolithic ACEX snapshot; large drawings embed progressive ACEC chunks.
  Optional password and expiry apply to this format.
- `multi` — the ACEX package (`viewer.html`, `drawing.acex.json`, and
  geometry / OSNAP chunks). By default this is one `.zip` (`zipPackage: true`).
  Set `zipPackage: false` and pass an output folder to write those files
  directly. Set `maxChunkBytes` (1–64 MiB, default 10 MiB) and `compressChunks`
  (default `true`; gzip of chunk payloads, independent of the outer zip).

## Example

After `pnpm build`, from this package:

```sh
node examples/export-html.mjs drawing.dwg drawing.html
node examples/export-html.mjs drawing.dwg drawing.zip --format multi --fonts-dir D:/cad-data
node examples/export-html.mjs drawing.dwg ./out --format multi --no-zip --fonts-dir D:/cad-data
```

## API

```ts
import {
  exportDatabaseToHtml,
  exportFileToHtml
} from '@mlightcad/cad-html-exporter'

await exportFileToHtml('drawing.dwg', 'drawing.html', {
  exportFormat: 'single',
  // Local font library: a face folder, that folder with fonts.json, or a
  // cad-data checkout (faces resolved from its fonts/ directory).
  fontsDir: 'D:/code/cad-data',
  // Or override the remote library (ignored when fontsDir is set).
  // fontsUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/'
})

await exportFileToHtml('drawing.dwg', 'drawing.zip', {
  exportFormat: 'multi',
  maxChunkBytes: 4 * 1024 * 1024,
  compressChunks: true
})

// Same package, written as files into a folder instead of a zip.
await exportFileToHtml('drawing.dwg', 'drawing-package', {
  exportFormat: 'multi',
  zipPackage: false
})
```

## Notes

- Requires Node 20+ (`crypto.subtle` for optional password protection).
- Chunk gzip and the outer zip deflate use Node `zlib` (libuv thread pool),
  which is faster than pure-JS gzip for large drawings.
- Embeds `viewer-runtime.iife.js` from `@mlightcad/cad-html-plugin` (copied at
  build time into `runtime/`).
- Raster textures are skipped when no DOM canvas is available.
- Text rendering runs on the main-thread MText renderer. Pass `fontsDir` for a
  local library, or `fontsUrl` to override the default CDN (`fonts.json` plus
  face files). THREE.FileLoader / XHR is not available in Node. CDN downloads
  honor `HTTPS_PROXY` / `HTTP_PROXY`, and on Windows the current user's
  Internet Settings proxy when those variables are unset.
