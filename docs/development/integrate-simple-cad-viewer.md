---
title: "Integrate Simple Viewer"
---

# Integrate Simple Viewer

**cad-simple-viewer** provides the **high-performance** core components of a CAD viewer such as document management, command handling, and collaboration between the UI and rendering engines. It's designed for optimal performance when handling large CAD files.

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

## Installation

```bash
npm install @mlightcad/cad-simple-viewer
```

## Usage

Please refer to [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) on basic usage and advanced usage.

Integration has two steps: **initialize the application** (create the `AcApDocManager` singleton once), then **open a drawing** into it.

### Initialize the Application

`AcApDocManager` is the entry point of `cad-simple-viewer`. It is a singleton: call `AcApDocManager.createInstance(options)` once at startup, then access it via `AcApDocManager.instance`. Calling `createInstance` again returns the existing instance without applying the new options.

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

All options are optional. They are defined by the `AcApDocManagerOptions` interface.

#### Canvas and Layout

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | new element | HTML container that hosts the canvas. When omitted, a new container element is created and you must insert it into the DOM yourself. |
| `width` | `number` | container width | Canvas width in pixels. |
| `height` | `number` | container height | Canvas height in pixels. |
| `autoResize` | `boolean` | `false` | When `true`, the canvas automatically follows container size changes (window resize, sidebar collapse, ...). |
| `busyIndicatorHost` | `HTMLElement` | `container` | Host element for the busy overlay (for example the export spinner). Set it to the viewer shell so the mask can cover ribbon, toolbars, and status bar. |

#### Rendering and Fonts

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | Controls where MTEXT entities are rendered. `true`: main thread — less peak memory but slower first paint. `false`: Web Worker — more memory but the drawing shows sooner. |
| `preloadDefaultFonts` | `boolean` | `false` | When `true`, eagerly preload the default fallback font chain at init. By default fonts load on demand while text is drawn. |

#### Workers and Resources

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | Base URL used to fetch runtime resources such as fonts and drawing templates. Point it to your own copy for offline or self-hosted deployments. |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | URLs of the worker bundles: `mtextRender` (MTEXT layout/glyph worker) and `dwgParser` (optional DWG parsing worker, used for readiness checks). See [Configure Worker URLs](./configure-worker-urls) for bundler-specific pitfalls. |
| `checkWorkersOnInit` | `boolean` | `false` | When `true`, verify the configured worker script URLs with HEAD requests after initialization. The result is exposed through `AcApDocManager.instance.workersReady` and the `workersReady` event. |

#### UI and Product Gates

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | When `false`, the built-in OPEN command file picker is not installed (useful when you provide your own open UI). |
| `disableExport` | `boolean` | `false` | When `true`, drawing export commands and related UI entry points are not registered (`cdxf`, `pngout`, `jpgout`, `bmpout`, and HTML/PDF/SVG export). This is a product/UX gate, not DRM — drawing data still exists in memory. |
| `docsBaseUrl` | `string` | MLightCAD docs site | Absolute root URL for localized user-guide pages used by in-app help links. |
| `commandAliases` | `Record<string, string \| string[]>` | built-in aliases | Override command aliases by command global name, for example `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`. Commands not listed keep their built-in aliases. |

