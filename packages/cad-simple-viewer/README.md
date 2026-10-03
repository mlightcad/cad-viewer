# CAD Simple Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-simple-viewer.svg)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)

This package provides the **high-performance** core components of a CAD viewer such as document management, command handling, and collaboration between the UI and rendering engines. It's designed for optimal performance when handling large CAD files.

This module doesn't depend on any UI framework and doesn't provide any UI except canvas. If you want to integrate a high-performance CAD viewer into a web application with your own UI, this module is the correct choice. It fully supports **mobile layout and touch interaction**—responsive chrome for phones and tablets, plus pinch-to-zoom, single-finger pan, and tap-to-select—so hosts can ship a mobile-friendly viewer without a separate mobile stack.

## Key Features
- Document management optimized for large files
- Efficient command stack and undo/redo operations
- Optimized integration with rendering engines
- Performance-focused settings and context management
- Framework-agnostic design for maximum flexibility
- Mobile-ready layout and touch gestures for phones and tablets

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

To learn about the built-in notification center (and how to replace the default bell UI while still receiving font-missing and unsupported-entity alerts), see [docs/notification-center.md](./docs/notification-center.md).

For the plain-DOM toolbar engine (`AcUiToolbar`, shortcut bar, and host customization), see [docs/toolbar.md](./docs/toolbar.md).

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

The viewer ships an MTEXT layout worker. DXF is parsed by the built-in converter
in `@mlightcad/data-model` (no separate worker). **DWG support is opt-in**: this
package does not depend on or register `@mlightcad/libredwg-converter` (GPL).
Hosts that need DWG must add that dependency (or another converter), deploy its
worker (+ wasm) assets, register the converter, and optionally pass
`webworkerFileUrls.dwgParser` for readiness checks.

```typescript
import {
  AcApDocManager,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

const dwgParserUrl = `./workers/${LIBREDWG_PARSER_WORKER_FILE}`
AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: dwgParserUrl
  })
)

const workerUrls = {
  dwgParser: dwgParserUrl,
  mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`
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

`areWorkersReady()` and `checkWebworkerReadiness()` use HEAD requests internally. Successful URL probes are cached for the current page lifecycle; failures are not cached at the probe layer, so a transient network error can succeed on a later `areWorkersReady()` call. After each check, `manager.workersReady` is `true` or `false` (`null` only before the first check). Only URLs you pass are probed — `dwgParser` is skipped when omitted.

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

## Native reference admission

`AcApDocManager.createInstance({ overlayLimits })` accepts one explicit policy
for all references owned by that manager, including hidden and parked documents.
All six limits are required nonnegative safe integers; omitting the option leaves
admission unbounded. Choose product limits separately from this library mechanism.
`manager.overlayUsage` returns an immutable snapshot. `AcApOverlayCapacityError`
identifies the exceeded dimension, requested aggregate and configured limit.

| Limit | Accounting boundary |
| --- | --- |
| `references` | Active references plus detached preparations; replacement needs both slots until commit. |
| `preparations` | Outstanding public parse/geometry preparations, released when ready or actually settled after failure/cancellation. |
| `inputBytes` | Sum of encoded file sizes, checked before parsing and conservatively charged until removal. Already-parsed databases contribute zero encoded bytes. |
| `entities` | Native database estimator's entity count, including block definitions. |
| `databaseBytes` | Existing native database estimate, checked before and after geometry preparation. |
| `layoutBytes` | Existing layout geometry-buffer, mapping and spatial-index statistics, checked before returning a ready handle. |

An over-budget replacement leaves the old reference visible. Successful commit
transfers the reservation to the session without releasing/reacquiring capacity;
removing the old reference then releases its charge. Dispose unused prepared
handles. Hiding a drawing frees no capacity. Removal, session closure and manager
cleanup release ownership; a noncooperative public preparation remains charged
until its promise settles, even after cancellation. There is no eviction or queue.
Source revision changes during preparation or before commit are rejected; source
databases must remain immutable while attached.

