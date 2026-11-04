# @mlightcad/cad-script-core

CAD script runtime for agents. It validates and sandboxes `cad.*` scripts, runs
them against a `CadSession`, and builds the transport-neutral tool catalog
(`execute_cad_script`).

It depends on `@mlightcad/data-model` and `@mlightcad/cad-pdf-core` (for
`cad.file.savePdf`). It does **not** depend on `cad-simple-viewer`, a UI
framework, or a model SDK. HTML export (`cad.file.saveHtml`) is fulfilled
through an optional `CadSession.exportHtml` hook — typically filled by
`@mlightcad/cad-agent-core` in a viewer host.

| Package                      | Adds                                                                                                                              | Depends on                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `@mlightcad/cad-script-core` | Script validation, sandbox, `cad.*` host, tool catalog, headless session, PDF export                                              | `@mlightcad/data-model`, `@mlightcad/cad-pdf-core`                        |
| `@mlightcad/cad-agent-core`  | Viewer session: selection highlight, zoom, PNG previews, PDF/HTML export hooks, undo-stack notifications. Re-exports this package | `cad-script-core`, `cad-simple-viewer`, `cad-pdf-core`, `cad-html-plugin` |

Use `@mlightcad/cad-agent-core` inside a viewer app. Use this package directly
when there is no viewer, or when you implement `CadSession` yourself.

Node hosts that only need the script API text can import
`@mlightcad/cad-script-core/script-api`, which does not load data-model.

## Why scripts, not hundreds of tools?

Wrapping every CAD operation as its own AI tool (`draw_line`, `draw_circle`,
`set_entity_layer`, …) scales poorly: the catalog grows without bound, token
cost climbs with every tool description and round-trip, and users still invent
tasks the catalog never covered.

We take the opposite approach. The runtime exposes a **checked JavaScript host**
(`cad.*`). The model writes a short function body — loops, filters, geometry
checks, and edits in one shot — instead of orchestrating dozens of tool calls.
MCP and a few lifecycle tools still matter (open a drawing, connect remote
systems); they are not the place to mirror the entire CAD API.

Practical wins:

- **Fewer tokens** — filter 100k entities in-process; return only the hits
- **Easier verification** — `cad.measure.check` / `report` and assertions live
  in the same script as the work
- **Faster execution** — one script run vs. many model↔tool round-trips

