---
title: "نظام Jig"
---

# نظام Jig

يعتمد AutoCAD على إطار عمل AcEdJig لتوفير تغذية بصرية فورية أثناء تحصيل إدخال المستخدم. ورغم قوته، فإن هذا النظام يفصل المطالبات وعرض المعاينة وأخذ عينات الإدخال عبر عدة دوال مُعاد تعريفها — مما يؤدي غالبًا إلى توزيع المنطق على دوال ومراحل مختلفة من دورة الحياة. يعيد MLightCAD تصوّر هذا المفهوم للويب بإدخال آلية Jig موحّدة مدفوعة بـ TypeScript تتكامل بسلاسة مع إدخال المطالبات. فبدلًا من إدارة حلقات السحب أو رموز حالة أخذ العينات، يربط المطورون Jig مباشرة بخيارات المطالبة، مما يحافظ على منطق المعاينة الديناميكية وإدخال المستخدم وإنشاء الكيان النهائي معًا في سير عمل واحد قابل للقراءة.

## نظرة عامة

يتيح **نظام Jig** في MLightCAD معاينات تفاعلية وإنشاء كيانات ديناميكيًا، ويوفّر سير عمل مشابهًا لـ **AcEdJig** في AutoCAD (ObjectARX). يدير *Jig* كيان معاينة مؤقتًا يُحدَّث باستمرار وفقًا لحركة المؤشر أو إدخال المستخدم التدريجي.

تشمل حالات الاستخدام:

* الإنشاء الهندسي التفاعلي (النقطة، الدائرة، الخط المتعدد، وغيرها)
* القياس الحي للمسافة أو الزاوية
* التعديل الفوري للكيانات الموجودة

غير أن MLightCAD يقدّم تصميمًا **أبسط وأكثر تماسكًا وأكثر ملاءمة لـ TypeScript**، مما يقلل التعقيد البنيوي الموجود عادةً في Jigs الخاصة بـ AutoCAD.


## الفرق المعماري الرئيسي

### يُمرَّر Jig إلى خيارات المطالبة

في AutoCAD، تكون المطالبات وJigs آليتين منفصلتين. يتطلب تنفيذ Jig إعادة تعريف `sampler()` و`worldDraw()` واستدعاء `drag()`.

في MLightCAD، يمكن للمطالبات أن **تحمل نسخة Jig** مباشرة:

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

هذا التصميم:

* يربط إدخال المستخدم بالمعاينة الحية تلقائيًا
* يلغي إدارة حلقة السحب اليدوية

➡️ النتيجة: **شيفرة نمطية أقل واتساق أكبر**.

---

### يبقى منطق الإدخال الديناميكي الكامل معًا

كما ترى في [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)، يوزّع AutoCAD منطق الإدخال اللازم لإنشاء قطع ناقص واحد على أماكن متعددة.

* `createEllipse()` — يحصل على نقطة مركز القطع الناقص
* `sampler()` — يحصل على نقطة نهاية المحور الرئيسي والمسافة من مركز القطع الناقص إلى نقطة نهاية المحور الثانوي

في MLightCAD، يُعبَّر عن سير عمل الإدخال الديناميكي بأكمله بالتتابع على النحو التالي.

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ يُدار إدخال المستخدم ومعاينة Jig والهندسة النهائية في **الكتلة نفسها من الشيفرة**.


## المفاهيم الأساسية

### Jig عام (`AcEdPreviewJig<T>`)

`AcEdPreviewJig<T>` فئة قائمة على TypeScript تدير كيانات المعاينة المؤقتة:

| AutoCAD AcEdJig | Jig CAD للويب (`AcEdPreviewJig`)      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | يُتحكَّم فيه خارجيًا عبر أحداث JS |

**الميزات:**

-   تستخدم نوعًا عامًا `T` للتعامل مع أنواع إدخال متعددة (نقطة، مسافة، زاوية، وغيرها)
-   تتكامل مع `AcEdBaseView` لعرض الكيانات المؤقتة
-   تدعم كيانات المعاينة التي تنفّذ `onJigUpdate(value: T)` لتحديثات الهندسة الديناميكية
-   تتيح إنهاءً نظيفًا لـ Jig باستخدام `end()`

* * *

### الطرق الأساسية

#### `update(value: T): void`

يحدّث كيان المعاينة وفقًا لإدخال المستخدم. وهو المكافئ لـ `sampler()` في AutoCAD.

#### `render(): void`

يعرض كيان المعاينة في العرض المرتبط، على غرار `worldDraw()` في AutoCAD.

#### `end(): void`

يمسح الكيان المؤقت وينهي جلسة Jig.

#### `entity: AcDbEntity | null`

دالة جلب لكيان المعاينة الحالي.

## استخدام Jigs

### الخطوة 1: إنشاء فئة Jig

تحتاج إلى إنشاء فئة ترث من `AcEdPreviewJig<T>` للكيان المحدد. على سبيل المثال، إنشاء **Jig دائرة**:

```ts
import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcEdPreviewJig, AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}
```

**الشرح:**

-   يدير Jig كائن `AcDbCircle` مؤقتًا.
-   تغيّر طريقة `update` نصف القطر ديناميكيًا بناءً على إدخال المستخدم.

* * *

### الخطوة 2: استخدام Jig في أمر

يمكنك دمج Jig في أمر لإنشاء الكيان تفاعليًا:

```ts
import { AcEdCommand, AcApDocManager, AcEdPromptPointOptions, AcEdPromptDistanceOptions } from '@mlightcad/cad-simple-viewer'
import { AcApCircleJig } from './AcApCircleJig'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context) {
    // Step 2a: Acquire center point
    const centerPrompt = new AcEdPromptPointOptions('Specify center of circle:')
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Step 2b: Acquire radius using Jig
    const radiusPrompt = new AcEdPromptDistanceOptions('Specify radius of circle:')
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Step 2c: Add circle to database
    const circle = new AcDbCircle(center, radius)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

**سير العمل:**

1.  اطلب من المستخدم **مركز** الدائرة.
1.  أنشئ **Jig دائرة** مرتبطًا بالمركز.
1.  اطلب من المستخدم **نصف القطر** مع معاينة تفاعلية.
1.  ثبّت الدائرة النهائية في قاعدة البيانات.

* * *

## إدخال المستخدم

للاطلاع على دليل كامل ومحدَّث لواجهات API الإدخال في AcEditor وخيارات المطالبات وقواعد الكلمات المفتاحية ومعالجة نتائج المطالبات، راجع:

[إدخال المستخدم](./user-input)

## المراجع

-   [AutoCAD AcEdJig Documentation](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig Drag Loop](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)
