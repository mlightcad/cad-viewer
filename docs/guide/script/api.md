---
title: Script API
---

# Script API

Scripts interact with the drawing through the `cad` object. Only members declared in `CAD_SCRIPT_API_TREE` can be accessed; all other properties will trigger an `unknown_api` error.

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

Used to query entities in model space.

### `cad.entities.where(predicate)`

Filters entity snapshots by a condition and returns an array of matching snapshots.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

Retrieves a single snapshot by entity ID. Returns `undefined` if not found.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('Type:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

Returns all entity snapshots within the specified WCS bounding box.

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### Entity Snapshot (EntitySnapshot)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Entity object ID |
| `type` | `string` | Entity type, without the `AcDb` prefix, e.g. `Circle`, `Line` |
| `layer` | `string` | Layer name the entity resides on |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | World coordinate system extents |
| `geometry` | `object \| undefined` | Type-specific geometry data |

Supported `geometry` types:

| Entity Type | `geometry` Fields |
|-------------|-------------------|
| `Circle` | `{ center: {x,y,z}, radius }` |
| `Line` | `{ start: {x,y,z}, end: {x,y,z} }` |
| `Arc` | `{ center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Ellipse` | `{ center: {x,y,z}, majorRadius, minorRadius }` |
| `Polyline` | `{ points: Array<{x,y,z}>, closed }` |
| `Text` | `{ position: {x,y,z}, text, height }` |
| `MText` | `{ position: {x,y,z}, text, height }` |
| `Point` | `{ position: {x,y,z} }` |
| `Ray` / `Xline` | `{ basePoint: {x,y,z}, unitDir: {x,y,z} }` |
| `BlockReference` (Insert) | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

Angle fields `startAngle` / `endAngle` are in radians; `startAngleDeg` / `endAngleDeg` are in degrees.

## cad.selection

Used to highlight and select entities.

### `cad.selection.ids()`

Returns an array of currently selected entity IDs.

```javascript
const ids = cad.selection.ids()
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
