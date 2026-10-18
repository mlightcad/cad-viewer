---
title: 脚本示例
---

# 脚本示例

以下示例演示常见的脚本用法。复制到脚本面板中即可运行。

## 统计实体数量

统计图纸中各类实体的数量。

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

## 按图层统计圆并高亮

找出包含圆最多的图层，并将该图层上所有实体高亮。

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

## 查找大半径圆

筛选半径大于 100 的圆，并输出它们的中心坐标。

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

## 在指定区域画矩形

在指定 WCS 坐标处绘制一个矩形。

```javascript
cad.edit.transaction('画矩形', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## 移动图层上的所有实体

将「标注」图层上的所有实体向右移动 1000 单位。

```javascript
const targetLayer = '标注'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('移动标注图层', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## 批量创建文字

在指定位置创建多个文字对象。

```javascript
const texts = [
  { x: 0, y: 0, content: '起点' },
  { x: 50, y: 50, content: '终点' }
]
cad.edit.transaction('批量创建文字', tx => {
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

## 计算多段线总长度

统计所有多段线的总长度。

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

## 高亮并框选指定区域

将指定矩形范围内的所有实体加入选择集，并缩放到该范围。

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```
