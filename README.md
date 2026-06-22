# CAD-Viewer

[简体中文](./README.zh-CN.md)

cad-viewer is `the first web-based DXF/DWG viewer and editor in the world that operates entirely in browser, without relying on any backend services`.
By performing DWG/DXF parsing, geometry processing, and rendering directly in the browser, cad-viewer enables true serverless CAD viewing and editing, ideal for cloud apps, offline usage, and privacy-sensitive workflows.

It also offers something you will rarely find in other CAD viewers—**one-click export to a single, self-contained HTML file**. The downloaded `.html` embeds the drawing snapshot and a lightweight viewer runtime, so recipients can open, pan, zoom, toggle layers, and measure distances in any modern browser with **no CAD app, no server, and no install**. Most desktop and web CAD viewers only let you view inside their own product; cad-viewer turns a live drawing into a portable, offline artifact you can email, archive, or drop on a static file host—ideal for sharing with clients, compliance archives, and air-gapped workflows.

- [**🌐 Live Demo**](https://mlightcad.github.io/cad-viewer/)
- [**🌐 API Docs**](https://mlightcad.github.io/cad-viewer/docs/)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Apps Built with cad-viewer

The [Thingraph](https://cad.thingraph.site/) team builds production DWG/DXF viewers and platform integrations on top of cad-viewer, serving tens of thousands of users worldwide:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — Browser-based DWG/DXF viewer used by engineering teams worldwide for fast, serverless drawing access. Install for your platform:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — open DWG/DXF from Drive with **Open with**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — custom read-only editor for `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — same extension via Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — embed DWG/DXF previews on pages
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — thumbnail and preview in File Explorer

![CAD-Viewer Quick Demo](./assets/cad-viewer.gif)

## Features

- **High-performance** viewing of large DWG/DXF files with smooth 60+ FPS rendering
- **No backend required** - Files are parsed and processed entirely in the browser
- **Enhanced data security** - Files never leave your device, ensuring complete privacy
- **Easy integration** - No server setup or backend infrastructure needed
- Modular architecture for seamless third-party integration
- **Export to offline HTML** — Export the current drawing as one self-contained `.html` file with an embedded viewer (pan/zoom, zoom extents, layers, distance measure, EN/ZH UI). Opens offline in any browser; no cad-viewer instance or backend required.
- Offline and online editing workflows
- THREE.js 3D rendering engines with advanced optimization techniques
- Designed for extensibility and integration with platforms like CMS, Notion, and WeChat

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

CAD-Viewer is engineered for **exceptional performance** and can handle very large DXF/DWG files while maintaining high frame rates. It employs multiple advanced rendering technologies to optimize performance:

- **Custom Shader Materials**: Uses GPU-accelerated shader materials to render complex line types and hatch fill patterns efficiently
- **Geometry Batching**: Merges points, lines, and areas with the same material to dramatically reduce draw calls
- **Instanced Rendering**: Optimizes rendering of repeated geometries through instancing techniques
- **Buffer Geometry Optimization**: Efficient memory management and geometry merging for reduced GPU overhead
- **Material Caching**: Reuses materials across similar entities to minimize state changes
- **WebGL Optimization**: Leverages modern WebGL features for hardware-accelerated rendering

These optimizations enable CAD-Viewer to smoothly render complex CAD drawings with thousands of entities while maintaining responsive user interactions.

## Known Issues

CAD-Viewer has some known limitations that users should be aware of:

- **Unsupported Entities**: 
  - **XRefs**: External references (XRefs) are not currently supported. This is mainly because file access in the browser works differently from desktop CAD applications. Support for XRefs is planned for a future release.
- **DWG File Compatibility**: 
  - Some DWG drawings may fail to open due to bugs in the underlying [LibreDWG](https://github.com/LibreDWG/libredwg) library. This is a known limitation of the current DWG parsing implementation. If you find those issues, please log one issue on [CAD-Viewer issues page](https://github.com/mlightcad/cad-viewer/issues) or [LibreDWG issues page](https://github.com/LibreDWG/libredwg/issues).
  - Drawings that contain third-party custom entities (e.g., Tianzheng drawings in the Chinese architecture and construction industry) may not display correctly unless proxy graphics are saved. When saving such drawings, ensure the system variable `PROXYGRAPHICS` is set to `1`. If proxy graphics are embedded in the file, CAD-Viewer can display them.

  Whether proxy graphics are written when saving a DWG is controlled by the system variable `PROXYGRAPHICS`:

  | Value | Meaning |
  |-------|---------|
  | 0 | Do not save proxy graphics |
  | 1 | Save proxy graphics |

These issues are being tracked and will be addressed in future releases.

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

* [ ] ⏳ Endpoint: Not working for INSERT entity yet.
* [x] Midpoint
* [x] Center
* [ ] Intersection
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
* [ ] Undo / redo

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

* [ ] ⏳ Google Drive Integration
* [ ] WeChat Mini Program viewer
* [ ] Mobile browser support (read-only)

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

[MIT](LICENSE)
