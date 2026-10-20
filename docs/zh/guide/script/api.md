---
title: 脚本 API
---

# 脚本 API

脚本中通过 `cad` 对象与图纸交互。只有 `CAD_SCRIPT_API_TREE` 中声明的成员可以被访问，其余属性会触发 `unknown_api` 错误。

## 执行环境与浏览器 API

脚本在浏览器的严格模式沙箱中运行，只能访问 `cad` 对象和 ECMAScript 标准内置对象，无法操作页面 DOM 或发起网络请求。

### 可用的内置对象

所有 ECMAScript 标准内置对象均可使用：

- 数学与数值：`Math`、`Number`、`BigInt`、`parseFloat`、`parseInt`、`isNaN`、`isFinite`
- 数据结构：`Object`、`Array`、`Map`、`Set`、`WeakMap`、`WeakSet`、`Symbol`
- 文本与格式：`String`、`JSON`、`RegExp`、`Intl`、`encodeURIComponent`、`decodeURIComponent`
- 时间：`Date`（`Date.now()` 可用于统计脚本自身耗时）
- 其他：`Boolean`、`Promise`、`Error` 及其子类

输出信息请使用 `cad.log()`，不要依赖 `console.log`——结果面板只显示 `cad.log` 的内容。

### 被禁止的浏览器 API

以下内容会在脚本校验阶段被直接拒绝，触发 `forbidden_identifier` / `forbidden_syntax` / `forbidden_member` 错误：

- 页面与 DOM：`window`、`document`、`globalThis`
- 网络与通信：`fetch`、`XMLHttpRequest`、`WebSocket`、`importScripts`
- 设备与环境：`navigator`、`location`、`parent`、`top`、`self`、`frames`（运行时被遮蔽为 `undefined`）
- 存储：`localStorage`、`sessionStorage`
- 动态执行：`eval`、`Function`
- 其他运行时：`process`、`require`、`module`、`exports`、`Deno`、`Bun`
- 语法：`import` / `export` 语句、动态 `import()`、`this`、`with`、`import.meta`、`super`
- 逃逸通道：`constructor`、`prototype`、`__proto__`、`__defineGetter__`、`__defineSetter__`、`__lookupGetter__`、`__lookupSetter__`

::: warning
除上述被禁止的对象外，其他浏览器全局变量（如 `alert`、`setTimeout`、`performance`、`console`）在技术上可能未被完全拦截，但它们不属于受支持的 API。脚本应只依赖 `cad` 对象和 ECMAScript 标准内置对象，其余访问可能在后续版本中被进一步限制。
:::

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

查询数据库中的全部实体。范围与 DXF 的 ENTITIES 段同一类数据，但不仅限于模型空间：模型空间、每个图纸空间，以及每个块定义里的实体都会返回。块参照上的属性跟在该参照之后，`ownerId` 指向块参照；其余实体的 `ownerId` 指向所属块表记录。

### `cad.entities.where(predicate)`

根据条件筛选实体快照，返回匹配的快照数组。

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

根据实体 ID 获取单个快照，找不到时返回 `undefined`。模型空间以外的实体也可以用这个方法读取。

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('类型:', entity.type, '所属:', entity.ownerId)
}
```

### `cad.entities.inBox(min, max)`

返回世界坐标范围与指定矩形相交的实体快照。比较的是实体的 `extents`，因此块定义和图纸空间里的实体也会命中。

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### 实体快照（EntitySnapshot）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 实体对象 ID |
| `ownerId` | `string` | 所属块表记录的 ID。属性实体则为所属块参照的 ID |
| `type` | `string` | 实体类型，不含 `AcDb` 前缀，如 `Circle`、`Line` |
| `layer` | `string` | 所在图层名 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | 世界坐标系范围 |
| `geometry` | `object \| undefined` | 类型相关的几何数据 |

`geometry` 覆盖 `@mlightcad/data-model` 中的全部具体实体类型。常用字段如下：

| 实体类型 | `geometry` 字段 |
|----------|----------------|
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
| `Attribute` | 文字字段，另加 `{ tag, invisible }` |
| `AttributeDefinition` | 文字字段，另加 `{ tag, prompt, invisible }` |
| `ArcAlignedText` | `{ text, height, center, radius, startAngle, endAngle, styleName, arcId }` |
| `BlockReference` | `{ name, position, rotation, scale }` |
| `Table` | 块参照字段，另加 `{ rows, columns }` |
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
| `3dSolid` | `{ version, guid, hasRenderableGeometry }`。不包含 ACIS 体数据 |
| `ProxyEntity` | `{ originalDxfName, originalClassName, applicationName }`。不包含代理图形二进制 |
| 各类 `Dimension` | `{ text, measurement, textPosition, styleName, rotation }`，并带定义点，如 `xLine1Point`、`chordPoint`、`definingPoint` |

点均为 `{ x, y, z }`。角度字段 `startAngle` / `endAngle` 使用弧度，`startAngleDeg` / `endAngleDeg` 使用度数。

## cad.tables

只读访问数据库中的全部符号表，对应 `AcDbDatabase.tables`。每张表都是 `{ id, records }`。`records` 中的每一项至少包含 `id` 和 `name`，并带有该表特有的字段。

| 属性 | 内容 |
|------|------|
| `appIdTable` | 已注册的应用程序名 |
| `blockTable` | 块表记录。这里只有定义信息，块内实体在 `cad.blocks` |
| `dimStyleTable` | 标注样式，包含 `dimtxt`、`dimscale` 等标注变量 |
| `linetypeTable` | 线型，包含 `numDashes`、`patternLength`、`comments` |
| `textStyleTable` | 文字样式，包含 `fileName`、`textSize`、`xScale` |
| `ucsTable` | 命名用户坐标系，包含 `origin`、`xAxis`、`yAxis` |
| `viewTable` | 命名视图 |
| `layerTable` | 图层，包含 `color`、`linetype`、`lineWeight`、`isOff`、`isFrozen`、`isLocked`、`isPlottable` |
| `viewportTable` | 模型空间视口表记录（`*Active` 等 VPORT），不是图纸空间里的 `Viewport` 实体 |

```javascript
const layers = cad.tables.layerTable.records
  .filter(record => !record.isOff)
  .map(record => record.name)
