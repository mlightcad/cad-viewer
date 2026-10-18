---
title: Script API
---

# Script API

Scripts interact with the drawing through the `cad` object. Only members declared in `CAD_SCRIPT_API_TREE` can be accessed; all other properties will trigger an `unknown_api` error.

## Execution Environment and Browser APIs

Scripts run in a strict-mode sandbox in the browser and can only access the `cad` object and ECMAScript standard built-in objects. They cannot manipulate the page DOM or make network requests.

### Available built-in objects

All ECMAScript standard built-in objects are available:

- Math and numbers: `Math`, `Number`, `BigInt`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`
- Data structures: `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`
- Text and formatting: `String`, `JSON`, `RegExp`, `Intl`, `encodeURIComponent`, `decodeURIComponent`
- Time: `Date` (`Date.now()` can be used to measure the script's own execution time)
- Others: `Boolean`, `Promise`, `Error` and its subclasses

Use `cad.log()` to output information instead of relying on `console.log` — the result panel only displays the content of `cad.log`.

### Blocked browser APIs

The following are rejected outright during script validation, triggering `forbidden_identifier` / `forbidden_syntax` / `forbidden_member` errors:

- Page and DOM: `window`, `document`, `globalThis`
- Network and communication: `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`
- Device and environment: `navigator`, `location`, `parent`, `top`, `self`, `frames` (shadowed as `undefined` at runtime)
- Storage: `localStorage`, `sessionStorage`
- Dynamic execution: `eval`, `Function`
- Other runtimes: `process`, `require`, `module`, `exports`, `Deno`, `Bun`
- Syntax: `import` / `export` statements, dynamic `import()`, `this`, `with`, `import.meta`, `super`
- Escape hatches: `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`

::: warning
Besides the banned objects above, other browser globals (such as `alert`, `setTimeout`, `performance`, and `console`) may not be fully intercepted technically, but they are not part of the supported API. Scripts should rely only on the `cad` object and ECMAScript standard built-in objects; other accesses may be further restricted in future versions.
:::

## cad.drawing

Returns static information about the current drawing.

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Drawing title |
| `currentLayer` | `string` | Current layer name |
| `units` | `number` | Insertion units (INSUNITS) |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | List of all layers |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Model space extents |

```javascript
const info = cad.drawing
cad.log('Current layer:', info.currentLayer)
cad.log('Total layers:', info.layers.length)
```

## cad.entities

Queries every entity in the database. This is the same kind of list as a DXF ENTITIES section, except it is not limited to model space: model space, every paper space, and every block definition are included. Attributes on a block reference follow that reference, and their `ownerId` is the reference. Every other entity's `ownerId` is the block table record that owns it.

### `cad.entities.where(predicate)`

Filters entity snapshots by a condition and returns an array of matching snapshots.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

Retrieves a single snapshot by entity ID, including entities outside model space. Returns `undefined` if not found.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('Type:', entity.type, 'Owner:', entity.ownerId)
}
```

### `cad.entities.inBox(min, max)`

Returns snapshots whose world extents intersect the given rectangle. Entities in block definitions and paper space are included.

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### Entity Snapshot (EntitySnapshot)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Entity object ID |
| `ownerId` | `string` | Owning block table record ID, or the block reference ID for an attribute |
| `type` | `string` | Entity type, without the `AcDb` prefix, e.g. `Circle`, `Line` |
| `layer` | `string` | Layer name the entity resides on |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | World coordinate system extents |
| `geometry` | `object \| undefined` | Type-specific geometry data |

`geometry` is filled for every concrete entity type in `@mlightcad/data-model`. Common fields:

| Entity Type | `geometry` Fields |
|-------------|-------------------|
| `Circle` | `{ center, radius }` |
| `Line` | `{ start, end }` |
| `Arc` | `{ center, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Ellipse` | `{ center, majorAxis, majorRadius, minorRadius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Polyline` | `{ points, closed, elevation }` |
| `2dPolyline` / `3dPolyline` | `{ points, closed, polyType }` |
| `Spline` | `{ points, closed, fitTolerance, knotTolerance, normal }` |
| `Point` / `2dVertex` / `3dVertex` | `{ position }` |
| `Ray` / `Xline` | `{ basePoint, unitDir }` |
| `Text` | `{ position, text, height, rotation, styleName }` |
| `MText` | `{ position, text, height, width, rotation, styleName, attachmentPoint }` |
| `Attribute` | Text fields plus `{ tag, invisible }` |
| `AttributeDefinition` | Text fields plus `{ tag, prompt, invisible }` |
| `ArcAlignedText` | `{ text, height, center, radius, startAngle, endAngle, styleName, arcId }` |
| `BlockReference` | `{ name, position, rotation, scale }` |
| `Table` | Insert fields plus `{ rows, columns }` |
| `Hatch` | `{ patternName, patternType, patternAngle, patternScale, isSolidFill, isGradient, elevation, associative, boundary }` |
| `Leader` | `{ vertices, dimensionStyle, hasArrowHead }` |
| `MLeader` | `{ contents, textLocation, textHeight, textRotation, landingPoint, contentType, numberOfLeaders }` |
| `MLine` | `{ styleName, scale, justification, closed, startPosition, vertices }` |
| `Solid` / `Trace` / `Face` | `{ points }` |
| `PolyFaceMesh` | `{ vertices, faces }` |
| `PolygonMesh` | `{ mCount, nCount, closedM, closedN, vertices }` |
| `RasterImage` / `Wipeout` | `{ position, rotation, width, height, imageFileName, imageDisplayName, isClipped }` |
| `Ole2Frame` | `{ upperLeft, lowerRight, userType, oleObjectType }` |
| `Viewport` | `{ number, center, width, height, viewCenter, viewTarget, viewHeight, viewTwistAngle }` |
| `Shape` | `{ name, position, size, rotation, styleName }` |
| `Fcf` | `{ position, text, dimensionStyle }` |
| `3dSolid` | `{ version, guid, hasRenderableGeometry }`. ACIS body data is omitted |
| `ProxyEntity` | `{ originalDxfName, originalClassName, applicationName }`. Proxy graphics bytes are omitted |
| Dimension types | `{ text, measurement, textPosition, styleName, rotation }` plus definition points such as `xLine1Point`, `chordPoint`, or `definingPoint` |

