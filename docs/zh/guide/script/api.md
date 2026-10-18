---
title: 脚本 API
---

# 脚本 API

脚本中通过 `cad` 对象与图纸交互。只有 `CAD_SCRIPT_API_TREE` 中声明的成员可以被访问，其余属性会触发 `unknown_api` 错误。

## cad.drawing

返回当前图纸的静态信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 图纸标题 |
| `currentLayer` | `string` | 当前图层名 |
| `units` | `number` | 插入单位（INSUNITS） |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | 所有图层列表 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | 模型空间范围 |

```javascript
const info = cad.drawing
cad.log('当前图层:', info.currentLayer)
cad.log('图层总数:', info.layers.length)
```

## cad.entities

用于查询模型空间中的实体。

### `cad.entities.where(predicate)`

根据条件筛选实体快照，返回匹配的快照数组。

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

根据实体 ID 获取单个快照，找不到时返回 `undefined`。

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('类型:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

返回位于 WCS 矩形框内的所有实体快照。

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### 实体快照（EntitySnapshot）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 实体对象 ID |
| `type` | `string` | 实体类型，不含 `AcDb` 前缀，如 `Circle`、`Line` |
| `layer` | `string` | 所在图层名 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | 世界坐标系范围 |
| `geometry` | `object \| undefined` | 类型相关的几何数据 |

支持的 `geometry` 类型：

| 实体类型 | `geometry` 字段 |
|----------|----------------|
| `Circle` | `{ center: {x,y,z}, radius }` |
| `Line` | `{ start: {x,y,z}, end: {x,y,z} }` |
| `Arc` | `{ center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Ellipse` | `{ center: {x,y,z}, majorRadius, minorRadius }` |
| `Polyline` | `{ points: Array<{x,y,z}>, closed }` |
| `Text` | `{ position: {x,y,z}, text, height }` |
| `MText` | `{ position: {x,y,z}, text, height }` |
| `Point` | `{ position: {x,y,z} }` |
| `Ray` / `Xline` | `{ basePoint: {x,y,z}, unitDir: {x,y,z} }` |
| `BlockReference`（Insert） | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

角度字段 `startAngle` / `endAngle` 使用弧度，`startAngleDeg` / `endAngleDeg` 使用度数。

## cad.selection

用于高亮和选择实体。

### `cad.selection.ids()`

返回当前已选中实体 ID 数组。

```javascript
const ids = cad.selection.ids()
```

### `cad.selection.replace(ids)`

清空选择集并设置为指定 ID 列表。

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

将指定 ID 加入当前选择集。

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

从当前选择集中移除指定 ID。

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

清空选择集。

```javascript
cad.selection.clear()
```

## cad.view

用于控制视图。

### `cad.view.zoomExtents()`

将视图缩放到模型空间范围。

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

执行编辑操作，所有修改会作为一个撤销组。图纸必须处于可编辑状态（非只读模式）。

```javascript
cad.edit.transaction('批量修改', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

事务中可用的方法：

### 绘图方法

| 方法 | 参数 | 返回值 |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | 新实体 ID |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | 新实体 ID |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | 新实体 ID |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | 新实体 ID |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 新实体 ID |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | 新实体 ID |

### 编辑方法

| 方法 | 参数 | 返回值 |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | 删除的实体数量 |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | 移动的实体数量 |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | 旋转的实体数量 |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

向结果面板输出日志信息。

```javascript
cad.log('实体数量:', count)
cad.log({ layer: '0', count })
```

## 返回值

脚本中可以使用 `return` 返回任意可 JSON 序列化的值。返回值会显示在结果面板中。

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

如果返回值超过 65536 个字符，会被截断并标记为 `truncated`。
