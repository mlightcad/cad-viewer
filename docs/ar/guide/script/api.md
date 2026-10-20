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

تُعيد كل الكيانات في قاعدة البيانات: مساحة النموذج، وكل مساحات الورق، وكل تعريفات الكتل، وسمات مراجع الكتل. `ownerId` للسمة هو مرجع الكتلة، ولغير ذلك هو سجل جدول الكتل المالك.

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
| `ownerId` | `string` | معرّف سجل جدول الكتل المالك، أو مرجع الكتلة للسمة |
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

لدى كل أنواع الكيانات الملموسة في data-model حقل `geometry`، ومنها `Hatch` و`Spline` و`Leader` و`MLeader` و`MLine` وأنواع `Dimension` و`RasterImage` و`Viewport` و`3dSolid` و`ProxyEntity`. لا تُنسخ بيانات ACIS أو OLE أو رسوم الوكيل الثنائية.

## cad.tables

قراءة كل جداول الرموز، كما في `AcDbDatabase.tables`. كل جدول هو `{ id, records }`، وكل سجل يحتوي على الأقل على `id` و`name`.

| الخاصية | المحتوى |
|------|------|
| `appIdTable` | أسماء التطبيقات المسجلة |
| `blockTable` | تعريفات الكتل. الكيانات في `cad.blocks` |
| `dimStyleTable` | أنماط الأبعاد |
| `linetypeTable` | أنواع الخطوط |
| `textStyleTable` | أنماط النص |
| `ucsTable` | أنظمة الإحداثيات المسماة |
| `viewTable` | العروض المسماة |
| `layerTable` | الطبقات: `color` و`linetype` و`lineWeight` و`isOff` و`isFrozen` و`isLocked` و`isPlottable` |
| `viewportTable` | سجلات VPORT في مساحة النموذج، وليست كيانات `Viewport` في مساحة الورق |

## cad.blocks

كل تعريفات الكتل، بما يقابل قسم BLOCKS في DXF، بما في ذلك `*Model_Space` و`*Paper_Space`.

| الحقل | الوصف |
|------|------|
| `id` | معرّف سجل جدول الكتل، وهو `ownerId` لكيانات الكتلة |
| `name` | اسم الكتلة |
| `origin` | نقطة الأساس `{ x, y, z }` |
| `isModelSpace` / `isPaperSpace` | مساحة النموذج / مساحة الورق |
| `flags` | مجموعة BLOCK رقم 70 |
| `pathName` / `isXref` | مسار المرجع الخارجي وعلامته |
| `entities` | لقطات الكيانات المخزنة مباشرة في الكتلة |

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

### `cad.view.capturePreview({ longSide? })`

يضع لقطة PNG لنطاق الرسم في قائمة الانتظار. يُلتقط بعد انتهاء نص السكربت. يُرجع `{ queued: true, index }`. في محادثة Agent تُرفق الصور بنتيجة الأداة للنموذج (لا تُرجع كـ data URL في JSON).

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
```


## cad.measure

Numeric helpers for self-check after drawing. Prefer these over hand-rolled `Math.hypot` / `atan2`. Points are `{ x, y }` in WCS.

| Method | Returns |
|--------|---------|
| `cad.measure.distance(a, b)` | Distance between two points |
| `cad.measure.angleDeg(a, b)` | Bearing of a→b from +X, degrees in (-180, 180] |
| `cad.measure.angleDeg(a, b, c)` | Interior angle at b (a–b–c), degrees in [0, 180] |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)` | Smallest absolute bearing difference in [0, 180] |
| `cad.measure.center(id)` | Circle/arc/ellipse center, or point/text position; else `undefined` |
| `cad.measure.radius(id)` | Circle/arc radius or ellipse majorRadius; else `undefined` |
| `cad.measure.length(id)` | Line length or polyline/spline path length; else `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }` (default tolerance `1e-3`) |
| `cad.measure.report(checks)` | `{ ok, checks }` — `ok` is true iff every check passed |

Recommended return shape after a non-trivial draw:

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
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}` | معرّف الكيان الجديد |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })` | `boundary: Array<{x,y}>` (min 3) | معرّف الكيان الجديد |
| `tx.drawPoint({ position, layer? })` | `position: {x,y}` | معرّف الكيان الجديد |
| `tx.drawRay({ start, through, layer? })` | `start/through: {x,y}` | معرّف الكيان الجديد |
| `tx.drawXline({ start, through, layer? })` | `start/through: {x,y}` | معرّف الكيان الجديد |
| `tx.drawSpline({ points, closed?, layer? })` | `points: Array<{x,y}>` | معرّف الكيان الجديد |
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
