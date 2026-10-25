---
title: Script Examples
---

# Script Examples

The following examples demonstrate common script use cases. Copy them into the script panel to run.

## Count Entities

Count the number of each entity type in the drawing.

```javascript
const counts = {}
for (const entity of cad.entities.where(() => true)) {
  counts[entity.type] = (counts[entity.type] || 0) + 1
}
return {
  title: cad.drawing.title,
  currentLayer: cad.drawing.currentLayer,
  counts
}
```

## Count Circles by Layer and Highlight

Find the layer with the most circles and highlight all entities on that layer.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
const counts = {}
for (const c of circles) {
  counts[c.layer] = (counts[c.layer] || 0) + 1
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

## Find Large-Radius Circles

Filter circles with a radius greater than 100 and output their center coordinates.

```javascript
const bigCircles = cad.entities
  .where(e => e.type === 'Circle' && e.geometry.radius > 100)
  .map(e => ({
    id: e.id,
    layer: e.layer,
    center: e.geometry.center,
    radius: e.geometry.radius
  }))
return bigCircles
```

## Draw a Rectangle at a Specified Area

Draw a rectangle at the specified WCS coordinates.

```javascript
cad.edit.transaction('Draw rectangle', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## Move All Entities on a Layer

Move all entities on the "标注" layer 1000 units to the right.

```javascript
const targetLayer = '标注'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('Move annotation layer', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## Batch Create Text

Create multiple text objects at specified positions.

```javascript
const texts = [
  { x: 0, y: 0, content: '起点' },
  { x: 50, y: 50, content: '终点' }
]
cad.edit.transaction('Batch create text', tx => {
  for (const t of texts) {
    tx.drawText({
      position: { x: t.x, y: t.y },
      text: t.content,
      height: 20
    })
  }
})
return { created: texts.length }
```

## Calculate Total Polyline Length

Calculate the total length of all polylines.

```javascript
let total = 0
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    total += Math.sqrt(dx * dx + dy * dy)
  }
}
return { totalLength: total.toFixed(2) }
```

## Highlight and Zoom to a Specified Area

Add all entities within the specified rectangular area to the selection set and zoom to that area.

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```

## Count entities per block

Model space and paper space are blocks too.

```javascript
return cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  count: block.entities.length
}))
```

## Find circles outside model space

`ownerId` is the block that contains the entity.

```javascript
const model = cad.blocks.find(block => block.isModelSpace)
const circles = cad.entities
  .where(entity => entity.type === 'Circle' && entity.ownerId !== model.id)
  .map(entity => ({
    id: entity.id,
    ownerId: entity.ownerId,
    layer: entity.layer,
    radius: entity.geometry.radius
  }))
return circles
```

## Read the layer table

Symbol-table records include color, linetype, and plot state. `cad.drawing.layers` is the shorter on/frozen/locked list.

```javascript
const layers = cad.tables.layerTable.records.map(record => ({
  name: record.name,
  isOff: record.isOff,
  isFrozen: record.isFrozen,
  isLocked: record.isLocked,
  isPlottable: record.isPlottable,
  linetype: record.linetype,
  color: record.color
}))
const styles = cad.tables.textStyleTable.records.map(record => ({
  name: record.name,
  fileName: record.fileName,
  textSize: record.textSize
}))
return { layers, styles }
```

## Save the drawing as DXF

Runs after the script succeeds. The in-app agent downloads the file. `cad-mcp-server` writes the path on disk.

```javascript
cad.file.saveDxf('./plan-out.dxf')
return { saved: true }
```
