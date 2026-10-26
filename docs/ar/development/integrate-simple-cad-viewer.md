---
title: "دمج Simple Viewer"
---

# دمج Simple Viewer

يوفّر **cad-simple-viewer** المكوّنات الأساسية **عالية الأداء** لعارض CAD، مثل إدارة المستندات ومعالجة الأوامر والتنسيق بين واجهة المستخدم ومحركات العرض. وهو مصمّم لأداء مثالي عند التعامل مع ملفات CAD كبيرة.

لا تعتمد هذه الوحدة على أي إطار عمل واجهة مستخدم ولا توفّر أي واجهة سوى لوحة الرسم. إذا أردت دمج عارض CAD عالي الأداء في تطبيق ويب بواجهة المستخدم الخاصة بك، فهذه الوحدة هي الخيار الصحيح.

## الميزات الرئيسية
- إدارة مستندات محسّنة للملفات الكبيرة
- مكدس أوامر فعّال وعمليات تراجع/إعادة
- تكامل محسّن مع محركات العرض
- إعدادات وإدارة سياق موجّهة للأداء
- تصميم مستقل عن أطر العمل لأقصى قدر من المرونة

## متى ينبغي عليك اختيار cad-simple-viewer؟

استخدم `cad-simple-viewer` إذا كنت بحاجة إلى **منطق CAD الأساسي فقط** (إدارة المستندات ومكدس الأوامر والتكامل مع محرك العرض) دون أي اعتماد على إطار عمل واجهة مستخدم. تكون هذه الحزمة مثالية إذا:

- كنت تريد بناء **واجهة مستخدم مخصصة** أو دمج وظائف CAD في بيئة غير قائمة على Vue أو غير ويب.
- كنت تحتاج إلى أقصى قدر من المرونة والأداء للتعامل مع ملفات CAD كبيرة، وتخطط لربط المنطق بطبقة العرض أو الواجهة الخاصة بك.
- كنت تريد حلًا مستقلًا عن أطر العمل يوفّر فقط عمليات CAD الأساسية وعرض لوحة الرسم.

**يُنصح به لـ:** عمليات الدمج المخصصة، أو معالجة CAD بدون واجهة، أو المستخدمين المتقدمين الذين يبنون حلول CAD مصمّمة خصيصًا.

## التثبيت

```bash
npm install @mlightcad/cad-simple-viewer
```

## الاستخدام

يرجى الرجوع إلى [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) للاطلاع على الاستخدام الأساسي والاستخدام المتقدم.

تتكامل الوحدة على خطوتين: أولًا **تهيئة التطبيق** (إنشاء الكائن الأحادي `AcApDocManager` مرة واحدة)، ثم **فتح الرسم**.

### تهيئة التطبيق

`AcApDocManager` هو نقطة الدخول إلى `cad-simple-viewer`. وهو كائن أحادي (singleton): استدعِ `AcApDocManager.createInstance(options)` مرة واحدة عند الإقلاع، ثم اعصر إليه عبر `AcApDocManager.instance`. الاستدعاء المتكرر لـ `createInstance` يعيد الكائن الموجود فقط دون تطبيق الخيارات الجديدة.

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

جميع الخيارات اختيارية ومحددة في الواجهة `AcApDocManagerOptions`.

#### اللوحة والتخطيط

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | عنصر جديد | حاوية HTML التي تستضيف اللوحة. عند إسقاطها يُنشأ عنصر جديد وعليك إدراجه في DOM بنفسك. |
| `width` | `number` | عرض الحاوية | عرض اللوحة بالبكسل. |
| `height` | `number` | ارتفاع الحاوية | ارتفاع اللوحة بالبكسل. |
| `autoResize` | `boolean` | `false` | عندما تكون `true`، تتبع اللوحة تلقائيًا تغيّرات حجم الحاوية (تحجيم النافذة، طي الشريط الجانبي، ...). |
| `busyIndicatorHost` | `HTMLElement` | `container` | العنصر المضيف لطبقة "قيد العمل" (مثل مؤشر التصدير). اضبطه على هيكل العارض الخارجي لتغطي القناع الشريط وأشرطة الأدوات وشريط الحالة. |

