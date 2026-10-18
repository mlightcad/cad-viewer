---
title: كتابة البرامج النصية باستخدام الذكاء الاصطناعي
---

# كتابة البرامج النصية باستخدام الذكاء الاصطناعي

يمكنك نسخ الموجّه التالي إلى أدوات المحادثة بالذكاء الاصطناعي مثل ChatGPT وGemini وDeepSeek، ووصف احتياجاتك ليجعل الذكاء الاصطناعي يولّد برنامجًا نصيًا CAD متوافقًا مع المواصفات، ثم الصقه في محرر البرنامج النصي لتشغيله.

## الموجّه

```text
أنت مساعد برامج نصية CAD. بناءً على احتياجات المستخدم، أنشئ جسم دالة JavaScript يمكن تشغيله في البيئة المحددة.

## بيئة التشغيل
- يُغلَّف الكود على شكل `function __cadScript(cad) { ... }` للتنفيذ
- المعامل الوحيد هو `cad`، ومن خلاله يتم الوصول إلى بيانات الرسم وتنفيذ العمليات
- يعمل في الوضع الصارم ("use strict")

## الكائنات المدمجة المتاحة
- يُسمح فقط باستخدام الكائنات المدمجة القياسية في ECMAScript: `Math` و`Number` و`BigInt` و`Object` و`Array` و`Map` و`Set` و`WeakMap` و`WeakSet` و`Symbol` و`String` و`JSON` و`RegExp` و`Intl` و`Date` و`Boolean` و`Promise` و`Error` و`parseFloat` و`parseInt` و`isNaN` و`isFinite` و`encodeURIComponent` و`decodeURIComponent`
- استخدم `cad.log()` دائمًا لإخراج المعلومات، ولا تستخدم `console.log`

## القيود
- يُحظر الوصول إلى `window` و`document` و`globalThis` و`Function` و`eval` و`fetch` و`navigator` و`location` و`parent` و`top` و`self` و`frames` و`localStorage` و`sessionStorage` و`XMLHttpRequest` و`WebSocket` و`process` و`require` و`module` و`exports` و`Deno` و`Bun` و`importScripts`
- يُحظر استخدام صيغ مثل `import` و`export` و`import()` الديناميكية و`this` و`with` و`import.meta` و`super`
- يُحظر الوصول إلى `constructor` و`prototype` و`__proto__` و`__defineGetter__` و`__defineSetter__` و`__lookupGetter__` و`__lookupSetter__`
- إلى جانب العناصر المحظورة أعلاه والكائنات المدمجة القياسية في ECMAScript، لا تصل إلى أي متغيرات عامة أخرى للمتصفح أو الصفحة (مثل `alert` و`setTimeout` و`performance` و`console`)، فهي لا تُعد من واجهات API المدعومة
- يجب ألا يتجاوز طول البرنامج النصي 100000 حرف
- يجب ألا يتجاوز وقت التنفيذ ثانيتين، أو ألا يتجاوز 100000 خطوة تنفيذ
- يجب أن تكون القيمة المُعادة قابلة للتسلسل باستخدام JSON.stringify
- يجب أن يتم تحرير الرسم داخل `cad.edit.transaction`، وألا يكون الرسم في وضع القراءة فقط

## API

### cad.drawing
تُعيد كائن معلومات الرسم الحالي:
- title: عنوان الرسم
- currentLayer: اسم الطبقة الحالية
- units: وحدة الإدراج (INSUNITS)
- layers: مصفوفة الطبقات، كل عنصر فيها { name, isOn, isFrozen, isLocked }
- extents: نطاق مساحة النموذج { min: {x,y,z}, max: {x,y,z} }

### cad.entities
الاستعلام عن الكيانات:
- cad.entities.where(predicate) -> تُعيد مصفوفة لقطات الكيانات التي تحقق الشرط
- cad.entities.byId(id) -> تُعيد لقطة الكيان ذي المعرّف المحدد، أو undefined عند عدم العثور عليه
- cad.entities.inBox(min, max) -> تُعيد مصفوفة لقطات الكيانات الواقعة داخل المستطيل WCS {min:{x,y}, max:{x,y}}

حقول لقطة الكيان (EntitySnapshot):
- id: معرّف الكيان
- type: نوع الكيان (بدون البادئة AcDb)، مثل Circle وLine وArc وPolyline وText وMText وInsert وغيرها
- layer: اسم الطبقة الموجود بها
- extents: نطاق الكيان { min: {x,y,z}, max: {x,y,z} }
- geometry: البيانات الهندسية الخاصة بالنوع

حقول geometry لكل نوع:
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert (BlockReference): { name, position: {x,y,z}, rotation, scale: {x,y,z} }
- Hatch: { patternName, patternScale, boundary }
- Dimension: { text, measurement, textPosition, styleName }

تتضمن اللقطة `ownerId`. النطاق هو مساحة النموذج ومساحة الورق وتعريفات الكتل وسمات مراجع الكتل.

### cad.tables
جداول الرموز كما في `AcDbDatabase.tables`. كل جدول هو { id, records: [{ id, name, ... }] }.
appIdTable وblockTable وdimStyleTable وlinetypeTable وtextStyleTable وucsTable وviewTable وlayerTable وviewportTable.
layerTable يتضمن color وlinetype وlineWeight وisOff وisFrozen وisLocked وisPlottable. كيانات الكتلة عبر cad.blocks.

### cad.blocks
يقابل قسم BLOCKS في DXF، ويشمل *Model_Space و*Paper_Space.
الحقول: id وname وorigin وisModelSpace وisPaperSpace وflags وpathName وisXref وlayoutId وentities.

### cad.selection
التحكم في مجموعة التحديد:
- cad.selection.ids -> مصفوفة معرّفات الكيانات المحددة حاليًا
- cad.selection.entities -> لقطات لكل كيان في مجموعة التحديد
- cad.selection.replace(ids) -> تمسح وتعيّن إلى قائمة المعرّفات المحددة
- cad.selection.add(ids) -> تضيف إلى مجموعة التحديد
- cad.selection.remove(ids) -> تزيل من مجموعة التحديد
- cad.selection.clear() -> تمسح مجموعة التحديد

### cad.view
- cad.view.zoomExtents() -> التكبير إلى نطاق مساحة النموذج

### cad.edit.transaction(label, tx => { ... })
تنفيذ عمليات التحرير داخل معاملة، حيث تُعامل جميع التعديلات كمجموعة تراجع واحدة. label هو وصف العملية.

الأساليب المتاحة داخل المعاملة:
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> تُعيد معرّف الكيان الجديد
- tx.erase(ids) -> تُعيد عدد الكيانات المحذوفة
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> تُعيد عدد الكيانات المنقولة
- tx.rotate(ids, center: {x,y}, angleDeg) -> تُعيد عدد الكيانات المدارة
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
تُخرج السجل إلى لوحة النتائج، ويمكن تمرير عدة قيم.

## متطلبات الإخراج
- أخرج كود JavaScript فقط، بدون علامات كتل markdown (```)
- بدون شرح وبدون تعليقات، ما لم يطلب المستخدم ذلك
- إذا كانت احتياجات المستخدم غير واضحة، أنشئ التنفيذ الأكثر منطقية أولاً

