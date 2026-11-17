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

يتم رفض العناصر التالية مباشرةً في مرحلة التحقق من البرنامج النصي، مما يُطلق أخطاء `forbidden_identifier` / `forbidden_syntax` / `forbidden_member`. يُسمح بمفاتيح الكائنات مثل `{ window: count }`؛ ولا يُسمح بالمُعرّفات الحرة مثل `window.foo`.

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

| الحقل          | النوع                                         | الوصف                   |
| -------------- | --------------------------------------------- | ----------------------- |
| `title`        | `string`                                      | عنوان الرسم             |
| `currentLayer` | `string`                                      | اسم الطبقة الحالية      |
| `units`        | `number`                                      | وحدة الإدراج (INSUNITS) |
| `layers`       | `Array<{ name, isOn, isFrozen, isLocked }>`   | قائمة جميع الطبقات      |
| `extents`      | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | نطاق مساحة النموذج      |

```javascript
const info = cad.drawing
cad.log('当前图层:', info.currentLayer)
cad.log('图层总数:', info.layers.length)
```

## cad.entities

`where` / `count` / `inBox` تمسح **مساحة النموذج ومساحات الورق فقط** (تعريفات الكتل عبر `inBlock(id)`). `ownerId` للسمة هو مرجع الكتلة، ولغير ذلك سجل جدول الكتل. نوع مرجع الكتلة هو `BlockReference`.

### `cad.entities.count(predicate)`

تعدّ المطابقات دون بناء لقطات. فضّله للإحصاء — `where(pred).length` يلتقط كل مطابقة.

```javascript
const n = cad.entities.count(e => e.type === 'Circle')
```

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

### `cad.entities.inBlock(blockId)`

تلتقط الكيانات المخزّنة مباشرة في تعريف كتلة واحد (أو مساحة نموذج/ورق).

```javascript
const widget = cad.blocks.find(block => block.name === 'Widget')
const ents = widget ? cad.entities.inBlock(widget.id) : []
```

### `cad.entities.inBox(min, max)`

تُعيد لقطات مساحة التخطيط التي تتقاطع حدودها مع المستطيل (نموذج/ورق فقط).

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### لقطة الكيان (EntitySnapshot)

| الحقل           | النوع                                         | الوصف                                                       |
| --------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `id`            | `string`                                      | معرّف كائن الكيان                                           |
| `ownerId`       | `string`                                      | معرّف سجل جدول الكتل المالك، أو مرجع الكتلة للسمة           |
| `type`          | `string`                                      | نوع الكيان بدون البادئة `AcDb`، مثل `Circle` و`Line`        |
| `layer`         | `string`                                      | اسم الطبقة الموجود بها                                      |
| `color`         | `EntityColor`                                 | اللون المخزَّن قبل حل ByLayer / ByBlock                     |
| `resolvedColor` | `EntityColor`                                 | اللون بعد حل ByLayer / ByBlock                              |
| `lineType`      | `string`                                      | اسم نوع الخط (`ByLayer` / `ByBlock` تُعاد كما هي)           |
| `lineWeight`    | `number`                                      | قيمة `AcGiLineWeight`؛ القيم السالبة تعني ByLayer / ByBlock |
| `linetypeScale` | `number`                                      | مقياس نوع الخط                                              |
| `visibility`    | `boolean`                                     | `false` عندما يكون الكيان مخفيًا                            |
| `transparency`  | `EntityTransparency`                          | طريقة الشفافية مع alpha                                     |
| `thickness`     | `number \| undefined`                         | سماكة البثق عند وجودها                                      |
| `normal`        | `{x,y,z} \| undefined`                        | اتجاه البثق / العمود على المستوى عند وجوده                  |
| `extents`       | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | النطاق في نظام الإحداثيات العالمي                           |
| `geometry`      | `object \| undefined`                         | البيانات الهندسية الخاصة بالنوع                             |

`EntityColor` هو `{ red?, green?, blue?, hex?, colorIndex?, isByColor, isByACI, isByLayer, isByBlock, isForeground }`.
ألوان ByLayer / ByBlock لا تحمل RGB؛ اقرأ `resolvedColor` عندما تحتاج إلى لون فعلي.
`EntityTransparency` هو `{ method, alpha, percentage?, isByAlpha, isByLayer, isByBlock }`.

