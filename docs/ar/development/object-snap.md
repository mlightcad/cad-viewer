---
title: "التقاط الكائنات (OSNAP)"
---

# التقاط الكائنات (OSNAP)

تشرح هذه الصفحة كيفية عمل OSNAP في **cad-viewer** مع البيانات من **realdwg-web**.

## الخلفية

في AutoCAD/ObjectARX، يمكن لكل كيان تجاوز `getOsnapPoints(...)` لإرجاع نقاط التقاط مرشحة لوضع التقاط معين.

في `realdwg-web`، نستخدم نمطًا مشابهًا مع `subGetOsnapPoints(...)` في كل فئة كيان.  
يستهلك `cad-viewer` تلك النقاط المُعادة لتنفيذ الالتقاط في واجهة المستخدم.

المرجع:
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## الواجهة الأساسية في realdwg-web

التعريف الأساسي:
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

المعاملات:

- `osnapMode`: وضع واحد في كل استدعاء
- `pickPoint`: نقطة مؤشر الفأرة الحالية في العالم
- `lastPoint`: النقطة المُثبَّتة السابقة في تدفق الأمر
- `snapPoints`: مصفوفة الإخراج لإلحاق النقاط المرشحة
- `gsMark` (اختياري): معرّف الكيان الفرعي، وهو مهم حاليًا لالتقاط الكيانات الفرعية لـ `INSERT` (`AcDbBlockReference`)

## أوضاع OSNAP المدعومة

معرّفة في `AcDbOsnapMode`:
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

مهم:

- هذه القيم معرّفات ترتيبية، وليست أعلام بتات.
- استخدم `acdbOsnapModesToMask(...)` و`acdbMaskToOsnapModes(...)` لتحويل القناع.

## ما تعرضه واجهة cad-viewer الحالية

يعرض شريط الحالة (`MlOsnapButton.vue`) حاليًا:

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

غير معروض في واجهة المستخدم بعد (معلّق):

- Perpendicular
- Tangent
- Nearest
- Centroid

القناع المُمكَّن افتراضيًا في الإعدادات (`AcApSettingManager`):

- EndPoint + MidPoint + Center

## التدفق في وقت التشغيل في cad-simple-viewer

1. يستدعي `AcEdFloatingInput.getPosition()` الدالة `getOsnapPoint()`.
2. تستدعي `getOsnapPoint()` الدالة `getOsnapPoints()`.
3. تشغّل `getOsnapPoints()` الدالة `view.pick(point, hitRadius)`.
4. لكل عنصر مُنتقى:
- حل كيان مساحة النموذج بواسطة `item.id`
- إذا كان `item.children` موجودًا، فاستدعِ osnap الكيان مع `gsMark = child.id`
- وإلا فاستدعِ osnap الكيان بدون `gsMark`
5. لكل وضع نشط في القناع الحالي، استدعِ `entity.subGetOsnapPoints(...)`.
6. اختر أقرب نقطة مُعادة إلى المؤشر.
7. طبّق حد المسافة في العالم المحوَّل من `hitRadius` على الشاشة (افتراضيًا 20 بكسل).
8. إذا تم القبول، فالتقط المؤشر واعرض العلامة.

## لمحة عن تنفيذ الكيانات (من شيفرة realdwg-web)

- `AcDbLine`: EndPoint، MidPoint، Nearest، Perpendicular (فرع `Tangent` موجود لكن دون نقطة)
- `AcDbArc`: EndPoint، MidPoint، Nearest، Tangent (فرع `Perpendicular` موجود لكن دون نقطة)
- `AcDbCircle`: Center، Centroid، Quadrant، Nearest، Tangent
- `AcDbEllipse`: EndPoint (القوس المفتوح فقط)، MidPoint (القوس المفتوح فقط)، Quadrant (القطع الناقص المغلق فقط)
- `AcDbPolyline`: EndPoint
- `AcDb2dPolyline`: EndPoint
- `AcDb3dPolyline`: EndPoint
- `AcDbPoint`: Node
- `AcDbText`: Insertion
- `AcDbMText`: Insertion
- `AcDbBlockReference` (`INSERT`): Insertion + التقاط الكيانات الفرعية المفوَّض عبر `gsMark`
- كيانات إضافية بدعم محدود:
- `AcDbRay`: EndPoint (النقطة الأساسية)
- `AcDbFace`: EndPoint (الرؤوس)
- `AcDbTrace`: EndPoint (الرؤوس)
- `AcDbSpline`: EndPoint

