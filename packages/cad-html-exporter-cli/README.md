# @mlightcad/cad-html-exporter-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-html-exporter-cli.svg)](https://www.npmjs.com/package/@mlightcad/cad-html-exporter-cli)

Node.js command-line example that converts a **DXF** or **DWG** file into a **self-contained offline HTML** viewer (same pipeline as the browser **Export HTML** command).

The CLI drives a headless **Chromium** instance (Playwright) that runs the same viewer code path as `cad-simple-viewer-example`, then writes the packaged HTML to disk.

## Prerequisites

- Node.js 20+
- Network access on first run (Playwright downloads Chromium; fonts load from CDN during export)

From the monorepo root:

```bash
pnpm install
pnpm --filter @mlightcad/cad-html-exporter-cli install-browser
pnpm --filter @mlightcad/cad-html-exporter-cli build
```

## Usage

```bash
# From the package directory
node dist/cli.js path/to/drawing.dxf

# Or via the bin name (after pnpm link / workspace install)
pnpm exec cad-html-exporter path/to/drawing.dwg -o out/viewer.html

# Chinese UI in the exported HTML
pnpm exec cad-html-exporter drawing.dxf --locale zh -o drawing.html
```

### Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output HTML file (default: input name with `.html`) |
| `--locale <code>` | Embedded viewer locale (`en`, `zh`, …) |
| `--title <text>` | Title in snapshot metadata / `<title>` |
| `--no-export-invisible-layers` | Exclude off/frozen layer geometry (default: included) |
| `--initial-view <fit\|current>` | Initial view when opening HTML (`fit` = zoom extents, default) |

## How it works

1. **Vite** builds `runner/` → `dist-runner/` (viewer + workers + `viewer-runtime.iife.js`).
2. **Playwright** serves `dist-runner` locally and calls `window.exportCadToHtml()`.
3. The runner uses **AcApDocManager** → **AcApHtmlSnapshotBuilder** → **packHtml**.
4. The CLI writes the returned HTML string to `-o`.

The generated HTML opens offline in any browser; Node.js is not required to view it.

## Project layout

| Path | Role |
|------|------|
| `src/cli.ts` | Commander CLI entry |
| `src/exportToHtml.ts` | Playwright orchestration |
| `runner/` | Browser export harness (Vite input) |
| `dist-runner/` | Built runner (created by `pnpm build`) |