#### العرض والخطوط

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | يتحكم في مكان عرض كيانات MTEXT. `true`: الخيط الرئيسي — ذاكرة قمة أقل لكن أول رسم أبطأ. `false`: Web Worker — ذاكرة أكثر لكن الرسم يظهر أسرع. |
| `preloadDefaultFonts` | `boolean` | `false` | عندما تكون `true`، تُحمَّل سلسلة الخطوط الاحتياطية الافتراضية مسبقًا عند التهيئة. افتراضيًا تُحمَّل الخطوط عند الحاجة أثناء رسم النص. |

#### الـ Workers والموارد

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | العنوان الجذري لجلب موارد وقت التشغيل مثل الخطوط وقوالب الرسومات. في النشر دون اتصال أو الاستضافة الذاتية وجّهه إلى نسختك الخاصة من الموارد. |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | عناوين حزم الـ Worker: `mtextRender` (Worker لتخطيط MTEXT/الرموز الحرفية) و`dwgParser` (Worker اختياري لتحليل DWG، يُستخدم لفحص الجاهزية). راجع [ضبط عناوين Worker](./configure-worker-urls) لمزالق أدوات البناء. |
| `checkWorkersOnInit` | `boolean` | `false` | عندما تكون `true`، يُتحقق من عناوين سكربتات الـ Worker بعد التهيئة عبر طلبات HEAD؛ وتُكشف النتيجة عبر `AcApDocManager.instance.workersReady` وحدث `workersReady`. |

#### الواجهة ومفاتيح المنتج

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | عندما تكون `false`، لا يُثبَّت منتقي الملفات المدمج لأمر OPEN (مفيد إذا كان لديك واجهة فتح خاصة بك). |
| `disableExport` | `boolean` | `false` | عندما تكون `true`، لا تُسجَّل أوامر تصدير الرسومات ومداخل الواجهة المرتبطة بها (`cdxf` و`pngout` و`jpgout` و`bmpout` وتصدير HTML/PDF/SVG). هذا مفتاح على مستوى المنتج/تجربة الاستخدام وليس حماية DRM — بيانات الرسم ما زالت موجودة في الذاكرة. |
| `docsBaseUrl` | `string` | موقع توثيق MLightCAD | العنوان الجذري المطلق لصفحات دليل المستخدم المترجمة التي تستخدمها روابط المساعدة داخل التطبيق. |
| `commandAliases` | `Record<string, string \| string[]>` | الأسماء البديلة المدمجة | تجاوز الأسماء البديلة للأوامر حسب الاسم العام للأمر، مثل `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`. تحتفظ الأوامر غير المدرجة بأسمائها البديلة المدمجة. |