Background and motivation:
[Building a CAD Agent: MCP, Tools, or Let AI Write Code?](https://dev.to/mlightcad/building-a-cad-agent-mcp-tools-or-let-ai-write-code-2nc4)

## Session

Every call reads the active drawing through a `CadSession`:

```ts
interface CadSession {
  getDocument(): CadSessionDocument | undefined
  getView(): CadSessionView | undefined
  /** Optional: undoable edit. Default `database.runDatabaseEdit(label, fn)`. */
  runEdit?(database: AcDbDatabase, label: string, fn: () => void): void
  /** Optional: PNG for `cad.view.capturePreview`. Without it previews are skipped. */
  capturePreview?(longSide: number): Promise<CaptureDrawingPreviewResult>
  /** Optional: PDF for `cad.file.savePdf`. Without it, cad-pdf-core is used. */
  exportPdf?(options: CadScriptPdfExportOptions): Promise<Uint8Array>
  /** Optional: HTML for `cad.file.saveHtml`. Without it, saveHtml is skipped. */
  exportHtml?(
    options: CadScriptHtmlExportOptions
  ): Promise<CadScriptHtmlExportResult>
}
```

The optional hooks are how a host adds behavior this package cannot provide:
`cad-agent-core` uses `runEdit` to notify the UI after each edit,
`capturePreview` to render through WebGL, and `exportPdf` / `exportHtml` for
viewer-quality PDF fonts and offline HTML packaging.

`CadSessionDocument.openMode` takes a `CadSessionOpenMode` value (`Read` 0,
`Review` 4, `Write` 8). The values match `AcEdOpenMode`, so a viewer
`AcApDocument` is a valid `CadSessionDocument` as is.

### Headless session

`createDatabaseSession(database, options?)` returns a session backed only by an
`AcDbDatabase`:

```ts
import { AcDbDatabase } from '@mlightcad/data-model'
import {
  createCadToolCatalog,
  createDatabaseSession,
  executeCadScript
} from '@mlightcad/cad-script-core'

const db = new AcDbDatabase()
const session = createDatabaseSession(db, { title: 'plan.dxf' })

const result = await executeCadScript(
  {
    code: `
      cad.edit.transaction('draw', tx => {
        tx.drawCircle({ center: { x: 0, y: 0 }, radius: 5 })
      })
      return cad.drawing.extents
    `
  },
  session
)

// Or hand the catalog to an MCP / AI SDK adapter:
const tools = createCadToolCatalog(session)
```

Compared with the viewer session:

- `cad.selection` keeps an in-memory selection set; nothing is highlighted
- `cad.view.zoomExtents()` does nothing
- `cad.view.capturePreview()` is skipped and the log says why; the catalog
  description tells the model not to call it
- `cad.file.saveHtml()` is skipped (needs a viewer HTML pipeline)
- `cad.file.savePdf()` uses the built-in `cad-pdf-core` path
- `cad.drawing.extents` is the union of model-space entity extents
- edits use `database.runDatabaseEdit`, so undo works the same way

Pass `{ openMode: CadSessionOpenMode.Read }` to reject `cad.edit` scripts.

## Tool catalog

`createCadToolCatalog(session)` returns tools with:

- `name`, `description`
- zod `inputSchema` (adapters convert this to JSON Schema when a protocol needs it)
- `access`: `read`, `write`, or `view`
- `execute`

The catalog is script-first and currently exposes only:

- `execute_cad_script` — all drawing, queries, edits, and context (`cad.drawing`)

`execute_cad_script` is marked `write` because a script may mutate the drawing.
The runner still accepts a read-only drawing when the script never touches
`cad.edit`. Drawing primitives live on `CadActionExecutor` and are reached
through `cad.edit.transaction` inside the script host.

## Script host

`execute_cad_script` runs a function body. The only argument is `cad`. The
script must not import modules or touch the page. Entities passed to the script
are plain snapshots, not live `AcDbEntity` objects.

`CadScriptPanel` in `@mlightcad/cad-script-plugin` is the same runner with an
editor, so a person can execute a script without a model. It uses the viewer
session from `@mlightcad/cad-agent-core`.

```js
const counts = {}
for (const e of cad.entities.where(e => e.type === 'Circle')) {
  counts[e.layer] = (counts[e.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) {
    max = count
    top = layer
  }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
```

`cad.selection.replace` updates the view selection set. In a viewer session the
ids are highlighted; a headless session only records them.

| Member                                   | Behavior                                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cad.drawing`                            | Title, current layer, units, layer flags, extents                                                                                                                                                                                                      |
| `cad.entities.where(predicate)`          | Tests each model-space entity, then snapshots only the matches                                                                                                                                                                                         |
| `cad.entities.byId(id)`                  | One snapshot, or `undefined`                                                                                                                                                                                                                           |
| `cad.entities.inBox(min, max)`           | Snapshots whose scene bounds meet a WCS box                                                                                                                                                                                                            |
| `cad.selection`                          | `ids`, `entities`, `replace`, `add`, `remove`, `clear`                                                                                                                                                                                                 |
| `cad.view.zoomExtents()`                 | Fit the view to the drawing (no-op without a viewer)                                                                                                                                                                                                   |
| `cad.file.saveDxf(path?)`                | After a successful script, export DXF. A path string or `{ path?, fileName? }`. The in-app agent downloads the file; `cad-mcp-server` writes `path` (relative to the server cwd). The tool result lists `savedFiles` and does not include the DXF body |
| `cad.file.savePdf(path?)`                | After a successful script, export PDF via `cad-pdf-core` (or `session.exportPdf`). Path string or `{ path?, fileName?, exportLayouts?, colorMode?, textMode?, modelSpaceFit? }`. Bytes are not returned to the model                                   |
| `cad.file.saveHtml(path?)`               | After a successful script, export offline HTML/zip via `session.exportHtml`. Path string or `{ path?, fileName?, exportFormat?, exportLayouts?, background? }`. Skipped with a log line when the session has no HTML exporter                          |
| `cad.view.capturePreview({ longSide? })` | Queue a PNG screenshot fulfilled after the script through `session.capturePreview`; attached as `images` on the tool result. Skipped with a log line when the session has no renderer                                                                  |
| `cad.measure.*`                          | `distance`, `angleDeg`, `deltaAngleDeg`, `center`, `radius`, `length`, `area`, `check`, `report` for numeric self-check                                                                                                                                |
| `cad.log(...)`                           | Lines returned on the tool result                                                                                                                                                                                                                      |
| `cad.edit.transaction(label, tx => {})`  | One undo group                                                                                                                                                                                                                                         |

Inside the transaction, `tx` can `drawLine`, `drawCircle`, `drawArc`,
`drawRectangle`, `drawPolyline`, `drawEllipse`, `drawHatch`, `drawPoint`,
`drawRay`, `drawXline`, `drawSpline`, `drawText`, `erase`, `setLayer`, `move`,
`rotate`, `createLayer`, and `setCurrentLayer`. Draw methods return the new
entity id.

Snapshot `geometry` for common types:

- Circle: `center`, `radius`, `area`, `circumference`, `closed`
- Line: `start`, `end`, `length`, `midPoint`, `direction` (unit vector)
- Arc: `center`, `radius`, `startAngle`, `endAngle` (radians as stored on the entity) plus degree copies,
  `length`, `area`, `startPoint`, `endPoint`, `midPoint`
- Ellipse: `center`, `majorAxis`, `majorRadius`, `minorRadius`, `area`, `isCircular`
- Polyline / 2dPolyline: `points`, `vertices` (`{ bulge, startWidth, endWidth }`), `bulges`, `hasBulges`,
  `hasWidths`, `closed`, `length`, `area`
- 3dPolyline: `points`, `closed`, `length`
- Spline: `controlPoints`, `fitPoints`, `knots`, `weights`, `degree`, `length`, `area`,
  `isFitPointSpline`, `isControlPointSpline`
- Text / MText: `position`, `text`, `height`, plus alignment and formatting fields. MText adds
  `plainText` (control codes stripped), columns, line spacing, and background fill
- Point: `position`, `ecsRotation`; Ray / Xline: `basePoint`, `unitDir`
- Insert: `name`, `effectiveName`, `isDynamicBlock`, `position`, `rotation`, `scale`, `blockTransform`,
  MINSERT row/column data, and `attributes: [{ tag, text, position }]`
- Table: insert fields plus `cells` (`string[][]`), `rowHeights`, `columnWidths`, `attachmentPoint`
- Hatch: `patternName`, `hatchStyle`, `isSolidFill`, `area`, `loops: [{ closed, points, length }]`,
  gradient fields
- Dimension: `text`, `annotationText`, `measurement` (computed from definition points when missing),
  `dimensionType`, and the definition points of each subtype

Every snapshot also carries the `AcDbEntity` display properties, always present: `color`,
`resolvedColor`, `lineType`, `lineWeight`, `linetypeScale`, `visibility`, `transparency`, plus
`thickness` / `normal` when the type has them. `color` / `resolvedColor` are
`{ red?, green?, blue?, hex?, colorIndex?, isByColor, isByACI, isByLayer, isByBlock, isForeground }`,
so a ByLayer entity reports `isByLayer: true` while `resolvedColor` carries the layer RGB.
Inside `cad.entities.where(...)` these fields are read lazily: only the properties a predicate touches
are resolved, and only matching entities become full snapshots.

`cad.measure.area(id)` returns the entity's area (or the polygon area of its boundary points).

Geometry is copied for every concrete entity type in `@mlightcad/data-model`. A property that cannot be read is omitted. Binary payloads such as ACIS, OLE streams, and proxy graphics are not copied. `cad.entities` walks every block table record, so model space, paper space, and block definitions are all included. Attributes on inserts are included too. `ownerId` is the owning block id, or the insert id for an attribute.

`cad.tables` copies `AcDbDatabase.tables`: `appIdTable`, `blockTable`, `dimStyleTable`, `linetypeTable`, `textStyleTable`, `ucsTable`, `viewTable`, `layerTable`, and `viewportTable`. Each value is `{ id, records }`.

`cad.blocks` copies block definitions the way a DXF BLOCKS section does, including `*Model_Space` and `*Paper_Space`. Each block has `id`, `name`, `origin`, `isModelSpace`, `isPaperSpace`, `flags`, `pathName`, `isXref`, and `entities`.

`CAD_SCRIPT_API_SUMMARY` is the text embedded in the chat system prompt and in
the `execute_cad_script` description. Adapters should reuse that string.

## Checks and limits

Before a script runs, `acorn` parses it and rejects:

- `import`, `import()`, `with`, `eval`, `Function`, `this`
- identifiers such as `window`, `document`, `globalThis`, and `fetch`
- member names `constructor`, `prototype`, and `__proto__`
- `cad` members that are not in `CAD_SCRIPT_API_TREE`
- computed access on the host (`cad[name]`)

The runtime then inserts `cad.__tick()` at the start of every block and around
non-block loop bodies. The default budget is 100,000 ticks or 2 seconds.
Exceeding it throws `script_timeout`. A throw inside `cad.edit.transaction`
aborts that undo group via `runUndoable`, so a timed-out write is not committed.

The function is invoked with page globals (`window`, `globalThis`, `Function`,
and the rest) bound to `undefined`. This is a guard against a model damaging
the drawing or the page. It is not a multi-tenant isolation boundary. A later
QuickJS host can replace `new Function` without changing the catalog.

Returned values must be JSON. Results larger than 65,536 characters are
replaced with `{ truncated: true, preview }`.

The tool result is a `ToolResult`:

- `success`, `message`, `error`
- `data` for the script return value
- `log` for `cad.log`
- `highlightedIds` for the last selection change
- `entityIds` for entities created in the transaction

## Peers

- `@mlightcad/data-model`

Direct dependencies: `zod`, `acorn`.