return layers
```

图层颜色是 `{ red, green, blue, colorIndex, isByACI, isByLayer, isByBlock }`。

## cad.blocks

返回数据库中的全部块定义，对应 DXF 的 BLOCKS 段。模型空间 `*Model_Space` 和各个图纸空间 `*Paper_Space` 也在其中。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 块表记录 ID，也是块内实体的 `ownerId` |
| `name` | `string` | 块名 |
| `origin` | `{ x, y, z }` | 基点 |
| `isModelSpace` | `boolean` | 是否为模型空间 |
| `isPaperSpace` | `boolean` | 是否为图纸空间 |
| `flags` | `number` | BLOCK 组码 70 |
| `pathName` | `string` | 外部参照路径，本地块为空字符串 |
| `isXref` | `boolean` | 是否为外部参照 |
| `layoutId` | `string \| undefined` | 关联的布局 ID |
| `entities` | `EntitySnapshot[]` | 直接存放在该块中的实体 |

```javascript
const widget = cad.blocks.find(block => block.name === 'Widget')
return {
  count: widget ? widget.entities.length : 0,
  types: widget ? widget.entities.map(entity => entity.type) : []
}
```

## cad.selection

用于高亮和选择实体。

### `cad.selection.ids`

当前已选中实体的 ID 数组。这是属性，不是方法。

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

选择集中每个实体的快照。已经不存在的 ID 会被略过。快照字段与 `cad.entities.byId` 相同，包含 `ownerId`。

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
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

### `cad.view.capturePreview({ longSide? })`

排队截取图纸范围的 PNG 截图。截图在脚本主体执行结束后异步完成。返回 `{ queued: true, index }`。在 Agent 对话中，图片会作为工具结果附件交给模型（不会以 JSON data URL 返回）。

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// 可选：cad.view.capturePreview({ longSide: 512 })
```

## cad.measure

绘图后用于数值自检的辅助 API。优先使用这些方法，而不是手写 `Math.hypot` / `atan2`。点均为 WCS 下的 `{ x, y }`。

| 方法 | 返回值 |
|------|--------|
| `cad.measure.distance(a, b)` | 两点距离 |
| `cad.measure.angleDeg(a, b)` | a→b 相对 +X 的方位角，度，范围 (-180, 180] |
| `cad.measure.angleDeg(a, b, c)` | 以 b 为顶点的内角 (a–b–c)，度，范围 [0, 180] |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)` | 两方位角的最小绝对差，范围 [0, 180] |
| `cad.measure.center(id)` | 圆/弧/椭圆圆心，或点/文字位置；否则 `undefined` |
| `cad.measure.radius(id)` | 圆/弧半径或椭圆长半轴；否则 `undefined` |
| `cad.measure.length(id)` | 直线长度或多段线/样条路径长；否则 `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }`（默认容差 `1e-3`） |
| `cad.measure.report(checks)` | `{ ok, checks }` — 全部通过时 `ok` 为 true |

非平凡绘制后推荐的返回格式：

```javascript
const origin = { x: 0, y: 0 }
let circleId = ''
cad.edit.transaction('draw', tx => {
  circleId = tx.drawCircle({ center: { x: 30, y: 40 }, radius: 10 })
})
const center = cad.measure.center(circleId)
return {
  ...cad.measure.report([
    cad.measure.check('r', 10, cad.measure.radius(circleId)),
    cad.measure.check('pcd', 50, cad.measure.distance(origin, center), 0.01)
  ]),
  entityIds: [circleId]
}
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
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}` | 新实体 ID |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })` | `boundary: Array<{x,y}>`（至少 3 点） | 新实体 ID |
| `tx.drawPoint({ position, layer? })` | `position: {x,y}` | 新实体 ID |
| `tx.drawRay({ start, through, layer? })` | `start/through: {x,y}` | 新实体 ID |
| `tx.drawXline({ start, through, layer? })` | `start/through: {x,y}` | 新实体 ID |
| `tx.drawSpline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 新实体 ID |
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
