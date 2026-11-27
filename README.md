# MLightCAD

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD is `the first web-based DXF/DWG viewing, comparison, and editing platform in the world that operates entirely in browser, without relying on any backend services`.
By performing DWG/DXF parsing, geometry processing, and rendering directly in the browser, MLightCAD enables true serverless CAD viewing and editing, ideal for cloud apps, offline usage, and privacy-sensitive workflows.

MLightCAD is more than a CAD viewer—it is a **browser-native CAD infrastructure** that ships three ready-to-use products on one engine:

| Sub-project | What it does | Package |
| --- | --- | --- |
| **CAD Viewer** | View and review: open DWG/DXF, pan/zoom, measure, annotate; also usable as an SDK inside your own product | [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) |
| **CAD Diff Viewer** | Compare drawing revisions side by side or as an overlay—gray unchanged, red deleted, green added—and generate revision clouds from change sets | [`@mlightcad/cad-diff-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-diff-viewer) |
| **CAD Editor** | Edit and draw: AutoCAD-style menus, ribbon, command line, and status bar; open a drawing and modify geometry directly | [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) |

All three share the same entity model, rendering engine, and plugin bus. UI, export, and AI capabilities load on demand instead of being reimplemented—viewing, comparing, and editing are different product forms of one CAD kernel, not unrelated tools.

On top of that, MLightCAD offers something you will rarely find in other CAD software—**one-click export to a single, self-contained HTML file**. The downloaded `.html` embeds the drawing snapshot and a lightweight viewer runtime, so recipients can open, pan, zoom, toggle layers, and measure distances in any modern browser with **no CAD app, no server, and no install**. Most desktop and web CAD tools only let you view inside their own product; MLightCAD turns a live drawing into a portable, offline artifact you can email, archive, or drop on a static file host—ideal for sharing with clients, compliance archives, and air-gapped workflows. The offline viewer also uses far less memory than traditional desktop tools when opening the same drawing (see [memory comparison](#self-contained-html-memory-usage) below).

MLightCAD also supports **server-side prerendering**. The drawing is parsed and processed once on the server, and the client simply displays the prerendered result instead of re-parsing the DWG/DXF and rebuilding geometry itself. This keeps client-side memory usage very low and makes the second and subsequent opens of the same drawing much faster—an approach particularly well suited to viewing drawings on mobile devices.

- [**🌐 Home Page**](https://mlightcad.com/)
- **🌐 Live Demo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API Docs**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versioned) · [MCP Server](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Apps Built with MLightCAD

The [Thingraph](https://cad.thingraph.site/) team builds production DWG/DXF viewers and platform integrations on top of MLightCAD, serving tens of thousands of users worldwide:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — Browser-based DWG/DXF viewer used by engineering teams worldwide for fast, serverless drawing access. Install for your platform:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — open DWG/DXF from Drive with **Open with**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — custom read-only editor for `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — same extension via Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — embed DWG/DXF previews on pages
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — thumbnail and preview in File Explorer

Community apps & integrations:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — Production-oriented browser CAD viewer for DWG, DXF, DWF, DWFx and XPS ([live demo](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — Native Nextcloud app for viewing DWG/DXF in the browser ([App Store](https://apps.nextcloud.com/apps/cad_viewer))

Official desktop app:

- [MLightCAD Studio](https://github.com/mlightcad/mlightcad-studio) — the official desktop edition of MLightCAD, wrapping [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) in a [Tauri 2](https://v2.tauri.app/) shell and running fully offline; installers are available for Windows (NSIS / MSI), Linux (AppImage / deb), and macOS (Universal DMG, Apple Silicon + Intel)—[download here](https://github.com/mlightcad/mlightcad-studio/releases/).

### Demo Apps

Official sample apps that show how to integrate MLightCAD into your own product:

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — Minimal vanilla TypeScript host for [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer): open local or CDN DXF/DWG, drive commands from a small toolbar, and lazy-load HTML/PDF/SVG export plugins without the full Vue UI.
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — Full-featured Vue 3 app built on [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) with menus, ribbons, dialogs, command line, and status bar ([live demo](https://mlightcad.github.io/cad-viewer-example/)).
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Next.js “CAD drive” demo: chunked resumable DWG/DXF upload, SQLite-backed file list with preview thumbnails, and open drawings either with **live browser parse** (`cad-simple-viewer`) or **server-side ACEX prerender** (faster load, lower memory).

![MLightCAD Quick Demo](./assets/cad-viewer.gif)

## Features

- **High-performance** viewing of large DWG/DXF files with smooth 60+ FPS rendering
- **No backend required** - Files are parsed and processed entirely in the browser
- **Enhanced data security** - Files never leave your device, ensuring complete privacy
- **Easy integration** - No server setup or backend infrastructure needed
- Modular architecture for seamless third-party integration
- **Plugin system** — Extensible plugin architecture with official plugins for UI, AI assistant, and HTML/PDF/SVG export; see the [Plugin System guide](https://mlightcad.com/cad-viewer/docs/development/plugin-system.html)
- **Mobile layout & touch** — Responsive phone/tablet UI and touch gestures (pinch-to-zoom, single-finger pan, tap to select) built into `@mlightcad/cad-simple-viewer`, so mobile browsers work without a separate app
- **Export to offline HTML** — Export the current drawing as one self-contained `.html` file with an embedded viewer (pan/zoom, zoom extents, layers, distance measure, EN/ZH UI). Opens offline in any browser; no MLightCAD instance or backend required.
- Offline and online editing workflows
- THREE.js 3D rendering engines with advanced optimization techniques
- Designed for extensibility and integration with platforms like CMS, Notion, and WeChat

- **Clear layered architecture** — model → rendering → view → UI / plugins, where lower-level packages never depend on higher-level ones, plus separately deployable headless exporters and a CLI; see the [Architecture Overview](https://mlightcad.com/cad-viewer/docs/development/architecture-overview.html)

## AI Capabilities

MLightCAD ships with a built-in set of AI-oriented CAD capabilities. Scripts and tool calls all run locally, so your drawing data never leaves your machine.

### CAD Scripts
- A sandboxed JavaScript script runtime that queries entities, draws, modifies, measures, and exports through a unified `cad.*` host API
- A single script can filter, measure, modify, and self-check in one call, avoiding heavy tool round-trips and token consumption
- AST validation before execution: `import`, `eval`, network and page access are blocked, with step/time budgets and a snapshot count cap
- A script console lets you hand-write and run scripts directly without any model involved; scripts can export to DXF / PDF / HTML and other formats

### AI Agent
- A natural-language conversation panel: describe what you need, and the model writes and runs `cad.*` scripts to draw, query, and edit
- Built on the Vercel AI SDK; models and API keys are configured in a unified AI model settings panel
- Two reasoning modes, Simple and High; in High mode the agent takes a screenshot after complex tasks and performs a visual check

### MCP
- Exposes the same script tool catalog as a stdio MCP server through `@mlightcad/cad-mcp-server` to external AI clients (e.g. Claude Desktop, Cursor)
- External assistants can open drawings, query entities, run scripts, and save results — with the same capabilities as the built-in agent

### Smart Blocks
- Automatically finds all identical copies of the selected objects and converts them into block references
- Finds repeated objects across the entire drawing and batch-converts them into blocks
- Copies that differ only in text (e.g. room numbers) can be turned into block attributes automatically, with a configurable minimum-benefit threshold

### PDF Drawing Recovery
- Imports vector geometry from PDF pages and rebuilds real CAD entities — circles/arcs/ellipses/splines, polylines with bulge, line weights and dashed linetypes, text styles, solid and hatch fills, and images; repeatedly drawn Form XObjects are restored as block references automatically
- Calibrates the scale of the imported drawing using a known distance
- Recognizes text that has been exploded into lines back into CAD text entities: an on-board glyph dictionary handles local recognition first, and the rest is batch-recognized by OCR / a vision model
- Recovers linear, radius, diameter, and angular dimensions from arrows, dimension lines, and text, with a review panel to confirm values and select or create a dimension style

## Embed DWG/DXF with One Line of Code

Add DWG/DXF viewing to any website with a single `<iframe>`—no CAD backend, no uploading drawings to a third-party cloud. The file is fetched from **your** URL and parsed entirely in the visitor’s browser, with review tools (pan, zoom, measure, annotate) ready out of the box.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1"
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

Walkthrough and live playground: [Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Installation

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Development

```bash
# Start the full-featured viewer (cad-viewer)
pnpm dev

# Or start the simple viewer
pnpm dev:simple

# Or start the drawing comparison viewer (cad-diff-viewer)
pnpm dev:diff
```

### Build

```bash
pnpm build
```

### Preview

```bash
# Preview the full-featured viewer
pnpm preview

# Preview the simple viewer
pnpm preview:simple
```

## How to Use

New to MLightCAD? The **[User Guide](https://mlightcad.com/cad-viewer/docs/)** provides step-by-step instructions for the viewer interface, desktop and touch operations, markup, and measurement tools.

### Desktop Browser Operations
- **Select**: Left-click on entities
- **Zoom in/out**: Scroll mouse wheel up/down
- **Pan**: Hold middle mouse button and drag
- **Erase**: Select entities and press `Del` key

### Pad/Mobile Browser Operations
- **Select**: Tap on entities
- **Zoom**: Pinch with two fingers
- **Pan**: Single-finger drag

## Performance

MLightCAD is engineered for **exceptional performance** and can handle very large DXF/DWG files while maintaining high frame rates. It employs multiple advanced rendering technologies to optimize performance:

- **Custom Shader Materials**: Uses GPU-accelerated shader materials to render complex line types and hatch fill patterns efficiently
- **Geometry Batching**: Merges points, lines, and areas with the same material to dramatically reduce draw calls
- **Instanced Rendering**: Optimizes rendering of repeated geometries through instancing techniques
- **Buffer Geometry Optimization**: Efficient memory management and geometry merging for reduced GPU overhead
- **Material Caching**: Reuses materials across similar entities to minimize state changes
- **WebGL Optimization**: Leverages modern WebGL features for hardware-accelerated rendering

These optimizations enable MLightCAD to smoothly render complex CAD drawings with thousands of entities while maintaining responsive user interactions.

#### Self-contained HTML memory usage

When opening the sample drawing [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg), memory consumption is roughly:

| Viewer | Memory consumption |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| Self-contained HTML (measure mode) | 56 MB |
| Self-contained HTML (view mode) | 33 MB |

The offline HTML viewer uses about **83% less memory than AutoCAD 2020** and about **77% less than GstarCAD Viewer** in view mode, while still supporting pan/zoom, layer toggle, and distance measurement (measure mode).

## Known Issues

The default open-source DWG path is based on [LibreDWG](https://github.com/LibreDWG/libredwg) via the optional `@mlightcad/libredwg-converter` package. It works well for many drawings, but its entity coverage is still limited, the WASM bundle is much larger, startup is slower, memory usage is high, and very large DWG files may hit out-of-memory errors. It also introduces GPL licensing considerations for commercial closed-source products. `@mlightcad/cad-simple-viewer` does **not** depend on or register that converter by default — host apps (see the example packages) opt in explicitly.

If you need better compatibility, lower memory usage, large-file support, or a cleaner commercial licensing story, see our [**proprietary DWG parser**](./PROPRIETARY-PARSER.md).

| Item | LibreDWG-based parser | Proprietary DWG parser |
|------|------------------------|------------------------|
| Supported entities | Limited coverage | Broader coverage |
| Bundle size | ~13 MB | ~437 KB |
| Load speed | Slower startup | Much faster startup |
| Memory usage | Higher | Lower |
| Large DWG files | May OOM on large files | No such issue |
| License | GPL propagation risk | No GPL propagation issue |

## Roadmap

MLightCAD's goal is a full-featured, modular, framework-agnostic 2D CAD system in the browser—viewing, comparing, and editing on the same kernel.

The roadmap lives in the Wiki. It covers the platform work still in progress (LOD rendering, named views, custom entities, and more) as well as the AI directions we are pushing on (drawing understanding, automated review, scanned-drawing recognition, verified natural-language editing, and more):

→ **[Roadmap (Wiki)](https://github.com/mlightcad/cad-viewer/wiki/Roadmap)**

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or suggestions. For bug reports, providing a link to the problematic drawing will help in reproducing and fixing the issue.

## License

The MLightCAD monorepo is primarily [MIT](LICENSE) licensed.

DXF loading uses the built-in MIT parser in `@mlightcad/data-model`. DWG loading is **opt-in**: `@mlightcad/cad-simple-viewer` does not depend on GPL LibreDWG packages. Hosts that want open-source DWG support add `@mlightcad/libredwg-converter` (GPL-3.0) themselves, deploy its worker + wasm, and register the converter. If you ship a closed-source product and cannot distribute GPL code to your customers, use the [**proprietary DWG parser**](./PROPRIETARY-PARSER.md) instead.

→ **Commercial parser:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (scope, licensing, pricing, integration, GPL compliance, support)