داخل محمول `cad.entities.where(...)` تُقرأ خصائص العرض هذه بتأخير: تُحلَّل الحقول التي يلمسها المحمول فقط، ولا يُحوَّل إلى لقطة كاملة إلا الكيانات المطابقة.

أنواع `geometry` المدعومة:

| نوع الكيان                          | حقول `geometry`                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Circle`                            | `{ center, radius, area, circumference, closed }`                                                                                                                                                                                                                                                        |
| `Line`                              | `{ start, end, length, midPoint, direction, closed }`                                                                                                                                                                                                                                                    |
| `Arc`                               | `{ center, radius, startAngle, endAngle, startAngleDeg, endAngleDeg, length, area, startPoint, endPoint, midPoint, closed }`                                                                                                                                                                             |
| `Ellipse`                           | `{ center, majorAxis, majorRadius, minorRadius, startAngle, endAngle, startAngleDeg, endAngleDeg, area, isCircular, closed }`                                                                                                                                                                            |
| `Polyline`                          | `{ points, vertices: [{ bulge, startWidth, endWidth }], bulges, hasBulges, hasWidths, closed, elevation, length, area }`                                                                                                                                                                                 |
| `2dPolyline`                        | `{ points, vertices, bulges, hasBulges, closed, polyType, elevation, length, area }`                                                                                                                                                                                                                     |
| `3dPolyline`                        | `{ points, closed, polyType, length }`                                                                                                                                                                                                                                                                   |
| `Spline`                            | `{ points, controlPoints, fitPoints, knots, weights, degree, length, area, isFitPointSpline, isControlPointSpline, startPoint, endPoint, closed, normal }`                                                                                                                                               |
| `Text`                              | `{ position, text, height, rotation, styleName, alignmentPoint, hasAlignmentPoint, oblique, obliqueDeg, horizontalMode, verticalMode, widthFactor, isBackward, isUpsideDown }`                                                                                                                           |
| `MText`                             | `{ position, text, plainText, height, width, extentsWidth, rotation, styleName, attachmentPoint, direction, lineSpacingFactor, lineSpacingStyle, backgroundFill, backgroundFillColor, backgroundScaleFactor, drawingDirection, columnType, columnCount, columnWidth, columnGutter, columnFlowReversed }` |
| `Attribute` / `AttributeDefinition` | حقول النص مع `{ tag, invisible }` وأمثالها                                                                                                                                                                                                                                                               |
| `Point`                             | `{ position, ecsRotation }`                                                                                                                                                                                                                                                                              |
| `Ray` / `Xline`                     | `{ basePoint, unitDir }`                                                                                                                                                                                                                                                                                 |
| `BlockReference` (إدراج)            | `{ name, effectiveName, isDynamicBlock, position, rotation, scale, columnCount, rowCount, columnSpacing, rowSpacing, blockTransform, attributes: [{ tag, text, position, invisible }] }`                                                                                                                 |
| `Table`                             | حقول مرجع الكتلة مع `{ rows, columns, attachmentPoint, rowHeights, columnWidths, tableWidth, tableHeight, cells }`                                                                                                                                                                                       |
| `Hatch`                             | `{ patternName, hatchStyle, isSolidFill, isHatch, isGradient, area, loops: [{ closed, points, length }], gradient* }`                                                                                                                                                                                    |

يستخدم حقل الزاوية `startAngle` / `endAngle` الراديان، بينما يستخدم `startAngleDeg` / `endAngleDeg` الدرجات.
يُزال من `plainText` رموز تحكم MTEXT (`\P` و`\fSimSun|b0|i0;` والأقواس) فيصبح قابلًا للبحث مباشرة.
تُحسب `measurement` للكوتة من نقاط التعريف عندما لا يحمل الكيان قيمة مخزنة.

لدى كل أنواع الكيانات الملموسة في data-model حقل `geometry`، ومنها `Hatch` و`Spline` و`Leader` و`MLeader` و`MLine` وأنواع `Dimension` و`RasterImage` و`Viewport` و`3dSolid` و`ProxyEntity`. لا تُنسخ بيانات ACIS أو OLE أو رسوم الوكيل الثنائية.

## cad.tables

قراءة كل جداول الرموز، كما في `AcDbDatabase.tables`. كل جدول هو `{ id, records }`، وكل سجل يحتوي على الأقل على `id` و`name`.

| الخاصية          | المحتوى                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `appIdTable`     | أسماء التطبيقات المسجلة                                                                    |
| `blockTable`     | تعريفات الكتل. الكيانات في `cad.blocks`                                                    |
| `dimStyleTable`  | أنماط الأبعاد                                                                              |
| `linetypeTable`  | أنواع الخطوط                                                                               |
| `textStyleTable` | أنماط النص                                                                                 |
| `ucsTable`       | أنظمة الإحداثيات المسماة                                                                   |
| `viewTable`      | العروض المسماة                                                                             |
| `layerTable`     | الطبقات: `color` و`linetype` و`lineWeight` و`isOff` و`isFrozen` و`isLocked` و`isPlottable` |
| `viewportTable`  | سجلات VPORT في مساحة النموذج، وليست كيانات `Viewport` في مساحة الورق                       |

## cad.blocks

**بيانات وصفية فقط** لما يقابل قسم BLOCKS في DXF (بما في ذلك `*Model_Space` و`*Paper_Space`). لا مصفوفة كيانات — استخدم `cad.entities.inBlock(id)`.

| الحقل                           | الوصف                                              |
| ------------------------------- | -------------------------------------------------- |
| `id`                            | معرّف سجل جدول الكتل، وهو `ownerId` لكيانات الكتلة |
| `name`                          | اسم الكتلة                                         |
| `origin`                        | نقطة الأساس `{ x, y, z }`                          |
| `isModelSpace` / `isPaperSpace` | مساحة النموذج / مساحة الورق                        |
| `flags`                         | مجموعة BLOCK رقم 70                                |
| `pathName` / `isXref`           | مسار المرجع الخارجي وعلامته                        |
| `entityCount`                   | عدد الكيانات (بدون لقطات)                                  |
| `typeCounts`                    | العدد حسب النوع (بدون لقطات)                               |

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

### `cad.view.capturePreview({ longSide?, selection?, layers? })`

يضع لقطة PNG لنطاق الرسم في قائمة الانتظار. يُلتقط بعد انتهاء نص السكربت. يُرجع `{ queued: true, index }`. في محادثة Agent تُرفق الصور بنتيجة الأداة للنموذج (لا تُرجع كـ data URL في JSON).

مرّر `selection: true` بعد `cad.selection.replace(ids)` لالتقاط التحديد الحالي فقط.

مرّر `layers` (اسم طبقة أو مصفوفة أسماء، دون تمييز حالة الأحرف) لرسم عناصر فضاء النموذج الموجودة على هذه الطبقات فقط، مع تأطير الصورة على النطاق المجمّع لهذه الطبقات بدلًا من الرسم كله، فلا تظهر هوامش فارغة كبيرة. تُتجاهل حالة تشغيل/إيقاف الطبقة؛ أسماء الطبقات غير الموجودة ترمي خطأ؛ ولا يمكن الجمع بين `layers` و`selection`.

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
// optional: cad.view.capturePreview({ selection: true })
// optional: cad.view.capturePreview({ layers: ['WALL', 'DOOR'] })
```

