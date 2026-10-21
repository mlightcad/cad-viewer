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
  When the DWG/DXF provides a drawing thumbnail (`AcDbDatabase.thumbnailImage`),
  a `preview.jpg` is written next to `viewer.html` (and included in the zip).
- `viewerMode` defaults to `measure` for both formats: measure tools and
  review markup. Pass `view` for pan, zoom, and layers only.

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
  // Optional commercial DWG parser (must install @mlightcad/dwg-converter):
  // dwgParser: 'dwg',
  // dwgLicenseKey: process.env.DWG_LICENSE_KEY
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

## Performance

Export time is two stages: convert the drawing into an ACEX snapshot, then pack
that snapshot (binary encode, gzip, and the outer zip). Convert timings cover
font setup, `worldDraw`, deferred `asyncDraw`, and snapshot capture. LibreDWG
itself stays on the caller. The techniques below are the Node exporter; the
browser plugin keeps its own codec and thread model.

A server should run **one drawing per process** (or a process pool capped by
the machine's cores). `worldDraw`, glyph `asyncDraw`, and `encodeChunkBinary`
are JavaScript on that process's main thread. A second `exportFileToHtml` in
the same process shares the thread, so it does not shorten the busy export.
Separate processes are how multiple drawings overlap.

### Native zlib

`@mlightcad/cad-html-core` compresses ACEX payloads through a pluggable gzip
codec. Importing this package installs Node `zlib` in place of the pure-JS
`fflate` codec:

- Async `gzip` runs on the libuv thread pool, so several chunk compressions
  overlap in native code.
- The monolithic single-file snapshot uses `gzipSync` on the same codec.
- Each result is copied out of the Node buffer pool before it is stored.
  `zlib` may hand back a pooled view, and a later compression would otherwise
  overwrite an earlier payload.
- After gzip, only the uncompressed byte length is kept for the manifest. The
  uncompressed buffer is discarded so several in-flight exports do not each
  hold both copies.

On a 32 MiB synthetic set, `zlib.gzipSync` was about 3× faster than
`fflate.gzipSync`. `fflate` stays the browser codec. Node is the host that can
call `zlib`.

Chunk gzip (`compressChunks`, default `true`) is separate from the outer
`.zip`. Geometry chunks are `.acex.gz` and OSNAP chunks are `.osnap.gz`. The
zip writer then:

- stores those `.gz` entries (ZIP method 0) so they are not deflated again;
- deflates text entries such as `viewer.html` and `drawing.acex.json` with
  `zlib.deflateRaw` on the libuv pool (`Z_DEFAULT_COMPRESSION`).

Node sizes that pool from `UV_THREADPOOL_SIZE` in the environment **before
the process starts** (default 4). Each process has its own pool. Leave the
default alone when several exporter processes share a machine; raising it per
process multiplies threads by the number of processes. See
[Approaches that do not pay off](#approaches-that-do-not-pay-off).

### Local font library

TEXT, MTEXT, and glyph linetypes need an initialized MText renderer and a font
loader before `worldDraw` / `asyncDraw`. Node has no THREE.FileLoader / XHR
and no IndexedDB, so the exporter:

- runs `AcTrMTextRenderer` in `main` mode (no worker URL);
- turns off `FontManager` IndexedDB caching;
- replaces the CDN loader with disk reads or `fetch`.

`fontsDir` reads faces from disk. It accepts a folder of face files, that
folder plus `fonts.json`, or a cad-data checkout (faces resolved from its
`fonts/` directory). It takes precedence over `fontsUrl`.

Without `fontsDir`, faces come from `fontsUrl` (default
`https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/`). Those downloads honor
`HTTPS_PROXY` / `HTTP_PROXY`, and on Windows the current user's Internet
Settings proxy when those variables are unset.

Fonts are loaded once, before entities are drawn:

1. Default and symbol faces from the `modern` preset.
2. Every face named by the drawing text-style table (`font`, `bigFont`,
   `extendedFont`, and the table font-file list).

`awaitFontsBeforeDraw` is on, so glyph `asyncDraw` does not wait on a
per-entity download. A missing face is logged and that mesh text is omitted.
The rest of the drawing still exports. A local library removes the CDN
round-trip from this preload, which is the usual way to keep text-heavy
exports off the network.

### Headless geometry conversion

`AcTrRenderer.createForExport` builds a renderer on a stub WebGL backend.
Geometry construction never calls `render` or a real GPU. The line-pattern
shader probe is skipped and treated as healthy, so exported pattern metadata
matches a browser GPU that passed the probe.

An entity that advertises a single batchable primitive goes through
`tryBuildDirectEntityMeta` and is appended straight into its layer
`AcTrBatchedGroup`. It never becomes a full entity that later has to be
flattened.

Everything else is `worldDraw`'d into a pending list. Glyph and INSERT
finalize (`asyncDraw`) then runs with
`max(8, min(32, availableParallelism()))` tasks in flight. A serial `await`
on that list was the main reason text-heavy drawings were slower here than on
the viewer path. Those tasks are still one process's JavaScript; the cap
bounds in-flight work, it does not add OS threads.

The browser yields during glyph draws every 32 ms so the UI can paint. The
export renderer sets `yieldDuringAsyncDraw` to false, which turns that yield
off. On a multi-building DWG this removed about 5 s of timer delay from a
~31 s `asyncDraw` (about 19,000 deferred entities). Other processes are
unaffected. Another export in the **same** process still waits on this
thread; yielding would only interleave them and add the timer delay back.

Raster textures are skipped when no DOM canvas is available. LibreDWG parsing
stays on the Node main thread: Node has neither a browser `Worker` nor a
reliable ESM-worker WASM path for that converter.

### Approaches that do not pay off

Measured on Node 24, 8 logical CPUs, one multi-building DWG (about 3.3 MiB).
Multi-file export was about 52 s end to end: ~7 s reading the DWG, ~33 s
convert (~26 s of that in `asyncDraw`), ~11 s pack, then writing a ~222 MiB
zip. Pack was 78 geometry chunks, ~571 MiB of geometry buffers, and no OSNAP
chunks. Do not reintroduce the following for this exporter.

**`worker_threads` pool for chunk encode + gzip.**
`buildAcExPackageDataAsync` already overlaps chunk gzip on the libuv pool.
Moving `encodeChunkBinary` / `encodeOsnapCatalogBinary` plus gzip onto up to
`min(8, availableParallelism())` workers did not move pack time (10.7 s with
the pool, 11.3 s on the main thread). Binary encode of every chunk summed to
~340 ms. Structured-clone of the chunk graph onto the workers cost ~410 ms.
Gzip was the pack CPU (~42 s of CPU, ~6 s wall) and was already native zlib.
Each export would also pay worker startup, and N concurrent processes would
launch N times that many workers on top of N libuv pools.

**Setting `UV_THREADPOOL_SIZE` from inside the process.**
libuv reads the variable when the process starts. Assigning
`process.env.UV_THREADPOOL_SIZE` during import does not resize the pool (Node
24: an in-process value of 16 matched the default pool of 4 on an 8×16 MiB
gzip). Setting it in the environment before startup does work, and 16 threads
beat 4 by about 1.4× on that synthetic gzip, not 4×. On the drawing above,
pack stayed ~11.4 s with the default pool of 4. A larger pool on every
concurrent exporter process oversubscribes the machine for that small gain.

**Parallelizing `encodeChunkBinary` on its own.**
It was ~340 ms of an ~11 s pack. The bytes are already walked once to build
the ACEC buffer; a second thread would need those typed arrays copied or
transferred first.

## DWG parsers

`exportFileToHtml` defaults to LibreDWG (`dwgParser: 'libredwg'`), which is a
normal dependency of this package.

To use the commercial parser instead:

1. Install `@mlightcad/dwg-converter` yourself from the private registry (it is
   **not** listed in this package's dependencies, so `pnpm i` never fetches it).
2. Pass `dwgParser: 'dwg'` and, when needed, `dwgLicenseKey`.
3. Or on the CLI: `--dwg-parser dwg --dwg-license-key <key>`.

If the package is missing, or the license/trial cannot be activated, registration
fails with an explicit error; LibreDWG remains the default path for users who
never install the commercial converter.

## Notes

- Requires Node 22+ (`crypto.subtle` for optional password protection).
- Embeds `viewer-runtime.iife.js` from `@mlightcad/cad-html-plugin` (copied at
  build time into `runtime/`).
- See [Performance](#performance) for zlib, local fonts, headless conversion,
  and approaches that were measured and rejected.
