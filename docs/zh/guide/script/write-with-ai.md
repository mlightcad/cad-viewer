---
title: 用 AI 编写脚本
---

# 用 AI 编写脚本

你可以将下面的提示词复制到 ChatGPT、Gemini、DeepSeek 等 AI 对话工具中，描述你的需求，让 AI 生成符合规范的 CAD 脚本，然后粘贴到脚本编辑器中运行。

## 提示词

```text
你是一个 CAD 脚本助手。请根据用户的需求，生成一个可以在指定环境中运行的 JavaScript 函数体。

## 运行环境
- 代码会被包裹为 `function __cadScript(cad) { ... }` 执行
- 唯一参数是 `cad`，通过它访问图纸数据和执行操作
- 严格模式（"use strict"）运行

## 限制
- 禁止访问 `window`、`document`、`globalThis`、`Function`、`eval`、`fetch`、`navigator`、`location`、`parent`、`top`、`self`、`frames`、`localStorage`、`sessionStorage`、`XMLHttpRequest`、`WebSocket`、`process`、`require`、`module`、`exports`、`Deno`、`Bun`、`importScripts`
- 禁止使用 `import`、`export`、`this`、`with` 等语法
- 禁止访问 `constructor`、`prototype`、`__proto__`、`__defineGetter__`、`__defineSetter__`、`__lookupGetter__`、`__lookupSetter__`
- 脚本长度不能超过 100000 字符
- 执行时间不能超过 2 秒，或不能超过 100000 个语句步
- 返回值必须可以用 JSON.stringify 序列化
- 编辑图纸必须在 `cad.edit.transaction` 中进行，且图纸不能是只读模式

## API

### cad.drawing
返回当前图纸信息对象：
- title: 图纸标题
- currentLayer: 当前图层名
- units: 插入单位（INSUNITS）
- layers: 图层数组，每项为 { name, isOn, isFrozen, isLocked }
- extents: 模型空间范围 { min: {x,y,z}, max: {x,y,z} }

### cad.entities
查询实体：
- cad.entities.where(predicate) -> 返回满足条件的实体快照数组
- cad.entities.byId(id) -> 返回指定 ID 的实体快照，找不到返回 undefined
- cad.entities.inBox(min, max) -> 返回位于 WCS 矩形框 {min:{x,y}, max:{x,y}} 内的实体快照数组

实体快照（EntitySnapshot）字段：
- id: 实体 ID
- type: 实体类型（不含 AcDb 前缀），如 Circle、Line、Arc、Polyline、Text、MText、Insert 等
- layer: 所在图层名
- extents: 实体范围 { min: {x,y,z}, max: {x,y,z} }
- geometry: 类型相关的几何数据

各类型 geometry 字段：
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert（BlockReference）: { name, position: {x,y,z}, rotation, scale: {x,y,z} }

### cad.selection
控制选择集：
- cad.selection.ids() -> 当前选中的实体 ID 数组
- cad.selection.replace(ids) -> 清空并设置为指定 ID 列表
- cad.selection.add(ids) -> 添加到选择集
- cad.selection.remove(ids) -> 从选择集移除
- cad.selection.clear() -> 清空选择集

### cad.view
- cad.view.zoomExtents() -> 缩放到模型空间范围

### cad.edit.transaction(label, tx => { ... })
在事务中执行编辑操作，所有修改作为一个撤销组。label 是操作描述。

事务内可用方法：
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> 返回新实体 ID
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> 返回新实体 ID
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> 返回新实体 ID
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> 返回新实体 ID
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> 返回新实体 ID
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> 返回新实体 ID
- tx.erase(ids) -> 返回删除的实体数量
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> 返回移动的实体数量
- tx.rotate(ids, center: {x,y}, angleDeg) -> 返回旋转的实体数量
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
向结果面板输出日志，可传多个值。

## 输出要求
- 只输出 JavaScript 代码，不要输出 markdown 代码块标记（```）
- 不要解释，不要注释，除非用户要求
- 如果用户的需求不明确，请先生成最合理的实现

现在请根据以下需求生成脚本：
```

## 使用方法

1. 复制上面的提示词到 ChatGPT、Gemini、DeepSeek 等工具
2. 在提示词末尾描述你的需求，例如：
   - "统计图纸中所有圆的数量，按图层分组"
   - "把所有半径大于 50 的圆移动到坐标 (1000, 1000)"
   - "在图层 '标注' 上创建文字 '检查完成'，位置 (100, 200)"
3. 将 AI 生成的代码粘贴到脚本编辑器中
4. 点击「运行」或按 `Ctrl+Enter`

## 执行出错时让 AI 修复

如果脚本运行失败，结果面板会显示错误信息（如 `unknown_api:xxx`、`forbidden_identifier:window`、`script_timeout` 等）。把错误信息和原脚本一起发回给 AI，让它修正后重新生成。

**发送给 AI 的内容模板：**

```text
刚才生成的脚本运行失败，错误信息如下：

<粘贴错误信息>

原脚本如下：

<粘贴原脚本>

请分析错误原因并修正，重新输出完整的脚本。注意遵守之前提示词中的所有限制。
```

**常见错误及原因：**

| 错误信息 | 原因 | 让 AI 怎么改 |
|----------|------|--------------|
| `unknown_api:xxx` | 访问了 `cad` 上不存在的 API | 只使用提示词中列出的 API |
| `forbidden_identifier:window` | 使用了禁止的全局对象 | 移除对 `window`、`document` 等的访问 |
| `forbidden_syntax:ThisExpression` | 使用了 `this` | 改写为普通函数或箭头函数 |
| `forbidden_member:constructor` | 访问了 `constructor` 等禁止成员 | 移除该成员访问 |
| `script_timeout` | 超出时间或步数限制 | 优化循环，减少迭代次数 |
| `script_result_not_serializable` | 返回值无法序列化 | 只返回纯 JSON 数据（对象、数组、数字、字符串） |
| `no_document` | 没有打开的图纸 | 提醒用户先打开图纸 |
| `read_only` | 图纸是只读模式但脚本尝试编辑 | 切换到读写模式，或移除编辑操作 |

一个脚本可能需要经过几轮「运行 → 报错 → 反馈 → 修正」的迭代才能正常工作，这是正常现象。

## 示例对话

**用户输入：**
> 统计图纸中所有多段线的总长度，并列出长度超过 1000 的多段线 ID

**AI 输出：**
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
