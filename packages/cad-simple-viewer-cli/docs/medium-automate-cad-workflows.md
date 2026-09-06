# Automate CAD Workflows with `cad-simple-viewer-cli`: Batch Convert DWG/DXF to PNG for AI Training

If you work with CAD drawings at scale — QA pipelines, document conversion, or machine learning datasets — opening AutoCAD for every file does not scale. You need something scriptable, headless, and easy to plug into Node.js or CI.

That is what **[`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)** is for: an AcCoreConsole-style CLI from [MLight CAD](https://mlightcad.com/) that opens DXF/DWG files (or a blank drawing), runs AutoCAD-like `.scr` scripts, and writes exports to disk — without a desktop CAD license.

You can try related viewing features in the browser at the [MLight CAD app](https://mlightcad.netlify.app/).

## What you can automate

With a short command script you can:

- Export drawings to **PNG**, **PDF**, **SVG**, offline **HTML**, or **DXF**
- Zoom extents, toggle layers, then export a clean view
- Start from a blank drawing and create geometry via script
- Batch-process folders of DWG/DXF files from Node.js or shell

This article focuses on a common ML use case: **turn a folder of CAD files into PNG images** so you can train models that detect entities, symbols, or layout regions in drawings.

## Why PNG from CAD matters for AI

CAD files are structured (layers, entity types, coordinates). Many vision models still need raster images:

- Object detection for doors, windows, title blocks, dimension text
- Classification of drawing types (plan / elevation / schematic)
- Layout understanding and OCR over rendered text

Manually exporting hundreds of drawings is slow and inconsistent. A headless CLI gives you **repeatable resolution, zoom, and naming** — which is what dataset pipelines need.

## Install

Requires **Node.js 20+**. The CLI uses headless Chromium via Playwright.

```bash
npm install -g @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

Or as a project dependency:

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

## One-file quick start: DWG → PNG

Create `export-png.scr` (or use the sample shipped with the package):

```
; Zoom extents, then export PNG (long side 2048px)
zoom
e
pngout

2048
quit
```

Script rules are simple: command name on its own line, answers on following lines, empty line = Enter/default, `;` for comments, `quit` to exit.

Run:

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out
```

Or with `npx`:

```bash
npx cad-simple-viewer-cli -i ./drawing.dxf -s ./export-png.scr -o ./out
```

Remote files work too:

```bash
cad-simple-viewer-cli \
  -i https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg \
  -s ./export-png.scr \
  -o ./out
```

Useful flags:

| Option | Meaning |
|--------|---------|
| `-i` | Local `.dxf` / `.dwg` or `http(s)` URL (omit for blank drawing) |
| `-s` | `.scr` script (**required**) |
| `-o` | Output directory for downloads |
| `--mode read\|write` | Open mode (`write` needed for layer edits) |
| `--locale` | Prompt locale (`en`, `zh`, …) |
| `--logfile` | Append run logs |

If you have used AutoCAD’s AcCoreConsole:

`accoreconsole /i drawing.dwg /s script.scr`  
≈ `cad-simple-viewer-cli -i drawing.dwg -s script.scr`

## Batch example: folder of DWG/DXF → PNG dataset

This is the workflow most people need for AI training.

### Option A — use the shipped batch helper

After install, examples live under:

`node_modules/@mlightcad/cad-simple-viewer-cli/examples/`

```bash
node node_modules/@mlightcad/cad-simple-viewer-cli/examples/batch-export-png.mjs ./drawings ./out-png
```

The helper:

1. Recursively finds `.dwg` / `.dxf` under `./drawings`
2. Runs the CLI + `export-png.scr` for each file
3. Writes PNGs into `./out-png`
4. Reports success / failure counts

Typical layout:

```text
drawings/
  floor-01.dwg
  floor-02.dxf
  archive/
    detail-a.dwg
out-png/
  floor-01.png
  floor-02.png
  detail-a.png
```

### Option B — shell loop (simple CI-friendly)

```bash
mkdir -p out-png
for f in drawings/*.{dwg,dxf}; do
  [ -e "$f" ] || continue
  cad-simple-viewer-cli -i "$f" -s ./export-png.scr -o ./out-png
done
```

### Option C — programmatic API

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const inputDir = './drawings'
const outputDir = './out-png'
const scriptPath = './export-png.scr'

for (const name of await readdir(inputDir)) {
  const ext = path.extname(name).toLowerCase()
  if (ext !== '.dwg' && ext !== '.dxf') continue

  const { savedFiles } = await runHeadless({
    inputPath: path.join(inputDir, name),
    scriptPath,
    outputDir,
    mode: 'read'
  })
  console.log(name, '→', savedFiles)
}
```

Use this when you need retries, parallel pools, metadata sidecars, or integration with labeling tools.

## Tips for cleaner ML datasets

**1. Fixed long-side resolution**  
`pngout` + `2048` keeps scale consistent across sheets. Change the number if your model prefers another size.

**2. Zoom extents first**  
Always `zoom` → `e` before export so the frame is content-driven, not leftover viewport noise.

**3. Hide noisy layers before export**  
For symbol detection you may want dimensions or hatches off. Use `--mode write` and a layer script:

```
; freeze-layer-png.scr — replace LAYER_NAME
-layer
Off
LAYER_NAME

zoom
e
pngout

2048
quit
```

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./freeze-layer-png.scr \
  -o ./out \
  --mode write
```

**4. Keep source filenames**  
Batch helpers preserve drawing basenames so labels can map `floor-01.png` ↔ `floor-01.dwg`.

**5. Log failures**  
Add `--logfile ./cli.log` in CI so bad files do not fail silently.

## Beyond PNG: more automation scripts

Same CLI, different `.scr` files (samples ship with the package):

| Script | Use |
|--------|-----|
| `export-png.scr` | Zoom extents → PNG |
| `export-html.scr` | Offline HTML (`-chtml`) |
| `export-html-multi.scr` | Multi-file ACEX package zip (`-chtml` Multi) |
| `export-dxf.scr` | DXF download |
| `create-drawing-dxf.scr` | Blank drawing + LINE → DXF |
| `create-shapes-dxf.scr` | LINE + CIRCLE → DXF |
| `batch-export-html.mjs` | Folder → HTML |

Useful commands include `zoom`, `pngout`, `cdxf`, `-chtml`, `chtml`, `cpdf`, `csvg`, `-layer`, `qnew`, `line`, `circle`, and more.

Example — generate a drawing without an input file:

```bash
cad-simple-viewer-cli -s ./create-drawing-dxf.scr -o ./out --mode write
```

That pattern is handy for synthetic training data or smoke tests.

## Where this fits in your stack

A practical pipeline looks like:

1. Collect DWG/DXF into `drawings/`
2. Batch-export PNGs with `cad-simple-viewer-cli`
3. Label images (or derive labels from CAD metadata when available)
4. Train / evaluate your vision model
5. Re-run export when drawings update — same scripts, same settings

Because everything is CLI + Node API, it slots into GitHub Actions, local dataset builders, or internal conversion services without installing AutoCAD on every machine.

## Try it

- **CLI on npm:** [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)
- **Interactive viewer:** [https://mlightcad.netlify.app/](https://mlightcad.netlify.app/)
- **Product home:** [https://mlightcad.com/](https://mlightcad.com/)
- **Source:** [github.com/mlightcad/cad-viewer](https://github.com/mlightcad/cad-viewer) (`packages/cad-simple-viewer-cli`)

If your next bottleneck is “I have a thousand drawings and need consistent renders,” start with `export-png.scr` on one file, then switch to `batch-export-png.mjs` for the whole folder. That alone is often enough to bootstrap an AI training set from real CAD data.