These are admission and retained-layout policies, **not an exact memory ceiling**.
Input buffers are already supplied by callers, so this API does not control their
downloads. Decode/tessellation allocations occur before their estimates can be
checked. Fonts, textures, material/block caches, private deferred work after native
cancellation, externally retained objects, the primary drawing and actual GPU
memory are outside these counters. No file-size-to-GPU multiplier is used.
The same database in two references is conservatively charged twice. A host must
qualify its capacity and recovery policy before advertising support for large files.

## Native reference interaction

`view.pickDrawingEntities(point, radiusPx)` returns source-qualified occurrences
for read-only inspection and native object snapping. `view.pick()` and editable
selection sets continue to contain host drawing IDs only. Never feed reference
handles into an edit selection set: handles can repeat in different databases.

Each result identifies its database, optional committed `referenceId`, root entity,
nested native `path`, and `instancePath` (including MINSERT cells). Its `transform`
maps native entity geometry to displayed WCS. Paper viewport occurrences also have
`viewportId`. Retain the complete result when retaining identity; an entity handle
alone cannot distinguish these occurrences. `isCurrent()` rejects stale source,
session, placement, database revision and visibility snapshots.

The query reuses each layout's native spatial index and raycast, applying the
inverse placement to the aperture. The existing snap resolver consumes these
results, calls native entity snap methods and native curve intersection helpers,
and retires acquired centers whose source is no longer current. Source databases
and the process-global working database are never switched or modified by queries.
Prepared references participate only after commit; failed replacement leaves the
previous reference interactive. Host and reference groups share layer registration.

Current qualification is plan-view placement with translation, positive uniform
scale and Z rotation, plus native nested INSERT transforms. Uniform planar scales
and reflections preserve native distance modes. Under nonuniform scale or shear,
transformed line/spline nearest and intersection queries are supported; unsupported
circular/elliptic metric modes and intersections are omitted. These occurrences
can still return affine-safe points such as endpoints and centers. Native area
picking remains conservative for text/fills and unsupported curved nearest queries.
Existing intersection source/pair/time/primitive limits remain; they do not bound
the cost of native primitive collection. Acquired marker repaint remains tied to
normal input refresh, although stale points are rejected by the next query.

### Reference layer visibility

`manager.setOverlayLayerVisibility(referenceId, layerName, { isOff, isFrozen })`
changes the addressed placement's display state. Both flags are optional; an
unknown reference or layer returns `false`. It does not edit the source database
or host undo history. Two references sharing one parsed database can therefore
have different layer settings. `getOverlayLayout(id)?.getLayer(name)?.info`
returns the current layer state.

Host layer commands still update the host database through the native layer
service. Both paths apply visibility through the same layout and native batch
slots. Frozen ancestor layers hide all nested descendants; OFF only hides geometry
on the effective leaf layer, including inherited layer 0. Canonical ancestor names
survive flattening, template cloning, compaction and deferred glyph generation.
Compaction combines only geometry with matching visibility dependencies. Layer
toggles for registered geometry change existing slot masks without regenerating
geometry or rebuilding fonts. Host geometry skipped at initial load still uses
its existing conversion-on-thaw path. Explicit entity hide/show remains
independent, so thaw cannot unhide an
explicitly hidden object.

Picking, snapping, live bounds and newly extracted previews follow the same layout
state. Detached command preview copies remain snapshots; managed compare overlays
refresh on mask changes. Replacement copies the latest explicit layer choices at
commit for names still present, while new layers retain source defaults. Parking
retains those choices with the owning layout. Persistence is the caller's concern.

Nested OFF/FROZEN ownership, pending layer-0 inheritance, deferred glyph ancestry,
independent placements, cleanup and replacement are covered by focused offline
fixtures. These checks do not establish browser/GPU behavior, arbitrary
reprojection, dynamic-block or real DWG fidelity, or supported package releases.

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