#### الإضافات وخيارات الفتح الافتراضية

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | تحميل الإضافات تلقائيًا أثناء التهيئة. يقبل `fromConfig` كائنات إضافات أو دوال مصنعية؛ ويحمّل `fromFolder` ملفات الإضافات من مجلد (`folderPath` و`pluginList` و`continueOnError`). راجع [نظام الإضافات](./plugin-system). |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` أو `() => AcApOpenDatabaseOptions \| Promise<...>` | – | الخيارات الافتراضية للملفات المفتوحة عبر نافذة OPEN المدمجة. يمكن أن تكون كائنًا ثابتًا أو دالة مصنعية متزامنة/غير متزامنة. ويمكن تحديثها لاحقًا عبر `AcApDocManager.instance.setOpenDocumentDefaults(...)`. |

#### تسجيل محوّل DWG

لا يُسجِّل `cad-simple-viewer` محوّل DWG **افتراضيًا** (لأن LibreDWG مرخّص برخصة GPL). لفتح ملفات DWG، سجِّل محوّلًا مثل `@mlightcad/libredwg-converter` قبل الفتح:

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### فتح الرسم

يوفر مدير المستندات طريقتين لفتح الرسم. كلتاهما تعيد `Promise<boolean>` تُحلّ إلى `true` عند نجاح فتح الملف:

```typescript
// 1. من عنوان URL (يقوم العارض بجلب الملف)
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. من محتوى ملف لديك مسبقًا (مثل إدخال ملف)
const success = await docManager.openDocument(
  'plan.dwg',               // امتداد اسم الملف يحدد DWG أو DXF
  await file.arrayBuffer(), // محتوى الملف كـ ArrayBuffer
  options
)
```

تقبل الطريقتان الكائن نفسه `AcApOpenDatabaseOptions`. عند إسقاطه يطبّق المدير `drawNoPlotLayers: false` و`progressiveRendering: false`. يجمع هذا النوع بين خيارات مستوى العارض والنوع الأساسي `AcDbOpenDatabaseOptions` من `@mlightcad/data-model`.

#### خيارات العارض

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | وضع الوصول: `Read` (0، عرض فقط)، `Review` (4، مراجعة، متوافق مع Read)، `Write` (8، قراءة/كتابة كاملة، متوافق مع البقية). الأوضاع الأعلى متوافقة مع الأدنى. كما يحدد `openViewMode` الافتراضي (انظر أدناه). |
| `progressiveRendering` | `boolean` | `false` | يتحكم في ما إذا كانت الهندسة تُرسم أثناء استمرار تحويل الرسم. `false`: لا يُعاد رسم اللوحة حتى تتحول كل كيان، وتبقى طبقة الفتح ظاهرة حتى تنتهي مهام النص/رموز INSERT المؤجلة. `true`: تتنازل عملية تحويل الكيانات عبر دورات حلقة الأحداث فتُرسم الهندسة كلما وصلت الدفعات؛ يصبح التحريك/التكبير متاحًا بعد اكتمال التقرير عن التحليل والتحويل، ويواصل ما تبقى من الهندسة التحويل في الخلفية. استخدم `true` للعرض التفاعلي للملفات الكبيرة، و`false` للقطات الشاشة أو الإطارات الأولى الحتمية. |
| `openViewMode` | `AcApOpenViewMode` | `Extents` لـ Read/Review، `Saved` لـ Write | كيفية تأطير كل تخطيط لم يتدخل فيه المستخدم بعد. `Extents` (`'extents'`) تكبّر لتشمل الهندسة المحوَّلة. `Saved` (`'saved'`) تستعيد العرض المحفوظ في AutoCAD (مساحة النموذج تستخدم VPORT `*ACTIVE`؛ ومساحة الورق تستخدم حدود التخطيط إذا احتوت viewport حقيقية، وإلا صندوق الـ viewport). |
| `sysVars` | `AcApOpenSysVars` | – | متغيرات النظام لتجاوزها عند فتح قاعدة البيانات. المفاتيح أسماء متغيرات النظام (غير حساسة لحالة الأحرف)؛ ويمكن أن تكون القيم `number` أو `boolean` أو `string` أو `AcCmColor`. أمثلة شائعة: `lwdisplay: false` لإخفاء أوزان الخطوط، و`paperbkcolor` لضبط لون خلفية مساحة الورق. |
| `convertInvisibleLayers` | `boolean` | `false` | عندما تكون `true`، تتحول كيانات الطبقات المطفأة/المغلقة أثناء الفتح حتى لا يحتاج تصدير HTML/PDF دون اتصال إلى تمريرة ثانية. اتركها `false` للعرض التفاعلي (تتحول عند تفعيل الطبقة). |
| `convertAllLayouts` | `boolean` | `false` | عندما تكون `true`، تُسجَّل وتتحول كل تخطيطات مساحة الورق أثناء الفتح/بعده مباشرة، حتى لا ينتظر التصدير زيارة المستخدم لكل تبويب تخطيط. |
| `skipSpatialIndex` | `boolean` | `false` | عندما تكون `true`، يُتخطى بناء الفهرس المكاني الهرمي أثناء تحويل الكيانات. يخدم هذا الفهرس الالتقاط التفاعلي والنطاقات الذكية؛ وتحتاج عملية تصدير HTML/JPEG بلا واجهة إلى دفعات المشهد فقط، فيمكن تخطيه لتوفير الوقت والذاكرة. |
| `cooperativeYield` | `boolean` | `true` | عندما تكون `false`، تُعطَّل التنازلات التعاونية عبر `setTimeout` أثناء تحويل الكيانات ويُتخطى أي رسم WebGL أثناء الفتح. السكربتات بلا واجهة لا تحتاج واجهة تفاعلية؛ وتعطيل التنازلات يقصّر زمن الفتح. |

#### خيارات قاعدة البيانات (موروثة من `@mlightcad/data-model`)

| الخيار | النوع | الافتراضي | الوصف |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | الحد الأدنى لعدد الكيانات في كل دفعة معالجة. الدفعات الأكبر تقلل عبء الجدولة؛ والمثال الرسمي يستخدم `1000`. الحد الأعلى هو إجمالي عدد الكيانات. |
| `timeout` | `number` | افتراضي المحوّل | مهلة تحليل الـ Web Worker بالمللي ثانية. تُستخدم فقط عندما يحلّل المحوّل المحدد داخل Worker. |
| `encoding` | `string` | كشف تلقائي | تجاوز ترميز النص لأسماء الطبقات والتعليقات والنصوص والسمات (مثل `'gbk'` أو `'euc-kr'`). عند الإسقاط، تقرأ DXF قيمة `$DWGCODEPAGE` ويقرأ DWG صفحة الترميز من الترويسة. القيمة الصريحة تتقدم على الكشف التلقائي — مفيدة للملفات ذات صفحة ترميز مفقودة أو خاطئة التصريح. |
| `drawNoPlotLayers` | `boolean` | `false` | ما إذا كانت كيانات الطبقات غير القابلة للطباعة (Defpoints و`*-NPLT` و...) تُرسم. `true` = سلوك AutoCAD المكتبي (مرئية على الشاشة)؛ `false` = سلوك عارض الويب/النشر (مخفية). يضبط `AcApDocManager` الافتراضي على `false`. |
| `circleSides` | `number` | `50` (مسودة) | أقصى عدد مقاطع لتقسيم الدائرة الكاملة. القيم الأقل توفر ذاكرة GPU وتصغّر تصدير HTML؛ والأعلى تبدو أنعم. تُحصر في نطاق DXF VPORT. والأقواس القصيرة تستخدم مقاطع أقل. |
| `fileName` | `string` | – | اسم ملف الرسم مع الامتداد. يحدّث متغير النظام `DWGNAME` (للقراءة فقط) في قاعدة البيانات المفتوحة. |

#### الخيارات المهجورة

| الخيار | الحالة |
| --- | --- |
| `waitForTextGeometry` | يُتجاهل. مرحلتا العرض التدريجي تتحكم فيهما الآن `progressiveRendering`؛ وتمريره يسجّل تحذيرًا. |
| `fontLoader` و`failOnFontLoadError` | أزيلت. تُحمَّل الخطوط بشكل متأخر بواسطة عارض النص أثناء الرسم؛ وتمريرها يسجّل تحذيرًا. |

#### مثال

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('فشل فتح الرسم')
}
```

