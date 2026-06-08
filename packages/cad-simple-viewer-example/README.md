# CAD Simple Viewer Example

A vanilla TypeScript demo that shows how to embed [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) in a web page: open DXF/DWG files, drive viewer commands from a small toolbar, and lazy-load HTML/PDF export plugins.

## Features

- **Local files** — Open `.dxf` / `.dwg` via file picker (toolbar **Open** or center **Open File**)
- **Sample drawings** — Sidebar loads predefined files from the [cad-data](https://github.com/mlightcad/cad-data) CDN
- **Viewer toolbar** — Zoom fit, zoom window, background toggle, pickbox size, line-weight display, export HTML/PDF
- **Lazy plugins** — registered from `@mlightcad/cad-*-plugin/register` in `src/register.ts`; `chtml` / `cpdf` / `csvg` load plugin chunks on demand
- **Browser-only** — Parsing and rendering run in the browser (Web Workers + WebAssembly for DWG)
- **Responsive layout** — Sidebar + viewer pane; stacks vertically on narrow screens

## Prerequisites

- Node.js **≥ 24** and pnpm **≥ 10** (monorepo workspace)
- Built dependencies before **dev** or **build**:
  - `@mlightcad/cad-simple-viewer`
  - `@mlightcad/cad-html-plugin` (produces `viewer-runtime.iife.js`, copied into the example dist)

From the repo root, a full workspace build satisfies this:

```bash
pnpm install
pnpm build
```

Or build only what this example needs:

```bash
pnpm --filter @mlightcad/cad-simple-viewer build
pnpm --filter @mlightcad/cad-html-plugin build
```

## Getting Started

### Development

From the monorepo root:

```bash
pnpm dev:simple
```

Or from this package:

```bash
cd packages/cad-simple-viewer-example
pnpm dev
```

Vite prints the local URL (default `http://localhost:5173`).

### Production

```bash
pnpm build
pnpm preview
```

The build copies parser workers and `viewer-runtime.iife.js` into `dist/` (see `vite.config.ts`).

## Usage

1. Start the dev server and open the URL shown in the terminal.
2. **Predefined files** — Click a name in the left sidebar to load a sample from the CDN.
3. **Your own file** — Click **Open File** (empty state) or **Open** (toolbar), then choose a `.dxf` or `.dwg` file.
4. After a drawing loads, use the toolbar:
   - **Zoom Fit** / **Zoom to Window** — `ZOOM` commands
   - **Switch BG** — Toggle drawing background
   - **Set Pickbox** — Prompt to set `PICKBOX` system variable
   - **LineWeight: On/Off** — Toggle `lwdisplay` on the current database
   - **Export HTML** / **Export PDF** — Run `chtml` / `cpdf` (plugins must be registered; see `src/main.ts`)

Toast messages at the top report success or errors. The window title updates when a document is activated.

## Supported formats

| Format | Notes |
|--------|--------|
| **DXF** | Parsed in a Web Worker (`dxf-parser-worker.js`) |
| **DWG** | LibreDWG WebAssembly via `libredwg-parser-worker.js` |

## What this example demonstrates

Integration patterns useful when building your own host app (not a full CAD UI like `@mlightcad/cad-viewer`):

| Topic | Implementation |
|-------|----------------|
| Document manager | `AcApDocManager.createInstance({ container, baseUrl, webworkerFileUrls, commandAliases, … })` |
| Local open | `openDocument(name, ArrayBuffer, options)` with `AcApOpenDatabaseOptions` |
| Remote open | `openUrl(url, options)` for CDN sample files |
| Commands | `sendStringToExecute('zoom\\nall')`, `switchbg`, plugin commands `chtml` / `cpdf` |
| System variables | `AcDbSysVarManager` + `sendStringToExecute` (e.g. `PICKBOX`) |
| Plugins | Lazy registration via `@mlightcad/*/register` in `src/register.ts` (only needed plugins) |
| Command aliases | Demo overrides (`LINE` → `LX`, etc.) via `commandAliases` |
| Workers & assets | `webworkerFileUrls`, `htmlViewerRuntimeUrl`, static copy in Vite |

Lazy initialization: `AcApDocManager` is created on first file open, not at page load.

## Project structure

| Path | Role |
|------|------|
| `index.html` | Layout: sidebar, toolbar, canvas container, styles |
| `src/main.ts` | `CadViewerApp` — wiring UI to `AcApDocManager` |
| `src/register.ts` | Registers export plugins from `@mlightcad/cad-*-plugin/register` |
| `vite.config.ts` | `base: './'`, copies workers + `viewer-runtime.iife.js` |
| `package.json` | Scripts and workspace dependencies |

## Dependencies

| Package | Role |
|---------|------|
| `@mlightcad/cad-simple-viewer` | Core viewer, `AcApDocManager`, commands |
| `@mlightcad/data-model` | Database, system variables, logging |
| `@mlightcad/cad-html-plugin` | Offline HTML export (`chtml`) |
| `@mlightcad/cad-pdf-plugin` | PDF export (`cpdf`) |
| `three` | Peer of the viewer render stack |

## Scripts

```bash
pnpm dev          # Vite dev server
pnpm build        # Typecheck + production build
pnpm preview      # Serve `dist/`
pnpm clean        # Remove `dist/`, `lib/`, tsbuildinfo
pnpm lint         # ESLint on `src/`
pnpm lint:fix     # ESLint with auto-fix
```

From the monorepo root: `pnpm dev:simple`, `pnpm preview:simple`.

## Browser requirements

- Modern browser with **WebGL**
- **WebAssembly** for DWG
- **Web Workers** for DXF/DWG parsing and MTEXT rendering

## Related packages

- [`@mlightcad/cad-viewer`](../cad-viewer) + [`cad-viewer-example`](../cad-viewer-example) — Full Vue UI, i18n, ribbons, dialogs
- [`@mlightcad/cad-html-plugin`](../cad-html-plugin) — HTML export details and `viewer-runtime.iife.js`
- [`@mlightcad/cad-html-exporter-cli`](../cad-html-exporter-cli) — Headless HTML export (same viewer path as this example)

## License

MIT — see the repository root `LICENSE`.
