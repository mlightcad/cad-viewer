# @mlightcad/cad-agent-core

Transport-neutral CAD runtime for agents. It exposes a drawing-tool catalog and a
checked JavaScript host on top of `@mlightcad/data-model` and
`@mlightcad/cad-simple-viewer`.

`@mlightcad/cad-agent-plugin` maps the catalog onto the Vercel AI SDK. A future
MCP server or in-page WebMCP adapter should map the same catalog instead of
reimplementing drawing operations.

This package does not depend on a model SDK or a UI framework.

## Session

Every call reads the active drawing through a `CadSession`:

```ts
interface CadSession {
  getDocument(): CadSessionDocument | undefined
  getView(): CadSessionView | undefined
}
```

`createDocManagerSession()` reads `AcApDocManager.instance` on each call, so an
MDI document switch is visible to the next tool. Tests and a future
out-of-process MCP server implement `CadSession` themselves. An in-page WebMCP
adapter can reuse `createDocManagerSession()`.

## Tool catalog

`createCadToolCatalog(session)` returns tools with:

- `name`, `description`
- zod `inputSchema` (adapters convert this to JSON Schema when a protocol needs it)
- `access`: `read`, `write`, or `view`
- `execute`

`execute_cad_script` is marked `write` because a script may mutate the drawing.
The runner still accepts a read-only drawing when the script never touches
`cad.edit`.

Fixed tools (`draw_line`, `draw_circle`, and the rest) each open one undo mark.
They delegate to `CadActionExecutor`.

## Script host

`execute_cad_script` runs a function body. The only argument is `cad`. The
script must not import modules or touch the page. Entities passed to the script
are plain snapshots, not live `AcDbEntity` objects.

`CadScriptPanel` in `@mlightcad/cad-agent-plugin` is the same runner with an
editor, so a person can execute a script without a model. It uses
`createDocManagerSession()` and therefore needs a viewer host.

```js
const counts = {}
for (const e of cad.entities.where(e => e.type === 'Circle')) {
  counts[e.layer] = (counts[e.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
```

`cad.selection.replace` updates the view selection set. The viewer context
highlights those ids.

| Member | Behavior |
| --- | --- |
| `cad.drawing` | Title, current layer, units, layer flags, extents |
| `cad.entities.where(predicate)` | Model-space snapshots matching the predicate |
| `cad.entities.byId(id)` | One snapshot, or `undefined` |
| `cad.entities.inBox(min, max)` | Snapshots whose scene bounds meet a WCS box |
| `cad.selection` | `ids`, `replace`, `add`, `remove`, `clear` |
| `cad.view.zoomExtents()` | Fit the view to the drawing |
| `cad.log(...)` | Lines returned on the tool result |
| `cad.edit.transaction(label, tx => {})` | One undo group |

Inside the transaction, `tx` can `drawLine`, `drawCircle`, `drawArc`,
`drawRectangle`, `drawPolyline`, `drawText`, `erase`, `setLayer`, `move`,
`rotate`, `createLayer`, and `setCurrentLayer`. Draw methods return the new
entity id. Draw argument shapes match the fixed tools.

Snapshot `geometry` for common types:

- Circle: `center`, `radius`
- Line: `start`, `end`
- Arc: `center`, `radius`, `startAngle`, `endAngle` (radians as stored on the entity) plus degree copies
- Ellipse: `center`, `majorRadius`, `minorRadius`
- Polyline: `points`, `closed`
- Text / MText: `position`, `text`, `height`
- Point: `position`
- Ray / Xline: `basePoint`, `unitDir`
- Insert: `name`, `position`, `rotation`, `scale`

Other entity types still return `id`, `type`, `layer`, and `extents`. The first
version iterates model space only.

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

- `@mlightcad/cad-simple-viewer`
- `@mlightcad/data-model`

Direct dependencies: `zod`, `acorn`.