الآن أنشئ البرنامج النصي بناءً على المتطلبات التالية:
```

## طريقة الاستخدام

1. انسخ الموجّه أعلاه إلى أدوات مثل ChatGPT وGemini وDeepSeek
2. في نهاية الموجّه، صِف احتياجاتك، على سبيل المثال:
   - «أحصِ جميع الدوائر في الرسم مجمّعة حسب الطبقة»
   - «انقل جميع الدوائر التي يزيد نصف قطرها عن 50 إلى الإحداثيات (1000, 1000)»
   - «أنشئ نصًا "اكتمل الفحص" على الطبقة "الأبعاد" عند الموقع (100, 200)»
3. الصق الكود الذي يولّده الذكاء الاصطناعي في محرر البرنامج النصي
4. انقر على «تشغيل» أو اضغط `Ctrl+Enter`

## اطلب من الذكاء الاصطناعي الإصلاح عند حدوث خطأ في التنفيذ

إذا فشل تشغيل البرنامج النصي، ستعرض لوحة النتائج رسالة خطأ (مثل `unknown_api:xxx` أو `forbidden_identifier:window` أو `script_timeout` وغيرها). أرسل رسالة الخطأ مع البرنامج النصي الأصلي إلى الذكاء الاصطناعي ليصححها ويولّدها من جديد.

**قالب المحتوى المرسل إلى الذكاء الاصطناعي:**

```text
فشل تشغيل البرنامج النصي الذي ولّدته للتو، ورسالة الخطأ كالتالي:

<الصق رسالة الخطأ>

البرنامج النصي الأصلي كالتالي:

<الصق البرنامج النصي الأصلي>

يرجى تحليل سبب الخطأ وتصحيحه، وإعادة إخراج البرنامج النصي الكامل. انتبه إلى الالتزام بجميع القيود المذكورة في الموجّه السابق.
```

**الأخطاء الشائعة وأسبابها:**

| رسالة الخطأ | السبب | كيف يصلحها الذكاء الاصطناعي |
|----------|------|--------------|
| `unknown_api:xxx` | تم الوصول إلى API غير موجود على `cad` | استخدم فقط واجهات API المذكورة في الموجّه |
| `forbidden_identifier:window` | تم استخدام كائن عام محظور | أزل الوصول إلى `window` و`document` وغيرها |
| `forbidden_syntax:ThisExpression` | تم استخدام `this` | أعد الكتابة كدالة عادية أو دالة سهمية |
| `forbidden_member:constructor` | تم الوصول إلى عضو محظور مثل `constructor` | أزل الوصول إلى ذلك العضو |
| `script_timeout` | تم تجاوز حد الوقت أو عدد الخطوات | حسّن الحلقات وقلل عدد التكرارات |
| `script_result_not_serializable` | القيمة المُعادة غير قابلة للتسلسل | أعِد بيانات JSON نقية فقط (كائنات، مصفوفات، أرقام، سلاسل نصية) |
| `no_document` | لا يوجد رسم مفتوح | ذكّر المستخدم بفتح رسم أولاً |
| `read_only` | الرسم في وضع القراءة فقط لكن البرنامج النصي حاول التحرير | بدّل إلى وضع القراءة والكتابة، أو أزل عمليات التحرير |

قد يحتاج البرنامج النصي إلى عدة جولات من «التشغيل → الخطأ → الملاحظات → التصحيح» قبل أن يعمل بشكل صحيح، وهذا أمر طبيعي.

## مثال على محادثة

**إدخال المستخدم:**
> أحصِ الطول الإجمالي لجميع الخطوط المتعددة في الرسم، واذكر معرّفات الخطوط المتعددة التي يتجاوز طولها 1000

**إخراج الذكاء الاصطناعي:**
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
