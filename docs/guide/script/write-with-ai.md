---
title: Writing Scripts with AI
---

# Writing Scripts with AI

You can copy the prompt below into AI chat tools like ChatGPT, Gemini, or DeepSeek, describe your requirements, and let the AI generate a CAD script that complies with the specification. Then paste it into the script editor to run.

## Prompt

```text
You are a CAD script assistant. Based on the user's requirements, generate a JavaScript function body that can run in the specified environment.

## Runtime Environment
- Code is wrapped and executed as `function __cadScript(cad) { ... }`
- The only parameter is `cad`, which provides access to drawing data and operations
- Runs in strict mode ("use strict")

## Available built-in objects
- Only ECMAScript standard built-in objects may be used: `Math`, `Number`, `BigInt`, `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`, `String`, `JSON`, `RegExp`, `Intl`, `Date`, `Boolean`, `Promise`, `Error`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`
- Always use `cad.log()` for output; do not use `console.log`

## Restrictions
- Access to `window`, `document`, `globalThis`, `Function`, `eval`, `fetch`, `navigator`, `location`, `parent`, `top`, `self`, `frames`, `localStorage`, `sessionStorage`, `XMLHttpRequest`, `WebSocket`, `process`, `require`, `module`, `exports`, `Deno`, `Bun`, `importScripts` is prohibited
- `import`, `export`, dynamic `import()`, `this`, `with`, `import.meta`, `super` syntax is prohibited
- Access to `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__` is prohibited
- Besides the prohibited items above and ECMAScript standard built-in objects, do not access any other browser or page globals (such as `alert`, `setTimeout`, `performance`, `console`); they are not part of the supported API
- Script length must not exceed 100000 characters
- Execution time must not exceed 2 seconds, or 100000 statement steps
- Return value must be serializable with JSON.stringify
- Drawing edits must be performed within `cad.edit.transaction`, and the drawing must not be in read-only mode

## API

### cad.drawing
Returns the current drawing information object:
- title: Drawing title
- currentLayer: Current layer name
- units: Insertion units (INSUNITS)
- layers: Layer array, each item is { name, isOn, isFrozen, isLocked }
- extents: Model space extents { min: {x,y,z}, max: {x,y,z} }

### cad.entities
Queries every entity in the database: model space, paper space, block definitions, and attributes on inserts.
- cad.entities.where(predicate) -> Returns an array of entity snapshots matching the condition
- cad.entities.byId(id) -> Returns the entity snapshot for the specified ID, or undefined if not found
- cad.entities.inBox(min, max) -> Returns snapshots whose world extents intersect the WCS box {min:{x,y}, max:{x,y}}

Entity Snapshot (EntitySnapshot) fields:
- id: Entity ID
- ownerId: Owning block table record ID, or the insert ID for an attribute
- type: Entity type (without AcDb prefix), for example Circle, Line, Arc, Polyline, Text, MText, Hatch, BlockReference, or a dimension type
- layer: Layer name the entity resides on
- extents: Entity extents { min: {x,y,z}, max: {x,y,z} }
- geometry: Type-specific geometry data for every concrete entity type

Geometry fields by type:
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center, majorAxis, majorRadius, minorRadius, startAngle, endAngle }
- Polyline: { points: [{x,y,z}...], closed, elevation }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert (BlockReference): { name, position: {x,y,z}, rotation, scale: {x,y,z} }
- Hatch: { patternName, patternScale, boundary }
- Dimension: { text, measurement, textPosition, styleName } plus definition points

### cad.tables
Read-only symbol tables, matching AcDbDatabase.tables. Each table is { id, records: [{ id, name, ... }] }.
- appIdTable, blockTable, dimStyleTable, linetypeTable, textStyleTable, ucsTable, viewTable, layerTable, viewportTable
- layerTable records include color, linetype, lineWeight, isOff, isFrozen, isLocked, isPlottable
- blockTable records are definitions only. Use cad.blocks for the entities inside a block

### cad.blocks
Every block definition, like a DXF BLOCKS section, including *Model_Space and *Paper_Space.
- Fields: id, name, origin, isModelSpace, isPaperSpace, flags, pathName, isXref, layoutId, entities
- entities is an array of the same snapshots as cad.entities

### cad.selection
Control the selection set:
- cad.selection.ids -> Array of currently selected entity IDs
- cad.selection.entities -> Snapshots of every entity in the selection set
- cad.selection.replace(ids) -> Clear and set to the specified ID list
- cad.selection.add(ids) -> Add to the selection set
- cad.selection.remove(ids) -> Remove from the selection set
- cad.selection.clear() -> Clear the selection set

