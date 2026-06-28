# CAD Simple Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-simple-viewer.svg)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)

This package provides the **high-performance** core components of a CAD viewer such as document management, command handling, and collaboration between the UI and rendering engines. It's designed for optimal performance when handling large CAD files.

This module doesn't depend on any UI framework and doesn't provide any UI except canvas. If you want to integrate a high-performance CAD viewer into a web application with your own UI, this module is the correct choice.

## Key Features
- Document management optimized for large files
- Efficient command stack and undo/redo operations
- Optimized integration with rendering engines
- Performance-focused settings and context management
- Framework-agnostic design for maximum flexibility

## When Should You Choose cad-simple-viewer?

Use `cad-simple-viewer` if you need **core CAD logic only** (document management, command stack, rendering engine integration) without any UI framework dependencies. This package is ideal if:

- You want to build your **own custom UI** or integrate CAD functionality into a non-Vue or non-web environment.
- You require maximum flexibility and performance for handling large CAD files, and plan to connect the logic to your own rendering or UI layer.
- You want a framework-agnostic solution that provides only the essential CAD operations and canvas rendering.

**Recommended for:** Custom integrations, headless CAD processing, or advanced users building highly tailored CAD solutions.

## Directory Structure (partial)
- `src/app/` – Document/context management, settings
- `src/command/` – Command implementations (open, zoom, select, etc.)
- `src/editor/` – Command stack, input handling, global functions
- `src/service/` – Layer/entity services and UI layer store
- `src/view/` – Layout and scene management
- `src/util/` – Utilities

## Installation

```bash
npm install @mlightcad/cad-simple-viewer
```

## Usage

Please refer to [cad-simple-viewer-example](https://github.com/mlight-lee/cad-simple-viewer-example) on basic usage and advanced usage.

While `cad-simple-viewer` doesn't support saving drawings to DWG/DXF files, it provides comprehensive support for **modifying drawings in real-time**. You can add, edit, and delete entities within the drawing, and the viewer will automatically update to reflect these changes.

When you modify entities, you're working directly with the underlying drawing database. The viewer automatically detects these changes and updates the display accordingly. This real-time synchronization ensures that:

- All modifications are immediately visible
- The command stack properly tracks changes for undo/redo operations. This will be implemented soon.

This capability makes `cad-simple-viewer` suitable for applications that need to not only display CAD files but also allow users to interact with and modify the drawing content.

**Important Note**: The usage patterns in `cad-simple-viewer` are **very similar to AutoCAD RealDWG**. If you're familiar with AutoCAD RealDWG development, you'll find the API structure and workflow nearly identical. The main difference is that we use the [**realdwg-web API**](https://mlight-lee.github.io/realdwg-web/) instead of the native RealDWG libraries.

In [cad-simple-viewer-example](https://github.com/mlight-lee/cad-simple-viewer-example) it demonstrates how to create one drawing with [**realdwg-web API**](https://mlight-lee.github.io/realdwg-web/).

## Layer services

Layer table mutations are centralized in `AcApLayerService`. UI integrations should use `AcApDocument.layerStore`, which observes that document's layer table and delegates mutations to its layer service.

### Turning layers on/off from UI vs CLI

`AcApLayerService.setLayerOn` accepts `{ switchCurrentLayer?: boolean }`:

- **CLI commands** leave the default `false`. Batch helpers skip the current layer instead.
- **UI callers** (`AcApLayerStore`, Vue `useLayers`) pass `true` so hiding or freezing the active layer moves `CLAYER` to another visible layer first.

### LAYISO `LockAndFade` mode

The `LockAndFade` isolation keyword matches AutoCAD naming but the viewer **locks** non-isolated layers only. It does not apply a visual fade; users are notified when selecting this mode in the `LAYISO` command.

## Web Worker deployment

The viewer loads three worker scripts for DXF parsing, DWG parsing, and MTEXT rendering. Host applications must deploy these files and point to them via `webworkerFileUrls` in `AcApDocManager.createInstance()`.

Before calling `openDocument()`, verify that the workers are reachable. Use the built-in readiness API rather than downloading worker bodies with a plain GET request (the LibreDWG worker alone is ~12 MB):

```typescript
const workerUrls = {
  dxfParser: './workers/dxf-parser-worker.js',
  dwgParser: './workers/libredwg-parser-worker.js',
  mtextRender: './workers/mtext-renderer-worker.js'
}

// Option 1: check before creating the manager
const ready = await AcApDocManager.checkWebworkerReadiness(workerUrls)
if (!ready) {
  throw new Error('CAD worker scripts are missing or blocked')
}

const manager = AcApDocManager.createInstance({ webworkerFileUrls: workerUrls })

// Option 2: check on an existing manager instance
if (!(await manager.areWorkersReady())) {
  throw new Error('CAD worker scripts are missing or blocked')
}
```

`areWorkersReady()` and `checkWebworkerReadiness()` use HEAD requests internally. Successful URL probes are cached for the current page lifecycle; failures are not cached at the probe layer, so a transient network error can succeed on a later `areWorkersReady()` call. After each check, `manager.workersReady` is `true` or `false` (`null` only before the first check).

You can also enable automatic checks during initialization:

```typescript
AcApDocManager.createInstance({
  webworkerFileUrls: workerUrls,
  checkWorkersOnInit: true
})

manager.events.workersReady.addEventListener(({ ready }) => {
  if (!ready) console.error('CAD workers are not reachable')
})
```

## Available Exports

### Core Classes

- `AcApContext` - Main application context
- `AcApDocManager` - Document management
- `AcApDocument` - Individual document handling (includes `layerService` and `layerStore`)
- `AcApSettingManager` - Settings management

### Services

- `AcApLayerService` - Layer table mutations with undo
- `AcApLayerStore` - Cached layer rows and UI-friendly mutations (via `AcApDocument.layerStore`)
- `AcApEntityService` - Entity selection, transform, and edit helpers
- `acapRunServiceEdit` - Undo-wrapped edits outside command transactions

### Commands

- `AcApOpenCmd` - Open file command
- `AcApZoomCmd` - Zoom command
- `AcApPanCmd` - Pan command
- `AcApSelectCmd` - Selection command

SVG export (`csvg`) is provided by the optional `@mlightcad/cad-svg-plugin` package.

### Editor Components

- `AcEditor` - Main editor class
- `AcEdCommandStack` - Command stack management
- `AcEdSelectionSet` - Selection handling
- `AcEdInputPoint` - Input point management

### View Components

- `AcTrScene` - Scene management
- `AcTrLayoutView` - Layout view handling
- `AcTrView2d` - 2D view management

## Role in MLightCAD
This package acts as the core logic layer, connecting the frontend UI with the rendering engines and managing all document-related operations.

## License

MIT