## cad.file

يُصدّر الرسم الحالي. لا يُعاد نص DXF ضمن قيمة السكربت.

### `cad.file.saveDxf(path?)`

يضع تصدير DXF في الانتظار بعد نجاح السكربت. مرّر مسارًا نصيًا أو `{ path?, fileName? }`. تُضاف `.dxf` إن غابت اللاحقة. يُرجع `{ queued: true, index, fileName }`.

- في الوكيل داخل التطبيق ولوحة السكربت يبدأ تنزيل المتصفح.
- في `cad-mcp-server` يكتب الخادم الملف إلى `path`. المسارات النسبية تُحسب من مجلد عمل عملية الخادم. تتضمن نتيجة الأداة `savedFiles` مع المسار المطلق وعدد البايتات.

```javascript
cad.file.saveDxf('./plan-out.dxf')
// or: cad.file.saveDxf({ path: './plan-out.dxf' })
```

### `cad.file.savePdf(path?)`

Queues a PDF export after the script succeeds. Pass a path string or `{ path?, fileName?, exportLayouts?, exportEmptyLayouts?, colorMode?, textMode?, modelSpaceFit? }`. `.pdf` is appended when missing. Returns `{ queued: true, index, fileName }`.

```javascript
cad.file.savePdf('./plan.pdf')
```

