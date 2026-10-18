---
title: API البرنامج النصي
---

# API البرنامج النصي

يتفاعل البرنامج النصي مع الرسم من خلال الكائن `cad`. يمكن الوصول فقط إلى الأعضاء المُعلن عنهم في `CAD_SCRIPT_API_TREE`، وأي خاصية أخرى ستُطلق خطأ `unknown_api`.

## بيئة التنفيذ وواجهات المتصفح

يعمل البرنامج النصي داخل صندوق حماية (sandbox) في المتصفح وفي الوضع الصارم (strict mode)، ولا يمكنه الوصول إلا إلى الكائن `cad` والكائنات المدمجة القياسية في ECMAScript، ولا يستطيع التعامل مع DOM الخاص بالصفحة أو إرسال طلبات شبكة.

### الكائنات المدمجة المتاحة

جميع الكائنات المدمجة القياسية في ECMAScript متاحة للاستخدام:

- الرياضيات والأرقام: `Math` و`Number` و`BigInt` و`parseFloat` و`parseInt` و`isNaN` و`isFinite`
- هياكل البيانات: `Object` و`Array` و`Map` و`Set` و`WeakMap` و`WeakSet` و`Symbol`
- النصوص والتنسيق: `String` و`JSON` و`RegExp` و`Intl` و`encodeURIComponent` و`decodeURIComponent`
- الوقت: `Date` (يمكن استخدام `Date.now()` لقياس زمن تنفيذ البرنامج النصي نفسه)
- غير ذلك: `Boolean` و`Promise` و`Error` وفئاتها الفرعية

استخدم `cad.log()` لإخراج المعلومات، ولا تعتمد على `console.log` — فلوحة النتائج لا تعرض إلا محتوى `cad.log`.

### واجهات المتصفح المحظورة

يتم رفض العناصر التالية مباشرةً في مرحلة التحقق من البرنامج النصي، مما يُطلق أخطاء `forbidden_identifier` / `forbidden_syntax` / `forbidden_member`:

- الصفحة وDOM: `window` و`document` و`globalThis`
- الشبكة والاتصالات: `fetch` و`XMLHttpRequest` و`WebSocket` و`importScripts`
- الأجهزة والبيئة: `navigator` و`location` و`parent` و`top` و`self` و`frames` (تُحجب إلى `undefined` في وقت التشغيل)
- التخزين: `localStorage` و`sessionStorage`
- التنفيذ الديناميكي: `eval` و`Function`
- بيئات تشغيل أخرى: `process` و`require` و`module` و`exports` و`Deno` و`Bun`
- الصيغ: عبارات `import` / `export`، و`import()` الديناميكية، و`this`، و`with`، و`import.meta`، و`super`
- قنوات التهرب: `constructor` و`prototype` و`__proto__` و`__defineGetter__` و`__defineSetter__` و`__lookupGetter__` و`__lookupSetter__`

::: warning
إلى جانب الكائنات المحظورة أعلاه، قد لا يتم اعتراض متغيرات المتصفح العامة الأخرى (مثل `alert` و`setTimeout` و`performance` و`console`) تقنيًا بشكل كامل، لكنها لا تُعد من واجهات API المدعومة. يجب أن يعتمد البرنامج النصي فقط على الكائن `cad` والكائنات المدمجة القياسية في ECMAScript، وقد يخضع أي وصول آخر إلى قيود إضافية في الإصدارات اللاحقة.
:::

## cad.drawing

تُعيد المعلومات الثابتة للرسم الحالي.

| الحقل | النوع | الوصف |
|------|------|------|
| `title` | `string` | عنوان الرسم |
| `currentLayer` | `string` | اسم الطبقة الحالية |
| `units` | `number` | وحدة الإدراج (INSUNITS) |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | قائمة جميع الطبقات |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | نطاق مساحة النموذج |

```javascript
const info = cad.drawing
cad.log('当前图层:', info.currentLayer)
cad.log('图层总数:', info.layers.length)
```

## cad.entities

تُستخدم للاستعلام عن الكيانات في مساحة النموذج.

### `cad.entities.where(predicate)`

تُرشّح لقطات الكيانات وفق شرط معين، وتُعيد مصفوفة اللقطات المطابقة.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

تحصل على لقطة كيان واحد حسب معرّفه، وتُعيد `undefined` عند عدم العثور عليه.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('类型:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

تُعيد جميع لقطات الكيانات الواقعة داخل المستطيل المحدد في نظام الإحداثيات العالمي (WCS).

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### لقطة الكيان (EntitySnapshot)

| الحقل | النوع | الوصف |
|------|------|------|
| `id` | `string` | معرّف كائن الكيان |
| `type` | `string` | نوع الكيان بدون البادئة `AcDb`، مثل `Circle` و`Line` |
| `layer` | `string` | اسم الطبقة الموجود بها |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | النطاق في نظام الإحداثيات العالمي |
| `geometry` | `object \| undefined` | البيانات الهندسية الخاصة بالنوع |

أنواع `geometry` المدعومة:

| نوع الكيان | حقول `geometry` |
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
| `BlockReference` (إدراج) | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

يستخدم حقل الزاوية `startAngle` / `endAngle` الراديان، بينما يستخدم `startAngleDeg` / `endAngleDeg` الدرجات.

## cad.selection

تُستخدم لتمييز الكيانات وتحديدها.

### `cad.selection.ids`

مصفوفة معرّفات الكيانات المحددة حاليًا. هذه خاصية وليست دالة.

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

لقطات لكل كيان في مجموعة التحديد. تُحذف المعرّفات التي لم تعد موجودة. حقول كل لقطة مطابقة لـ `cad.entities.byId`.

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
```

### `cad.selection.replace(ids)`

تمسح مجموعة التحديد وتعيّنها إلى قائمة المعرّفات المحددة.

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

تضيف المعرّفات المحددة إلى مجموعة التحديد الحالية.

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

تزيل المعرّفات المحددة من مجموعة التحديد الحالية.

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

تمسح مجموعة التحديد.

```javascript
cad.selection.clear()
```

## cad.view

تُستخدم للتحكم في العرض.

### `cad.view.zoomExtents()`

تُكبّر العرض ليشمل نطاق مساحة النموذج.

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

تنفّذ عمليات التحرير، وتُعامل جميع التعديلات كمجموعة تراجع واحدة. يجب أن يكون الرسم في حالة قابلة للتحرير (وليس في وضع القراءة فقط).

```javascript
cad.edit.transaction('批量修改', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

الأساليب المتاحة داخل المعاملة:

### أساليب الرسم

| الأسلوب | المعاملات | القيمة المُعادة |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | معرّف الكيان الجديد |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | معرّف الكيان الجديد |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | معرّف الكيان الجديد |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | معرّف الكيان الجديد |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | معرّف الكيان الجديد |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | معرّف الكيان الجديد |

### أساليب التحرير

| الأسلوب | المعاملات | القيمة المُعادة |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | عدد الكيانات المحذوفة |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | عدد الكيانات المنقولة |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | عدد الكيانات المدارة |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

تُخرج معلومات السجل إلى لوحة النتائج.

```javascript
cad.log('实体数量:', count)
cad.log({ layer: '0', count })
```

## القيمة المُعادة

يمكن استخدام `return` في البرنامج النصي لإرجاع أي قيمة قابلة للتسلسل بصيغة JSON. تُعرض القيمة المُعادة في لوحة النتائج.

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

إذا تجاوزت القيمة المُعادة 65536 حرفًا، يتم اقتطاعها ووضع علامة `truncated` عليها.
