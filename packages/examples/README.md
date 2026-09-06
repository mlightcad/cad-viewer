# CAD Viewer Examples

This package serves as a central hub for all CAD viewer examples, providing easy access to both the full-featured CAD viewer and the simple viewer demonstrations.

## Overview

This package consolidates the built examples from `@mlightcad/cad-viewer-example`,
`@mlightcad/cad-simple-viewer-example`, and `@mlightcad/cad-diff-viewer-example`
into a single, easily accessible location. It's designed for showcasing the capabilities of the CAD viewer libraries and providing reference implementations.

## Available Examples

### 1. CAD Viewer Demo (`/cad-viewer/`)
A full-featured CAD viewer application built with Vue.js and Element Plus.

**Features:**
- 🎨 Complete UI with toolbars, menus, and status bar
- 🌐 Multi-language support (English and Chinese)
- 🎯 Advanced controls (layer management, point styles, settings)
- 📁 DXF and DWG file support with drag & drop
- 🎨 Modern UI with Element Plus and UnoCSS

**Technology Stack:**
- Vue 3 with Composition API
- Element Plus UI components
- UnoCSS for styling
- LibreDWG for DWG file support

### 2. CAD Simple Viewer Demo (`/cad-simple-viewer/`)
A minimal, lightweight CAD viewer focusing on core functionality.

**Features:**
- 📁 Simple file selection interface
- 🖥️ High-performance canvas rendering
- 🔍 Basic zoom controls
- 📱 Responsive design
- ⚡ No backend required

**Technology Stack:**
- Vanilla TypeScript
- Canvas-based rendering
- LibreDWG WebAssembly
- Modern ES2020+ features

### 3. CAD Diff Viewer (`/cad-diff-viewer/`)
Experimental reusable side-by-side / overlay comparison widget (`@mlightcad/cad-diff-viewer`).
The host supplies one parent container; the component creates both canvases.

**Features:**
- Drop a DWG/DXF onto a pane, or click the pane / open-file icon
- Side-by-side or overlay view modes with compare coloring (gray / red / green)
- Results panel grouped by change kind or entity type, with prev/next navigation
- Markup tools and a markups tab listing annotations from both drawings
- Click a loaded pane to pan, zoom, and send commands to that drawing
- Loading overlay stays on the pane that is opening
- UI strings use `@mlightcad/cad-simple-viewer` i18n (`en` / `zh` / `tr` / `cs`)

### 4. Zero-build CDN Bootstrap (`/cdn-bootstrap/cad-viewer.html`)

A single HTML file that loads `@mlightcad/cad-viewer` from jsDelivr — no Node, Vite, or local `node_modules`. The landing page is a plain file picker; Vue is only used to mount the viewer.

**Features:**
- Import map + in-browser rewrite of the published `cad-viewer.js` bundle
- Minimal DWG/DXF upload (no open-options UI)
- LibreDWG DWG parser via a blob module worker that imports the jsDelivr script; MTEXT uses main-thread rendering
- Useful as a drop-in CDN host, not as a full product UI reference

Serve over HTTP(S); `file://` will not work for ES module CDN imports.

### 5. Self-Contained Offline HTML

Two complementary demos of the HTML export pipeline.

#### Convert your drawing (`/cad-simple-viewer/html-converter.html`)

A browser-only converter: upload a local DWG/DXF (or open the sample canteen drawing), adjust export options in the UI, and download a self-contained HTML file. Parsing, rendering, and packaging stay in the tab — there is no conversion backend.

**Options (same as the full viewer HTML export dialog):**
- Export invisible (off/frozen) layers
- Export paper-space layouts
- Initial view: zoom to extents, or the viewport saved in the drawing
- Viewer mode: view-only, or measure & review

#### Canteen sample (`/self-contained-html/canteen.html`)

A single-file HTML export of the sample **canteen.dwg** drawing, produced by `cad-simple-viewer-cli`.

**Why it matters:**
- One portable `.html` file — no CAD app, server, or cad-viewer install for recipients
- Opens offline in any modern browser with pan, zoom, layers, and measurement
- Very low memory usage compared with desktop CAD viewers when opening the same sample drawing [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg):

| Viewer | Memory consumption |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| Self-contained HTML (measure mode) | 56 MB |
| Self-contained HTML (view mode) | 33 MB |

View mode uses about **83% less memory than AutoCAD 2020** and **77% less than GstarCAD Viewer**.

#### Progressive multi-file package (`/self-contained-html/canteen-progressive/viewer.html`)

The same sample as a multi-file ACEX package: shell HTML + manifest + per-chunk geometry. Chunks load and paint progressively so first content appears sooner than a single monolithic payload.

**How both demos are built:**
- CI on `main` downloads `canteen.dwg` from cad-data, runs `exportDemoHtml.js` (single HTML + multi zip), then extracts the zip to `canteen-progressive/` for GitHub Pages
- Locally: `pnpm export:demo-html` from this package after `pnpm build` (also writes `canteen.zip` and extracts it)