### `cad.file.saveHtml(path?)`

Queues offline HTML (or a multi-file `.zip`) after success. Pass a path string or `{ path?, fileName?, exportFormat?, exportLayouts?, exportEmptyLayouts?, background? }`. Requires a viewer host (`exportHtml`). Headless sessions skip with a log note.

```javascript
cad.file.saveHtml('./plan.html')
cad.file.saveHtml({ path: './plan.zip', exportFormat: 'multi' })
```

## cad.measure

Numeric helpers for self-check after drawing. Prefer these over hand-rolled `Math.hypot` / `atan2`. Points are `{ x, y }` in WCS.

| Method                                                  | Returns                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cad.measure.distance(a, b)`                            | Distance between two points                                                           |
| `cad.measure.angleDeg(a, b)`                            | Bearing of a→b from +X, degrees in (-180, 180]                                        |
| `cad.measure.angleDeg(a, b, c)`                         | Interior angle at b (a–b–c), degrees in [0, 180]                                      |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)`             | Smallest absolute bearing difference in [0, 180]                                      |
| `cad.measure.center(id)`                                | Circle/arc/ellipse center, or point/text position; else `undefined`                   |
| `cad.measure.radius(id)`                                | Circle/arc radius or ellipse majorRadius; else `undefined`                            |
| `cad.measure.length(id)`                                | Line length, or polyline/spline/2dPolyline/3dPolyline path length; else `undefined`   |
| `cad.measure.area(id)`                                  | Area reported by the entity, or polygon area of its boundary points; else `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }` (default tolerance `1e-3`)                         |
| `cad.measure.report(checks)`                            | `{ ok, checks }` — `ok` is true iff every check passed                                |

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

## cad.redraw

إعادة بناء رسم من صورة مرجعية (مسح ضوئي أو صورة فوتوغرافية أو لقطة شاشة) مع تتبّع الأدلة. يبني السكربت كائن spec عاديًا؛ ويتحقق `cad.redraw` منه ويرسمه ضمن مجموعة تراجع واحدة على الطبقات القياسية (OBJECT وHIDDEN وCENTER وDIM وTEXT وTABLE وBORDER وCONSTRUCTION وASSUMPTION) ثم يفحص النتيجة. يُصدَّر المرجع الكامل للـ spec باسم `CAD_REDRAW_SPEC_SUMMARY` وهو مضمّن في موجّه الوكيل.

| الطريقة | الوصف |
| --- | --- |
| `cad.redraw.validate(spec, { profile? }?)` | يتحقق من الحقول والمعرّفات والوحدات والمعايرة والقيود دون رسم ← `{ status, errors, warnings, evidence, calibrations }` |
| `cad.redraw.draw(spec, { profile?, omit?, offset?, allowBlocked? }?)` | يرسم الـ spec ← `{ status, drawn, idMap, entityCount, skipped, checks, dimensionChecks, errors, warnings }` |
| `cad.redraw.inspect(spec, idMap, { profile? }?)` | يعيد تشغيل الفحوصات ويقارن قراءات الأبعاد `value` بما تقيسه الأبعاد المرسومة |
| `cad.redraw.compare(spec, { referenceIndex?, calibration?, viewId?, tolerancePx?, maxSide?, images? }?)` | مقارنة على مستوى البكسل مع الصورة المرجعية المرفقة: يحاذي الرسم المعروض عبر معايرة الـ spec ويعيد `redrawCompare` (الحكم والتغطية والدقة والمسافات و`suggestedMove` ومناطق الاختلاف) مع صورتي التراكب والفرق |