## منطق OSNAP لـ INSERT (`AcDbBlockReference`)

لـ `subGetOsnapPoints` مساران:

1. وضع `Insertion`:
- يدفع مباشرةً نقطة إدراج مرجع الكتلة (`this._position`)

2. الأوضاع الأخرى:
- تعمل فقط عند توفير `gsMark`
- تُفوَّض إلى `subEntityGetOsnapPoints(...)`

تدفق التفويض (`subEntityGetOsnapPoints`):

1. حارس: إذا كان `gsMark === this.objectId`، فأرجِع (لتجنب التكرار)
2. حل الكيان بواسطة `blockTable.getEntityById(gsMark)`
3. استدعِ `subGetOsnapPoints(...)` لذلك الكيان الفرعي
4. حوّل النقاط المُعادة بواسطة `blockTransform` لمرجع الكتلة هذا
5. ادفع النقاط المحوَّلة إلى الإخراج

## لماذا قد يفشل التقاط INSERT (السلوك الحالي)

1. لا يوجد `gsMark`:
- بالنسبة للأوضاع غير `Insertion`، لا يعيد `AcDbBlockReference` شيئًا إذا كان `gsMark` مفقودًا.

2. نموذج `gsMark` مبسّط:
- `gsMark` الحالي هو معرّف كائن الكيان الفرعي من إصابات الأبناء المكانية، وليس دلالات علامة GS الكاملة في AutoCAD.

3. العرض المُجمَّع حسب الطبقات لـ INSERT:
- قد يقسّم العرض INSERT واحدًا إلى عدة مجموعات عرض قائمة على الطبقات مع معرّف الكائن الأب نفسه.
- يعتمد الانتقاء على صناديق الأبناء الهرمية لاستعادة معرّفات الكيانات الفرعية.

4. التحويلات المعقدة/المتداخلة/الحافية:
- يطبّق التفويض `blockTransform` الخاص بـ INSERT الحالي.
- قد تظل الحالات الحافية (مثل سيناريوهات الكتل المتداخلة أو حالات الاتجاه/البثق غير الافتراضية) تنتج نقاط التقاط غير صحيحة أو مفقودة.

هذا يطابق ملاحظة خريطة الطريق المعروفة في `README.md`:
- التقاط نقطة النهاية لـ INSERT ليس موثوقًا بالكامل بعد.

## القيود المعروفة / المهام المطلوبة

- تغطية OSNAP تعتمد على الكيان؛ كثير من تركيبات الوضع/الكيان غير منفَّذة عمدًا بعد.
- التقاط INSERT غير المتعلق بـ Insertion يعتمد على نشر صحيح لإصابة الابن -> `gsMark`.
- آلية العلامة الحالية قائمة على معرّف الكائن وليست سلوك علامة GS الكامل في AutoCAD.
- هناك حاجة إلى مزيد من اختبارات الانحدار لـ INSERT، خصوصًا الكتل المتداخلة والكتل المحوَّلة.

## اتجاه المساهمة الموصى به

- تحسين متانة ربط إصابة الابن بـ `gsMark` لـ INSERT.
- إضافة اختبارات انحدار للكتل المتداخلة لحالات EndPoint/MidPoint/Center/Nearest/Tangent.
- توسيع تغطية الأوضاع لكل كيان تدريجيًا.
- تقريب نموذج العلامة من دلالات علامة GS في AutoCAD قدر الإمكان.
