# MLightCAD

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD is `the first web-based DXF/DWG viewer and editor in the world that operates entirely in browser, without relying on any backend services`.
By performing DWG/DXF parsing, geometry processing, and rendering directly in the browser, MLightCAD enables true serverless CAD viewing and editing, ideal for cloud apps, offline usage, and privacy-sensitive workflows.

It also offers something you will rarely find in other CAD viewers—**one-click export to a single, self-contained HTML file**. The downloaded `.html` embeds the drawing snapshot and a lightweight viewer runtime, so recipients can open, pan, zoom, toggle layers, and measure distances in any modern browser with **no CAD app, no server, and no install**. Most desktop and web CAD viewers only let you view inside their own product; MLightCAD turns a live drawing into a portable, offline artifact you can email, archive, or drop on a static file host—ideal for sharing with clients, compliance archives, and air-gapped workflows. The offline viewer also uses far less memory than traditional desktop tools when opening the same drawing (see [memory comparison](#self-contained-html-memory-usage) below).

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

Community Linux desktop packages:

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — Electron-based AppImage for Linux (~114 MB), tested on Fedora
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — Arch Linux source package using system Electron (~5.4 MB)
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — Arch Linux binary package with bundled fonts/templates for fully offline drawing open

### Demo Apps

Official sample apps that show how to integrate MLightCAD into your own product:

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — Minimal vanilla TypeScript host for [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer): open local or CDN DXF/DWG, drive commands from a small toolbar, and lazy-load HTML/PDF/SVG export plugins without the full Vue UI.
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — Full-featured Vue 3 app built on [`@mlightcad/cad-viewer`](https://www.npmjs.com/package/@mlightcad/cad-viewer) with menus, ribbons, dialogs, command line, and status bar ([live demo](https://mlightcad.github.io/cad-viewer-example/)).
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

The goal of this project is to create a full-featured **2D AutoCAD-like system in the browser** (viewer + editor), with modular architecture and framework-agnostic integration.

Legend:
- [x] Completed
- [ ] Planned
- [ ] ⏳ In progress

### Core File & Data Layer

#### File Support

* [x] DXF loading
* [x] DWG loading
* [x] Export to self-contained offline HTML (embedded viewer)
* [x] Large file streaming / incremental loading
* [ ] ⏳ File version compatibility (R12–Latest)

#### Data Model

* [x] Unified entity data model
* [x] Layer table support
* [x] Block / insert structure
* [ ] ⏳ Handle & object ID management: currently objectId is same as handle and represented as one string instead of bigint (int64).
* [ ] ⏳ XData / extension dictionary support
* [ ] Proxy entity handling

### Rendering & Performance

#### Rendering Engine

* [x] WebGL-based rendering (Three.js)
* [x] 2D-only optimized pipeline
* [x] Layer-based scene organization
* [x] Layout / paper space rendering
* [ ] Viewport entity support

#### Performance Optimization

* [x] Geometry merging & batching
* [x] Spatial indexing (basic)
* [x] Advanced spatial index (R-tree / BVH)
* [ ] Level-of-detail (LOD) rendering
* [ ] Multi-canvas / tiled rendering for very large drawings

### Viewing & Navigation

#### View Controls

* [x] Pan
* [x] Zoom (wheel / box zoom)
* [x] Fit to view / extents
* [ ] Named views
* [ ] View history (undo / redo view changes)

#### Display Controls

* [x] Layer visibility on/off
* [x] Layer freeze / lock
* [x] Lineweight display
* [ ] Linetype scaling
* [x] Background / theme switching

### Selection & Interaction

#### Selection

* [x] Single entity selection
* [x] Highlight selected entities
* [x] Window selection
* [x] Crossing selection
* [x] Selection filters (by type / layer)
* [x] Selection cycling

#### Snapping (OSNAP)

* [x] Endpoint
* [x] Midpoint
* [x] Center
* [x] Intersection
* [ ] Perpendicular / tangent
* [x] Nearest
* [ ] Snap tracking


### Editing & Modification

#### Basic Editing

* [x] Entity editing framework
* [x] Move
* [x] Copy
* [x] Rotate
* [ ] Scale
* [x] Delete
* [x] Undo / redo

#### Geometry Editing

* [x] Grip points
* [ ] Stretch
* [ ] Trim
* [ ] Extend
* [x] Offset
* [ ] Explode
* [ ] Join / fillet / chamfer (2D)

### Drawing & Creation Tools

#### Basic Entities

* [x] Line
* [x] Polyline
* [x] Spline
* [x] Circle
* [x] Arc
* [x] Ellipse
* [x] Rectangle / polygon

#### Advanced Entities

* [x] Hatch
* [ ] Text (single-line / multi-line)
* [ ] Dimensions (linear, aligned, angular)
* [ ] Blocks creation & insertion

### Measurement

* [x] Distance
* [x] Arc length
* [x] Area
* [x] Angle
* [ ] Coordinate
* [ ] Entity statistics (length, area, count)

### Dimension

* [x] Linear dimension
* [ ] Angle dimension
* [ ] Coordinate

### Properties & UI Panels

#### Property Palette

* [x] Selected entity properties
* [ ] Layer, color, linetype editing
* [x] Live update on change

#### Panels & UI

* [x] Layer manager
* [ ] Block manager
* [x] Command history / console
* [x] Status bar (snap, ortho, grid)

#### Command System

* [x] Command registry
* [x] Command aliases
* [x] Command prompts (AutoCAD-style)

### Integration & Extensibility

#### Framework Integration

* [x] Framework-agnostic core
* [ ] React integration example
* [x] Vue integration example
* [ ] OpenLayers / Map integration
* [ ] CMS / Notion embedding

#### Plugin System

* [x] Plugin API
* [ ] Custom entity support
* [x] Custom command

### Offline & Online Editing

#### Offline Editor

* [x] Local editing in browser
* [x] Save to DXF
* [ ] Save change set / diff
* [ ] IndexedDB persistence

#### Online Editor

* [ ] Backend API design
* [ ] User authentication
* [ ] File versioning
* [ ] Multi-user access control
* [ ] Real-time collaboration (future)

### Platform Targets

* [x] Google Drive Integration (Picker data source; Drive “Open with” optional follow-up)
* [ ] WeChat Mini Program viewer
* [x] Mobile browser support (responsive layout & touch)

### Documentation & Community

* [x] Architecture documentation
* [x] API reference
* [ ] Contribution guide
* [x] Example projects
* [x] Roadmap & changelog maintenance

This roadmap is intentionally granular so contributors can clearly see **what exists**, **what is missing**, and **where help is needed**.

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or suggestions. For bug reports, providing a link to the problematic drawing will help in reproducing and fixing the issue.

## License

The MLightCAD monorepo is primarily [MIT](LICENSE) licensed.

DXF loading uses the built-in MIT parser in `@mlightcad/data-model`. DWG loading is **opt-in**: `@mlightcad/cad-simple-viewer` does not depend on GPL LibreDWG packages. Hosts that want open-source DWG support add `@mlightcad/libredwg-converter` (GPL-3.0) themselves, deploy its worker + wasm, and register the converter. If you ship a closed-source product and cannot distribute GPL code to your customers, use the [**proprietary DWG parser**](./PROPRIETARY-PARSER.md) instead.

→ **Commercial parser:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (scope, licensing, pricing, integration, GPL compliance, support)