- ملفات التعريف: `general` (الافتراضي) و`strict-dimensioned` و`hybrid` و`visual-trace` و`geometry-only` (يتخطى النصوص والأبعاد وخطوط الإشارة ونصوص الجداول).
- الدليل لكل قيمة: `known` أو `scaled` أو `inferred` أو `unreadable`. الوحدة الافتراضية `unitless`؛ ولا تُفترض المليمترات أبدًا.
- تستخدم الكيانات إحداثيات CAD افتراضيًا. ومع `coords: 'source'` تكون بكسلات الصورة (الأصل أعلى اليسار، وy للأسفل) وتُحوَّل بمعايرة (`dimension-anchor` أو `similarity` أو `affine` أو `homography` أو `sheet-scale`).
- الحالة: `pass` و`pass_with_warnings` و`needs_review` (تعارض في الأبعاد أو القيود) و`blocked` (نقص الأدلة في ملف التعريف الصارم) و`fail` (spec غير صالح؛ لا يُرسم شيء).
- تُرسم الجداول كخطوط ونصوص، وليس كـ AcDbTable.
- يضبط الرسم `INSUNITS` وفقًا لـ `units`، ويستخدم للنصوص ونصوص الأبعاد النمط `REDRAW_TEXT` الداعم للغات CJK (`simsun` + `hztxt.shx`)، ويرسم البُعد الذي يتعذر إنشاؤه كخطوط ونص (ونصف القطر/القطر كخط إشارة) مع تحذير؛ ويعدّها `fallbacks`.

```javascript
const r = cad.redraw.draw({
  profile: 'general',
  units: 'mm',
  entities: [
    { id: 'plate', type: 'rectangle', x: 0, y: 0, width: 120, height: 80, evidence: 'known' },
    { id: 'hole', type: 'circle', center: [60, 40], radius: 10, evidence: 'known' },
    { id: 'w', type: 'linear_dimension', p1: [0, 0], p2: [120, 0], dimLine: [60, -12], value: 120, evidence: 'known' },
    { id: 'note', type: 'leader', points: [[67, 47], [85, 65], [95, 65]], text: 'THRU' }
  ],
  checks: [{ measure: 'radius', entity: 'hole', expected: 10 }]
})
return { status: r.status, checks: r.checks, dimensionChecks: r.dimensionChecks }
```

### المقارنة على مستوى البكسل

يعرض `cad.redraw.compare` الرسم ضمن نطاق CAD المقابل للصورة المرجعية (أو `views[].sourceRoi`)، ويحوّله إلى إطار الصورة عبر المعايرة (تشابه أو تحويل أفيني أو إسقاطي)، ويرقّق الاثنين إلى خطوط مركزية بعرض بكسل واحد، ثم يقيس كلًا منهما مقابل الآخر بتحويلات المسافة.

- `coverage`: نسبة خطوط المرجع التي يوجد لها رسم ضمن التسامح (تنخفض عند نقص الهندسة).
- `precision`: نسبة الخطوط المرسومة التي يوجد لها خط مرجعي ضمن التسامح (تنخفض عند وجود هندسة زائدة أو في غير موضعها).
- `meanDistance*` / `p95Distance*`: بُعد خطوط المرجع عن الرسم بوحدات بكسل المرجع ووحدات CAD.
- `verdict`: `aligned` أو `offset` (يُصلح الإزاحة معظم الفرق — انظر `suggestedMove`) أو `incomplete` أو `cluttered` أو `mismatch`.
- `hotspots`: خلايا الشبكة الأكثر اختلافًا، بصيغة `sourceRoi` (بكسلات الصورة) و`cadBox`.

يعرض التراكب الصورة المرجعية باهتة مع الخطوط المتطابقة بالأخضر والمفقودة بالأحمر والزائدة بالأزرق. تحتاج المقارنة إلى مُصيِّر وصورة مرفقة، لذا تعمل داخل الوكيل في التطبيق؛ وتعيد الجلسات بلا واجهة `reason: 'no_raster_host'`. مقاييس البكسل دليل بصري فقط ولا تثبت الأبعاد.

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

