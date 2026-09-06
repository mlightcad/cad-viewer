# @mlightcad/cad-simple-viewer-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-simple-viewer-cli.svg)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli)

AcCoreConsole-style **headless** CLI for MLight CAD Viewer. Install from npm, open a DXF/DWG (or start blank), run an AutoCAD-like **`.scr` command script**, and save exports (`pngout`, `-chtml`, `cdxf`, …) to disk.

Requires **Node.js 20+**. The CLI uses headless Chromium via Playwright; on first use you must install the browser once.

## Install

```bash
npm install -g @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

Or as a project dependency:

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

## Quick start

```bash
# Export a drawing to PNG (sample script shipped with the package)
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-png.scr \
  -o ./out

# Global install: same, with your own script
cad-simple-viewer-cli -i ./drawing.dxf -s ./export-png.scr -o ./out

# Open from URL
cad-simple-viewer-cli \
  -i https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg \
  -s ./export-png.scr \
  -o ./out

# No input file: start from a blank ISO drawing (write mode)
cad-simple-viewer-cli -s ./create-drawing-dxf.scr -o ./out --mode write
```

With a local install, use `npx`:

```bash
npx cad-simple-viewer-cli -i ./drawing.dwg -s ./export-png.scr -o ./out
```

## Options

| Option | Description |
|--------|-------------|
| `-i, --input <file-or-url>` | Local `.dxf` / `.dwg` path or `http(s)` URL. Omit to start from a blank ISO template |
| `-s, --script <file>` | `.scr` command script (**required**) |
| `-o, --output <dir>` | Directory for downloaded exports (default: input file’s directory, or cwd when no `-i`) |
| `--mode <read\|write>` | Document open mode (default: `read` with `-i`, `write` without `-i`) |
| `--locale <code>` | Prompt/keyword locale (`en`, `zh`, …) |
| `--logfile <path>` | Append start / finish / download log lines |

## AcCoreConsole mapping

| AcCoreConsole | cad-simple-viewer-cli |
|---------------|------------------------|
| `accoreconsole /i drawing.dwg /s script.scr` | `cad-simple-viewer-cli -i drawing.dwg -s script.scr` |
| `/i` | `-i, --input` (optional path or URL) |
| `/s` | `-s, --script` |
| plot / export path | `-o, --output` (download directory) |

## Script format

1. First non-blank line of each command is the **command name**
2. Following lines answer prompts (empty line = Enter / default / None)
3. Full-line `;` comments are ignored
4. `QUIT` / `EXIT` ends the script

Example — zoom extents, then PNG (long side 2048):

```
; export-png.scr
zoom
e
pngout

2048
quit
```

Useful commands (non-exhaustive): `zoom`, `pngout`, `cdxf`, `-chtml`, `chtml`, `cpdf`, `csvg`, `-layer`, `qnew`, `line`, `circle`, …

Layer edits need `--mode write`. Export commands write files via browser download; the CLI captures them into `-o`.

## Sample scripts

After install, examples live under `node_modules/@mlightcad/cad-simple-viewer-cli/examples/` (or the global package folder):

| Script | Purpose |
|--------|---------|
| `export-png.scr` | Zoom extents → PNG |
| `export-html.scr` | Offline HTML (`-chtml`) |
| `export-html-multi.scr` | Multi-file ACEX package zip (`-chtml` Multi) |
| `export-dxf.scr` | DXF download (`cdxf`) |
| `create-drawing-dxf.scr` | Blank drawing + LINE → DXF (no `-i`) |
| `create-shapes-dxf.scr` | Blank drawing + LINE + CIRCLE → DXF |
| `create-drawing-png.scr` | Blank drawing → PNG |
| `freeze-layer-png.scr` | `-layer` Off then PNG (`--mode write`; edit `LAYER_NAME`) |
| `batch-export-png.mjs` | Scan a folder of drawings → PNG |
| `batch-export-html.mjs` | Scan a folder → HTML |

Batch helpers (from your project after `npm install -D`):

```bash
node node_modules/@mlightcad/cad-simple-viewer-cli/examples/batch-export-png.mjs ./drawings ./out-png
node node_modules/@mlightcad/cad-simple-viewer-cli/examples/batch-export-html.mjs ./drawings ./out-html
```

## Programmatic API

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawing.dwg',   // optional; omit for blank drawing
  scriptPath: './export-png.scr',
  outputDir: './out',
  mode: 'read',                 // optional
  locale: 'en',                 // optional
  logfile: './cli.log'          // optional
})

console.log(outputDir, savedFiles)
```

## How it works

1. The published package includes a prebuilt Playwright runner (`dist-runner/`).
2. The CLI starts headless Chromium, opens the drawing (or a blank template), waits for entity convert / deferred text geometry, then runs `AcApDocManager.runScript()`.
3. Export commands trigger downloads; the CLI writes captured files under `-o`.
