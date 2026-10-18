---
title: أمثلة على البرامج النصية
---

# أمثلة على البرامج النصية

توضح الأمثلة التالية الاستخدامات الشائعة للبرامج النصية. انسخها إلى لوحة البرنامج النصي لتشغيلها مباشرة.

## إحصاء عدد الكيانات

إحصاء عدد كل نوع من الكيانات في الرسم.

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

## إحصاء الدوائر حسب الطبقة وتمييزها

العثور على الطبقة التي تحتوي على أكبر عدد من الدوائر، وتمييز جميع الكيانات الموجودة في تلك الطبقة.

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

## البحث عن دوائر بنصف قطر كبير

ترشيح الدوائر التي يزيد نصف قطرها عن 100، وإخراج إحداثيات مراكزها.

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

## رسم مستطيل في منطقة محددة

رسم مستطيل عند إحداثيات WCS محددة.

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

## نقل جميع الكيانات الموجودة في طبقة معينة

نقل جميع الكيانات الموجودة في طبقة «الأبعاد» بمقدار 1000 وحدة إلى اليمين.

```javascript
const targetLayer = '标注'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('移动标注图层', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## إنشاء نصوص بشكل جماعي

إنشاء عدة كائنات نصية في مواقع محددة.

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

## حساب الطول الإجمالي للخطوط المتعددة

حساب الطول الإجمالي لجميع الخطوط المتعددة.

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

## تمييز وتحديد منطقة معينة

إضافة جميع الكيانات الواقعة داخل النطاق المستطيل المحدد إلى مجموعة التحديد، والتكبير إلى ذلك النطاق.

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```

## عدد الكيانات في كل كتلة

مساحة النموذج ومساحة الورق كتلتان أيضًا.

```javascript
return cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  count: block.entities.length
}))
```

## الدوائر خارج مساحة النموذج

`ownerId` هو الكتلة التي تحتوي الكيان.

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

## قراءة جدول الطبقات

سجلات جدول الرموز تتضمن اللون ونوع الخط وإمكانية الطباعة.

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