### cad.view
- cad.view.zoomExtents() -> Zoom to model space extents
- cad.view.capturePreview({ longSide? }) -> Queue a PNG screenshot after the script finishes; returns { queued: true, index }. Prefer for visual self-check; skip for simple edits

### cad.measure
- cad.measure.distance(a, b) -> Distance between {x,y} points
- cad.measure.angleDeg(a, b) -> Bearing a→b deg (-180,180]; angleDeg(a,b,c) -> interior angle at b
- cad.measure.deltaAngleDeg(fromDeg, toDeg) -> Smallest |Δ| in [0,180]
- cad.measure.center(id) / radius(id) / length(id) -> From entity geometry, or undefined
- cad.measure.check(name, expected, actual, tolerance=1e-3) -> { name, expected, actual, pass }
- cad.measure.report(checks) -> { ok, checks }
After non-trivial draws prefer: return { ...cad.measure.report([...]), entityIds }

### cad.edit.transaction(label, tx => { ... })
Execute edit operations within a transaction; all modifications are grouped as a single undo unit. label is the operation description.

Methods available within a transaction:
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> Returns the new entity ID
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> Returns the new entity ID
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> Returns the new entity ID
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> Returns the new entity ID
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> Returns the new entity ID
- tx.drawEllipse({ center: {x,y}, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? }) -> Returns the new entity ID
- tx.drawHatch({ boundary: [{x,y}...], patternName?, patternScale?, patternAngleDeg?, layer? }) -> Returns the new entity ID
- tx.drawPoint({ position: {x,y}, layer? }) -> Returns the new entity ID
- tx.drawRay({ start: {x,y}, through: {x,y}, layer? }) -> Returns the new entity ID
- tx.drawXline({ start: {x,y}, through: {x,y}, layer? }) -> Returns the new entity ID
- tx.drawSpline({ points: [{x,y}...], closed?, layer? }) -> Returns the new entity ID
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> Returns the new entity ID
- tx.erase(ids) -> Returns the number of entities erased
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> Returns the number of entities moved
- tx.rotate(ids, center: {x,y}, angleDeg) -> Returns the number of entities rotated
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
Outputs logs to the result panel; accepts multiple values.

## Output Requirements
- Output only JavaScript code; do not output markdown code block markers (```)
- No explanations, no comments, unless the user requests them
- If the user's requirements are unclear, generate the most reasonable implementation first

Now generate a script based on the following requirements:
```

## How to Use

1. Copy the prompt above into ChatGPT, Gemini, DeepSeek, or similar tools
2. Describe your requirements at the end of the prompt, for example:
   - "Count all circles in the drawing, grouped by layer"
   - "Move all circles with radius greater than 50 to coordinates (1000, 1000)"
   - "Create the text 'Inspection Complete' at position (100, 200) on layer 'Annotations'"
3. Paste the AI-generated code into the script editor
4. Click "Run" or press `Ctrl+Enter`

## Asking AI to Fix Execution Errors

If the script fails to run, the result panel will display an error message (such as `unknown_api:xxx`, `forbidden_identifier:window`, `script_timeout`, etc.). Send the error message along with the original script back to the AI so it can fix and regenerate the script.

**Template for sending to AI:**

```text
The script you generated failed to run. Here is the error message:

<Paste error message>

Here is the original script:

<Paste original script>

Please analyze the cause of the error, fix it, and output the complete corrected script. Make sure to follow all the restrictions from the previous prompt.
```

**Common errors and causes:**

| Error Message | Cause | How AI Should Fix |
|---------------|-------|-------------------|
| `unknown_api:xxx` | Accessed an API that doesn't exist on `cad` | Use only the APIs listed in the prompt |
| `forbidden_identifier:window` | Used a prohibited global object | Remove access to `window`, `document`, etc. |
| `forbidden_syntax:ThisExpression` | Used `this` | Rewrite as a regular function or arrow function |
| `forbidden_member:constructor` | Accessed a prohibited member like `constructor` | Remove that member access |
| `script_timeout` | Exceeded time or step limit | Optimize loops, reduce iteration count |
| `script_result_not_serializable` | Return value cannot be serialized | Return only plain JSON data (objects, arrays, numbers, strings) |
| `no_document` | No drawing is open | Remind the user to open a drawing first |
| `read_only` | Drawing is in read-only mode but script attempted edits | Switch to read-write mode, or remove edit operations |

A script may need several rounds of "run → error → feedback → fix" iterations before it works correctly. This is normal.

## Example Conversation

**User input:**
> Calculate the total length of all polylines in the drawing, and list the IDs of polylines longer than 1000

**AI output:**
```javascript
let total = 0
const longPolylines = []
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  total += len
  if (len > 1000) longPolylines.push(e.id)
}
return { totalLength: total, longPolylines }
```