Points are `{ x, y, z }`. `startAngle` / `endAngle` are radians. `startAngleDeg` / `endAngleDeg` are degrees.

## cad.tables

Read-only access to every symbol table, matching `AcDbDatabase.tables`. Each table is `{ id, records }`. Every record has at least `id` and `name`, plus fields for that table.

| Property | Contents |
|----------|----------|
| `appIdTable` | Registered application names |
| `blockTable` | Block table records. Definitions only; entities are on `cad.blocks` |
| `dimStyleTable` | Dimension styles, including variables such as `dimtxt` and `dimscale` |
| `linetypeTable` | Linetypes: `numDashes`, `patternLength`, `comments` |
| `textStyleTable` | Text styles: `fileName`, `textSize`, `xScale` |
| `ucsTable` | Named UCSs: `origin`, `xAxis`, `yAxis` |
| `viewTable` | Named views |
| `layerTable` | Layers: `color`, `linetype`, `lineWeight`, `isOff`, `isFrozen`, `isLocked`, `isPlottable` |
| `viewportTable` | Model-space VPORT records (`*Active` and named views), not paper-space `Viewport` entities |

```javascript
const layers = cad.tables.layerTable.records
  .filter(record => !record.isOff)
  .map(record => record.name)
return layers
```

A layer color is `{ red, green, blue, colorIndex, isByACI, isByLayer, isByBlock }`.

## cad.blocks

Returns every block definition, in the same role as a DXF BLOCKS section. `*Model_Space` and each `*Paper_Space` are included.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Block table record ID. Also the `ownerId` of entities in the block |
| `name` | `string` | Block name |
| `origin` | `{ x, y, z }` | Base point |
| `isModelSpace` | `boolean` | True for model space |
| `isPaperSpace` | `boolean` | True for a paper-space layout block |
| `flags` | `number` | BLOCK group code 70 |
| `pathName` | `string` | Xref path. Empty for a local block |
| `isXref` | `boolean` | True when the block is an external reference |
| `layoutId` | `string \| undefined` | Associated layout ID |
| `entities` | `EntitySnapshot[]` | Entities stored directly in the block |

```javascript
const widget = cad.blocks.find(block => block.name === 'Widget')
return {
  count: widget ? widget.entities.length : 0,
  types: widget ? widget.entities.map(entity => entity.type) : []
}
```

## cad.selection

Used to highlight and select entities.

### `cad.selection.ids`

The currently selected entity IDs. This is a property, not a method.

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

Snapshots of every entity in the selection set. Ids that no longer exist are omitted. Each snapshot has the same fields as `cad.entities.byId`, including `ownerId`.

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
```

### `cad.selection.replace(ids)`

Clears the selection set and replaces it with the specified ID list.

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

Adds the specified IDs to the current selection set.

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

Removes the specified IDs from the current selection set.

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

Clears the selection set.

```javascript
cad.selection.clear()
```

## cad.view

Used to control the view.

### `cad.view.zoomExtents()`

Zooms the view to the model space extents.

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

Executes edit operations. All modifications are grouped as a single undo unit. The drawing must be in an editable state (not read-only mode).

```javascript
cad.edit.transaction('Batch modify', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

Methods available within a transaction:

### Drawing Methods

| Method | Parameters | Return Value |
|--------|-----------|--------------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | New entity ID |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | New entity ID |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | New entity ID |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | New entity ID |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | New entity ID |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | New entity ID |

### Edit Methods

| Method | Parameters | Return Value |
|--------|-----------|--------------|
| `tx.erase(ids)` | `string[]` | Number of entities erased |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | Number of entities moved |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | Number of entities rotated |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

Outputs log messages to the result panel.

```javascript
cad.log('Entity count:', count)
cad.log({ layer: '0', count })
```

## Return Values

Scripts can use `return` to return any JSON-serializable value. The return value is displayed in the result panel.

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

If the return value exceeds 65536 characters, it will be truncated and marked as `truncated`.