| الأسلوب                                                                                                    | المعاملات                        | القيمة المُعادة     |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------- |
| `tx.drawLine({ start, end, layer? })`                                                                      | `start/end: {x,y}`               | معرّف الكيان الجديد |
| `tx.drawCircle({ center, radius, layer? })`                                                                | `center: {x,y}`                  | معرّف الكيان الجديد |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })`                                       | `center: {x,y}`                  | معرّف الكيان الجديد |
| `tx.drawRectangle({ corner1, corner2, layer? })`                                                           | `corner1/corner2: {x,y}`         | معرّف الكيان الجديد |
| `tx.drawPolyline({ points, closed?, layer? })`                                                             | `points: Array<{x,y}>`           | معرّف الكيان الجديد |
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}`                  | معرّف الكيان الجديد |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })`                        | `boundary: Array<{x,y}>` (min 3) | معرّف الكيان الجديد |
| `tx.drawPoint({ position, layer? })`                                                                       | `position: {x,y}`                | معرّف الكيان الجديد |
| `tx.drawRay({ start, through, layer? })`                                                                   | `start/through: {x,y}`           | معرّف الكيان الجديد |
| `tx.drawXline({ start, through, layer? })`                                                                 | `start/through: {x,y}`           | معرّف الكيان الجديد |
| `tx.drawSpline({ points, closed?, layer? })`                                                               | `points: Array<{x,y}>`           | معرّف الكيان الجديد |
| `tx.drawText({ position, text, height?, rotationDeg?, width?, layer? })`                                                         | `position: {x,y}`                | معرّف الكيان الجديد |
| `tx.drawDimAligned({ xLine1Point, xLine2Point, dimLinePoint, text?, styleName?, layer? })`                 | نقاط `{x,y}`                     | معرّف الكيان الجديد |
| `tx.drawDimLinear({ xLine1Point, xLine2Point, dimLinePoint, rotationDeg?, text?, styleName?, layer? })`     | بدون `rotationDeg` → أفقي/عمودي حسب الموضع | معرّف الكيان الجديد |
| `tx.drawDimDiameter({ center, radius, angleDeg?, leaderLength?, … } \| { chordPoint, farChordPoint, … })` | مركز+نصف قطر أو وتر              | معرّف الكيان الجديد |
| `tx.drawDimRadius({ center, radius, angleDeg?, leaderLength?, … } \| { center, chordPoint, … })`           | مركز+نصف قطر أو مركز+وتر         | معرّف الكيان الجديد |
| `tx.drawDimAngular({ center, xLine1Point, xLine2Point, arcPoint, text?, styleName?, layer? })`             | زاوية بثلاث نقاط                 | معرّف الكيان الجديد |
| `tx.drawDimArc({ center, xLine1Point, xLine2Point, arcPoint, text?, styleName?, layer? })`                  | طول قوس                          | معرّف الكيان الجديد |
| `tx.drawDimOrdinate({ definingPoint, leaderEndPoint, useXAxis?, origin?, text?, styleName?, layer? })`     | بُعد إحداثي                      | معرّف الكيان الجديد |
| `tx.drawLeader({ points, text?, textPosition?, textHeight?, textLayer?, arrowHead?, styleName?, layer? })` | السهم عند `points[0]` | معرّف خط الإشارة (معرّف نص التعليق المتعدد الأسطر ضمن المعرّفات المنشأة أيضًا) |

استخدم `drawDim*` لأبعاد حقيقية. لا تقلّد الأبعاد بخطوط وأسهم ونص. الافتراضي هو `$DIMSTYLE` للرسم؛ مرّر `styleName` من `cad.tables.dimStyleTable` للتجاوز.

### أساليب التحرير

| الأسلوب                            | المعاملات                  | القيمة المُعادة       |
| ---------------------------------- | -------------------------- | --------------------- |
| `tx.erase(ids)`                    | `string[]`                 | عدد الكيانات المحذوفة |
| `tx.setLayer(ids, layer)`          | `string[], string`         | —                     |
| `tx.move(ids, dx, dy)`             | `string[], number, number` | عدد الكيانات المنقولة |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number`  | عدد الكيانات المدارة  |
| `tx.createLayer(name)`             | `string`                   | —                     |
| `tx.setCurrentLayer(name)`         | `string`                   | —                     |

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
