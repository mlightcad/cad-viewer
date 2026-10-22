---
title: "إدخال المستخدم"
---

# إدخال المستخدم

تشرح هذه الصفحة كيفية جمع AcEditor لإدخالات المستخدم، بما في ذلك طرق الإدخال المتاحة وأنماط خيارات المطالبة المشتركة (الرسائل والكلمات المفتاحية وJigs وسلوك الشريط المطاطي) وقواعد مطابقة الكلمات المفتاحية وكيفية تفسير نتائج المطالبات. كما توضح الاستخدام المقصود: يجب تحصيل الإدخال عبر واجهات API الخاصة بـ AcEditor بدلًا من مستمعي الفأرة/لوحة المفاتيح اليدويين على لوحة الرسم.

**الغرض**

يحاكي AcEditor بنية وهدف واجهات API إدخال المحرر في AutoCAD. ويوفّر طريقة متسقة وعالية المستوى لتحصيل إدخال المستخدم مع تنسيق المطالبات الديناميكية والكلمات المفتاحية وJigs المعاينة. معالجة الإدخال مركزية عن قصد: إذ تُجرَّد مطابقة الكلمات المفتاحية وتفاعلات الفأرة ويجب الوصول إليها عبر طرق AcEditor. ورغم أنه يمكنك تقنيًا الاستماع إلى أحداث لوحة المفاتيح أو الفأرة مباشرة على `AcEdBaseView.canvas`، فإن ذلك يُعدّ استخدامًا غير صحيح وسيتجاوز دورة حياة الإدخال في المحرر ومعالجة الكلمات المفتاحية وأعراف نتائج المطالبات.

**طرق الإدخال**

| الطريقة | نوع الخيارات | نوع النتيجة | الاستخدام النموذجي |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | الحصول على نقطة |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | إدخال مسافة مع نقطة أساس اختيارية |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | إدخال زاوية مع نقطة أساس اختيارية |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | إدخال رقمي (عشري) |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | إدخال نص حر |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | إدخال كلمات مفتاحية فقط (يعيد الكلمة المفتاحية العامة) |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | اختيار كيان واحد |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | اختيار كيانات متعددة |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | اختيار زاويتين لتحديد مربع |

**خيارات المطالبة المشتركة**

جميع أنواع خيارات المطالبة ترث من `AcEdPromptOptions<T>` وتتشارك هذه الإمكانات:

- `message`: نص المطالبة المعروض للمستخدم.
- `keywords`: كائن `AcEdKeywordCollection` يحتوي على الكلمات المفتاحية الصالحة.
- `appendKeywordsToMessage`: عند تفعيله، تُلحق الكلمات المفتاحية بالرسالة للعرض.
- `jig`: يربط `AcEdPreviewJig<T>` لتفعيل المعاينة الحية أثناء الإدخال.
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`: يحلّل رسالة مركّبة مثل `"Pick point [Yes/No]"` ويعيّن الكلمات المفتاحية العامة من قائمة مفصولة بمسافات.

**إعدادات الشريط المطاطي ونقطة الأساس**

تدعم عدة خيارات مطالبة سلوك خط الشريط المطاطي أو نقطة الأساس:

- `AcEdPromptPointOptions`: `basePoint`، `useBasePoint`، `useDashedLine`، `allowNone`.
- `AcEdPromptDistanceOptions`: `basePoint`، `useBasePoint`، `useDashedLine`، `only2d`.
- `AcEdPromptAngleOptions`: `basePoint`، `useBasePoint`، `useDashedLine`، `useAngleBase`.
- `AcEdPromptBoxOptions`: `useBasePoint`، `useDashedLine` وكلًا من `firstCornerMessage` / `secondCornerMessage` بشكل منفصل.

عند تفعيل `useBasePoint`، يرسم المحرر خط شريط مطاطي من نقطة الأساس إلى المؤشر. ويتحكم `useDashedLine` في كون ذلك الخط متقطعًا أم لا.

**قواعد الكلمات المفتاحية وصيغها**

تُعرَّف الكلمات المفتاحية عبر `AcEdKeywordCollection` وتُطابَق دون تمييز بين حالة الأحرف. والقيمة المحلولة هي دائمًا **الاسم العام** للكلمة المفتاحية.

- لكل كلمة مفتاحية `displayName` (واجهة المستخدم)، و`globalName` (داخلي)، و`localName` (إدخال المستخدم).
- يمكن للمستخدمين إدخال `localName` أو `globalName` أو نص العرض أو اسم مستعار مشتق؛ وكلها تُطابَق دون تمييز بين حالة الأحرف.
- يُشتق الاسم المستعار من الأحرف الكبيرة في الاسم العام، مثل `Yes → Y` و`sAve → A` و`eXit → X`.
- إضافة البادئة `_` إلى الإدخال تفرض مطابقة كلمة مفتاحية عامة.

يمكنك تعريف الكلمات المفتاحية بطريقتين شائعتين:

- استخدام API: `options.keywords.add(displayName, globalName, localName)`.
- قائمة نصية بأسلوب ObjectARX (لمُنشئ `AcEdKeywordCollection`): مقطعان محلي وعام يفصلهما `_`، واختصار بفاصلة اختياري، والأحرف الكبيرة تحدد الاسم المستعار.

أمثلة:

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**نتائج المطالبات**

تعيد معظم طرق الإدخال كائنًا بأسلوب `PromptResult` يتضمن:

- `status`: رمز `AcEdPromptStatus` مثل `OK` أو `Cancel` أو `Keyword`.
- `stringResult`: عندما يكون `status === Keyword`، يحتوي هذا على **الكلمة المفتاحية العامة** التي طابقت.

توفّر فئات النتائج الخاصة بكل نوع حقل `value` مُنمَّطًا عندما يكون `status === OK`:

| نوع النتيجة | حقل القيمة | ملاحظات |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | النقطة عند OK |
| `AcEdPromptDoubleResult` | `value: number` | قيمة عشرية عند OK |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | معرّف الكيان المحدد |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | مجموعة التحديد |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | المربع المحيط |

ملاحظة: تعيد `getKeywords` نص الكلمة المفتاحية مباشرة بدلًا من كائن `PromptResult`.

**مثال: نقطة مع كلمات مفتاحية**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```
