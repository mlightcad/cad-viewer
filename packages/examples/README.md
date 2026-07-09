# CAD Viewer Examples

This package serves as a central hub for all CAD viewer examples, providing easy access to both the full-featured CAD viewer and the simple viewer demonstrations.

## Overview

This package consolidates the built examples from both `@mlightcad/cad-viewer-example` and `@mlightcad/cad-simple-viewer-example` into a single, easily accessible location. It's designed for showcasing the capabilities of the CAD viewer libraries and providing reference implementations.

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

### 3. Self-Contained Offline HTML (`/self-contained-html/canteen.html`)

A single-file HTML export of the sample **canteen.dwg** drawing, produced by `cad-html-exporter-cli`.

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

**How it is built:**
- CI on `main` downloads `canteen.dwg` from cad-data and runs `exportDemoHtml.js`
- Locally: `pnpm export:demo-html` from this package after `pnpm build`

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
- Self-contained HTML demo: `http://localhost:3000/self-contained-html/canteen.html` (generate first with `pnpm export:demo-html`)

### Self-Contained HTML Demo

The offline HTML example is built from the sample [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) using [`@mlightcad/cad-html-exporter-cli`](../cad-html-exporter-cli). GitHub Actions on the `main` branch runs this step automatically before deploying to GitHub Pages.

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
│   ├── cad-simple-viewer/      # Simple CAD viewer demo
│   └── self-contained-html/    # Offline HTML export demo (CI / export:demo-html)
├── copyDist.js                 # Script to copy built examples
├── exportDemoHtml.js           # Build offline HTML demo via cad-html-exporter-cli
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