لتتبع دورة حياة الفتح، اشترك في الأحداث على `AcApDocManager.instance.events`: `documentToBeOpened` و`documentCreated` و`documentToBeActivated` و`documentActivated` و`documentToBeDestroyed` و`documentDestroyed`.

### تعديل الرسومات في الوقت الفعلي

على الرغم من أن `cad-simple-viewer` لا يدعم حفظ الرسومات في ملفات DWG/DXF، فإنه يوفّر دعمًا شاملًا لـ**تعديل الرسومات في الوقت الفعلي**. يمكنك إضافة الكيانات وتعديلها وحذفها داخل الرسم، وسيُحدَّث العارض تلقائيًا ليعكس هذه التغييرات.

عند تعديل الكيانات، فإنك تتعامل مباشرة مع قاعدة بيانات الرسم الأساسية. يكتشف العارض هذه التغييرات تلقائيًا ويحدّث العرض وفقًا لذلك. تضمن هذه المزامنة الفورية أن:

- تكون جميع التعديلات مرئية على الفور
- يتتبّع مكدس الأوامر التغييرات بشكل صحيح لعمليات التراجع/الإعادة. وسيُنفَّذ ذلك قريبًا.

تتيح هذه الإمكانية استخدام `cad-simple-viewer` في التطبيقات التي لا تحتاج إلى عرض ملفات CAD فحسب، بل تتيح أيضًا للمستخدمين التفاعل مع محتوى الرسم وتعديله.

**ملاحظة مهمة**: أنماط الاستخدام في `cad-simple-viewer` **شديدة الشبه بـ AutoCAD RealDWG**. إذا كانت لديك خبرة في تطوير AutoCAD RealDWG، فستجد بنية API وسير العمل متطابقين تقريبًا. الفرق الرئيسي هو أننا نستخدم [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) بدلًا من مكتبات RealDWG الأصلية.

يوضّح [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) كيفية إنشاء رسم واحد باستخدام [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/).

## الدور في MLightCAD

تعمل هذه الحزمة كطبقة المنطق الأساسية، إذ تربط واجهة المستخدم الأمامية بمحركات العرض وتدير جميع العمليات المتعلقة بالمستندات.