#### Plugins and Open Defaults

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | Load plugins automatically during initialization. `fromConfig` accepts plugin instances or factory functions; `fromFolder` loads plugin files from a folder path (`folderPath`, `pluginList`, `continueOnError`). See [Plugin System](./plugin-system). |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` or `() => AcApOpenDatabaseOptions \| Promise<...>` | – | Default options applied to files opened through the built-in OPEN dialog. Can be a static object or a synchronous/asynchronous factory. Update later via `AcApDocManager.instance.setOpenDocumentDefaults(...)`. |

#### Registering a DWG Converter

`cad-simple-viewer` does **not** register a DWG converter by default (LibreDWG is GPL-licensed). To open DWG files, register a converter such as `@mlightcad/libredwg-converter` before opening:

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### Open a Drawing

The document manager provides two ways to open a drawing. Both return a `Promise<boolean>` that resolves to `true` when the file was opened successfully:

```typescript
// 1. From a URL (file is fetched by the viewer)
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. From file content you already have (for example a File input)
const success = await docManager.openDocument(
  'plan.dwg',               // file name decides DWG vs DXF by extension
  await file.arrayBuffer(), // file content as ArrayBuffer
  options
)
```

Both methods accept the same `AcApOpenDatabaseOptions` object. When omitted, the manager applies `drawNoPlotLayers: false` and `progressiveRendering: false`. The type combines viewer-level options with the base `AcDbOpenDatabaseOptions` from `@mlightcad/data-model`.

#### Viewer Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | Access mode: `Read` (0, viewing only), `Review` (4, reviewing, compatible with Read), `Write` (8, full read/write, compatible with the others). Higher modes are compatible with lower ones. Also decides the default `openViewMode` (see below). |
| `progressiveRendering` | `boolean` | `false` | Controls whether geometry paints while the drawing is still converting. `false`: the canvas is not redrawn until every entity is converted, and the open overlay stays up until deferred text/INSERT glyph jobs finish. `true`: entity conversion yields across event-loop turns so batches paint as they land; pan/zoom become available once parsing and conversion reporting finish, while remaining geometry continues converting. Use `true` for interactive viewing of large files, `false` for screenshots or deterministic first frames. |
| `openViewMode` | `AcApOpenViewMode` | `Extents` for Read/Review, `Saved` for Write | How to frame each layout the user has not operated on yet. `Extents` (`'extents'`) zooms to the converted geometry. `Saved` (`'saved'`) restores AutoCAD's saved view (model space uses VPORT `*ACTIVE`; paper space uses layout limits when they contain real viewports, otherwise the viewport box). |
| `sysVars` | `AcApOpenSysVars` | – | System variables to override when the database opens. Keys are sysvar names (case-insensitive); values can be `number`, `boolean`, `string`, or `AcCmColor`. Common examples: `lwdisplay: false` to hide lineweights, `paperbkcolor` to set the paper-space background color. |
| `convertInvisibleLayers` | `boolean` | `false` | When `true`, entities on off/frozen layers are converted during open so offline HTML/PDF export does not need a second pass for them. Leave `false` for interactive viewing (they convert when a layer is turned on). |
| `convertAllLayouts` | `boolean` | `false` | When `true`, every paper-space layout is registered and converted during/immediately after open, so export does not wait for the user to visit each layout tab. |
| `skipSpatialIndex` | `boolean` | `false` | When `true`, skip building the hierarchical spatial index during entity conversion. The index powers interactive pick and smart extents; headless HTML/JPEG export only needs scene batches, so it can be skipped there to save time and memory. |
| `cooperativeYield` | `boolean` | `true` | When `false`, disable cooperative `setTimeout` yields during entity conversion and skip mid-open WebGL paints. Headless scripts do not need a responsive UI, so disabling yields shortens open wall time. |

#### Database Options (inherited from `@mlightcad/data-model`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | Minimum number of entities per processing chunk. Larger chunks reduce scheduling overhead; the official example uses `1000`. Capped at the total entity count. |
| `timeout` | `number` | converter default | Timeout in milliseconds for web worker parsing. Only used when the selected converter parses in a worker. |
| `encoding` | `string` | auto-detect | Text encoding override for layer names, annotations, text, and attributes (for example `'gbk'` or `'euc-kr'`). When omitted, DXF reads `$DWGCODEPAGE` and DWG reads its header code page. A provided value wins over auto-detection, which is useful for files with a missing or wrong declared code page. |
| `drawNoPlotLayers` | `boolean` | `false` | Whether entities on non-plottable layers (Defpoints, `*-NPLT`, ...) are drawn. `true` = desktop AutoCAD semantics (visible on screen); `false` = web/publish viewer semantics (hidden). `AcApDocManager` defaults this to `false`. |
| `circleSides` | `number` | `50` (draft) | Maximum segments used to tessellate a full circle. Lower values save GPU memory and shrink HTML exports; higher values look smoother. Clamped to the DXF VPORT range. Short arcs still use fewer segments. |
| `fileName` | `string` | – | Drawing file name including extension. Updates the read-only `DWGNAME` system variable of the opened database. |

#### Deprecated Options

| Option | Status |
| --- | --- |
| `waitForTextGeometry` | Ignored. Both stages of progressive rendering are now controlled by `progressiveRendering`; passing it logs a warning. |
| `fontLoader`, `failOnFontLoadError` | Removed. Fonts are loaded lazily by the text renderer while text is drawn; passing them logs a warning. |

#### Example

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('Failed to open drawing')
}
```

To track the open lifecycle, subscribe to the events on `AcApDocManager.instance.events`: `documentToBeOpened`, `documentCreated`, `documentToBeActivated`, `documentActivated`, `documentToBeDestroyed`, and `documentDestroyed`.

### Modify Drawings in Real Time

While `cad-simple-viewer` doesn't support saving drawings to DWG/DXF files, it provides comprehensive support for **modifying drawings in real-time**. You can add, edit, and delete entities within the drawing, and the viewer will automatically update to reflect these changes.

When you modify entities, you're working directly with the underlying drawing database. The viewer automatically detects these changes and updates the display accordingly. This real-time synchronization ensures that:

- All modifications are immediately visible
- The command stack properly tracks changes for undo/redo operations. This will be implemented soon.

This capability makes `cad-simple-viewer` suitable for applications that need to not only display CAD files but also allow users to interact with and modify the drawing content.

**Important Note**: The usage patterns in `cad-simple-viewer` are **very similar to AutoCAD RealDWG**. If you're familiar with AutoCAD RealDWG development, you'll find the API structure and workflow nearly identical. The main difference is that we use the [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) instead of the native RealDWG libraries.

In [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) it demonstrates how to create one drawing with [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/).

## Role in MLightCAD

This package acts as the core logic layer, connecting the frontend UI with the rendering engines and managing all document-related operations.