## Getting Started

### Prerequisites

Make sure you have Node.js and pnpm installed. This project is part of a monorepo workspace.

### Installation and Setup

From the project root:

```bash
# Install all dependencies
pnpm install

# Build all examples
pnpm build

# Navigate to the examples directory
cd packages/examples

# Copy built examples to public directory
pnpm pre-serve

# Serve the examples
pnpm serve
```

The examples will be available at:
- Main index: `http://localhost:3000`
- CAD Viewer Demo: `http://localhost:3000/cad-viewer/`
- CAD Simple Viewer Demo: `http://localhost:3000/cad-simple-viewer/`
- CAD Diff Viewer Demo: `http://localhost:3000/cad-diff-viewer/`
- CDN bootstrap (zero-build): `http://localhost:3000/cdn-bootstrap/cad-viewer.html`
- HTML converter (upload DWG/DXF in the browser): `http://localhost:3000/cad-simple-viewer/html-converter.html`
- Self-contained HTML demo: `http://localhost:3000/self-contained-html/canteen.html` (generate first with `pnpm export:demo-html`)
- Progressive multi-file demo: `http://localhost:3000/self-contained-html/canteen-progressive/viewer.html` (same export step)

### Self-Contained HTML Demo

The landing page includes an **in-browser converter** at `/cad-simple-viewer/html-converter.html` (copied from `@mlightcad/cad-simple-viewer-example` by `pnpm pre-serve`). Upload a DWG/DXF, adjust options, and download HTML without a backend.

The **canteen sample** offline HTML file is built from [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) using [`@mlightcad/cad-simple-viewer-cli`](../cad-simple-viewer-cli). The same script also exports a multi-file progressive package (`canteen.zip`) and extracts it to `canteen-progressive/` for static hosting. GitHub Actions on the `main` branch runs this step automatically before deploying to GitHub Pages.

To generate the file locally (requires a built workspace and Playwright Chromium or system Chrome via `PLAYWRIGHT_BROWSER_CHANNEL=chrome`):

```bash
pnpm build
cd packages/examples
pnpm export:demo-html
pnpm serve
```

## Development Workflow

### Building Examples

```bash
# Build all examples from the root
pnpm build

# Or build individual examples
cd packages/cad-viewer-example && pnpm build
cd packages/cad-simple-viewer-example && pnpm build
cd packages/cad-diff-viewer-example && pnpm build
```

### Updating Examples

1. Make changes to the individual example packages
2. Build the updated examples
3. Run `pnpm pre-serve` to copy the new builds
4. The changes will be reflected when serving

### File Structure

```
packages/examples/
├── public/
│   ├── index.html              # Main navigation page
│   ├── robots.txt              # Crawlers policy
│   ├── sitemap.xml             # Search engine sitemap
│   ├── llms.txt                # LLM-friendly project summary
│   ├── cad-viewer/             # Full CAD viewer demo
│   ├── cad-simple-viewer/      # Simple CAD viewer demo + in-browser HTML converter
│   ├── cad-diff-viewer/        # Side-by-side diff viewer demo
│   ├── cdn-bootstrap/          # Zero-build CDN single-HTML bootstrap
│   └── self-contained-html/    # Offline HTML demos (CI / export:demo-html)
├── copyDist.js                 # Script to copy built examples
├── exportDemoHtml.js           # Build single HTML + multi-file progressive package demos
├── package.json                # Package configuration
└── README.md                   # This file
```

## Scripts

- `pre-serve`: Copies built examples from individual packages to the public directory
- `export:demo-html`: Exports the canteen.dwg sample to a self-contained HTML file
- `serve`: Starts a local server to serve the examples

## Use Cases

### For Developers
- **Reference Implementation**: See how to integrate CAD viewer libraries
- **Feature Comparison**: Compare full vs. simple viewer capabilities
- **Code Examples**: Study implementation patterns and best practices

### For Users
- **Demo Applications**: Test CAD file viewing capabilities
- **Feature Exploration**: Discover available functionality
- **Performance Testing**: Compare rendering performance between examples

### For Documentation
- **Live Examples**: Provide working demonstrations in documentation
- **Screenshot Generation**: Create visual assets for documentation
- **Testing**: Verify functionality across different browsers and devices

## Browser Support

Both examples require:
- Modern browsers with WebGL support
- WebAssembly support (for DWG files)
- ES2020+ JavaScript features

## Contributing

When adding new examples or updating existing ones:

1. Create or modify the example in its respective package
2. Build the example to generate the distribution files
3. Update the `copyDist.js` script if new examples are added
4. Update this README to reflect any changes
5. Test the examples work correctly when served

## License

MIT License - see the main project LICENSE file for details. 