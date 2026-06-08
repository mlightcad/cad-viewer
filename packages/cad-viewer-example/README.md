# CAD Viewer Example

A Vue 3 demo that embeds [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-viewer): a file-upload landing screen, then the full CAD UI (menus, ribbons, dialogs, command line, status bar) for viewing and editing local DXF/DWG files.

## Features

- **Full CAD UI** — `MlCadViewer` with toolbars, layer manager, command line, dialogs, and status bar
- **Local files** — Drag-and-drop or file picker for `.dxf` / `.dwg` before entering the viewer
- **Open modes** — Read, Review, or Write access when opening a drawing
- **Internationalization** — Built-in English/Chinese UI via `vue-i18n`; host app can merge custom messages
- **Custom commands** — Example `quit` / `exit` commands return to the upload screen
- **CDN assets** — Fonts and templates loaded from [cad-data](https://github.com/mlightcad/cad-data)
- **Export plugins** — HTML (`chtml`) and PDF (`cpdf`) via lazy-loaded workspace plugins
- **E2E tests** — Playwright smoke and rendering checks against local fixtures

## Prerequisites

- Node.js **≥ 24** and pnpm **≥ 10** (monorepo workspace)
- Built dependencies before **dev** or **build**:
  - `@mlightcad/cad-html-plugin` (produces `viewer-runtime.iife.js`, copied into the example dist)
  - `@mlightcad/cad-simple-viewer` and `@mlightcad/cad-viewer` (workers and bundles)

From the repo root, a full workspace build satisfies this:

```bash
pnpm install
pnpm build
```

Or build only what this example needs:

```bash
pnpm --filter @mlightcad/cad-html-plugin build
pnpm --filter @mlightcad/cad-simple-viewer build
pnpm --filter @mlightcad/cad-viewer build
```

## Getting Started

### Development

From the monorepo root:

```bash
pnpm dev
```

Or from this package:

```bash
cd packages/cad-viewer-example
pnpm dev
```

Vite prints the local URL (default `http://localhost:5173`). In dev mode, Vite aliases `@mlightcad/cad-viewer`, `@mlightcad/cad-simple-viewer`, and renderer packages to their **source** for faster iteration.

### Production

```bash
pnpm build
pnpm preview
```

The build runs `vue-tsc`, then copies parser workers and `viewer-runtime.iife.js` into `dist/` (see `vite.config.ts`).

## Usage

1. Start the dev server and open the URL shown in the terminal.
2. On the upload screen, choose **Read**, **Review**, or **Write**, then drop or select a `.dxf` or `.dwg` file.
3. The full `MlCadViewer` UI loads with your file. Use menus, ribbons, and the command line as in a desktop CAD host.
4. Run `quit` or `exit` in the command line to close the drawing and return to the upload screen.

## Supported formats

| Format | Notes |
|--------|--------|
| **DXF** | Parsed in a Web Worker (`dxf-parser-worker.js`) |
| **DWG** | LibreDWG WebAssembly via `libredwg-parser-worker.js` |

## What this example demonstrates

Integration patterns useful when embedding `@mlightcad/cad-viewer` in your own Vue app:

| Topic | Implementation |
|-------|----------------|
| Viewer component | `<MlCadViewer :local-file="file" :mode="openMode" locale="en" base-url="…" @create="onCreate" />` |
| App bootstrap | `createApp(App).use(i18n).mount('#app')` — `i18n` exported from `@mlightcad/cad-viewer` |
| Open modes | `AcEdOpenMode` (Read / Review / Write) passed via `:mode` |
| Custom i18n | `AcApI18n.mergeLocaleMessage('en' \| 'zh', messages)` in `@create` (`src/locale/`) |
| Custom commands | `AcApDocManager.instance.commandManager.addCommand(…)` — see `quit` / `exit` in `src/commands/` |
| Upload flow | Reactive store + conditional render: upload screen until `selectedFile` is set |
| Workers & runtime | `vite-plugin-static-copy` copies DXF/DWG workers and `viewer-runtime.iife.js` |
| Export plugins | Declared in `package.json`; `@mlightcad/cad-viewer` registers them via `@mlightcad/cad-*-plugin/register` on bootstrap |

Minimal host wiring in `App.vue`:

```vue
<MlCadViewer
  locale="en"
  :local-file="store.selectedFile"
  :mode="selectedMode"
  base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
  @create="initialize"
/>
```

## Project structure

| Path | Role |
|------|------|
| `index.html` | Page shell and loading spinner |
| `src/main.ts` | Vue app entry; mounts `i18n` from `@mlightcad/cad-viewer` |
| `src/App.vue` | Upload screen + `MlCadViewer`; registers custom commands on `@create` |
| `src/components/FileUpload.vue` | Element Plus drag-and-drop uploader with open-mode selector |
| `src/store.ts` | Reactive `selectedFile` for upload ↔ viewer navigation |
| `src/locale/` | Custom command descriptions merged into viewer i18n |
| `src/commands/` | `AcApQuitCmd` — clears `selectedFile` to return to upload |
| `vite.config.ts` | `base: './'`, dev aliases, static copy of workers + HTML runtime |
| `e2e/` | Playwright tests and DXF fixtures |

## Dependencies

| Package | Role |
|---------|------|
| `@mlightcad/cad-viewer` | `MlCadViewer` component, UI, and `i18n` setup |
| `@mlightcad/cad-simple-viewer` | `AcApDocManager`, commands, `AcEdOpenMode`, `AcApI18n` |
| `@mlightcad/data-model` | Logging and CAD data types |
| `@mlightcad/cad-html-plugin` | Offline HTML export; supplies `viewer-runtime.iife.js` |
| `@mlightcad/cad-pdf-plugin` | PDF export (`cpdf`) |
| `element-plus` | Upload UI and icons (peer of `cad-viewer`) |
| `vue` / `vue-i18n` | Vue 3 host and internationalization |
| `three` | Peer of the viewer render stack |

## Scripts

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc + production build
pnpm preview          # Serve `dist/`
pnpm analyze          # Build with bundle visualizer
pnpm clean            # Remove `dist/`, `lib/`, tsbuildinfo
pnpm lint             # ESLint on `src/`
pnpm lint:fix         # ESLint with auto-fix
pnpm test:e2e         # Playwright tests (starts dev server on port 4173)
pnpm test:e2e:headed  # Playwright with browser visible
pnpm test:e2e:ui      # Playwright UI mode
```

From the monorepo root: `pnpm dev`, `pnpm preview`, `pnpm test:e2e`.

## Browser requirements

- Modern browser with **WebGL**
- **WebAssembly** for DWG
- **Web Workers** for DXF/DWG parsing and MTEXT rendering

## Related packages

- [`@mlightcad/cad-viewer`](../cad-viewer) — Component API, props, and customization
- [`cad-simple-viewer-example`](../cad-simple-viewer-example) — Minimal vanilla TypeScript host without the full Vue UI
- [`@mlightcad/cad-html-plugin`](../cad-html-plugin) — HTML export and `viewer-runtime.iife.js`
- [`@mlightcad/cad-html-exporter-cli`](../cad-html-exporter-cli) — Headless HTML export CLI

## License

MIT — see the repository root `LICENSE`.
