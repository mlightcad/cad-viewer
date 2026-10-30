---
title: "إنشاء عارض ويب سحابي لملفات DWG"
---

# إنشاء عارض ويب سحابي لملفات DWG باستخدام `cad-html-plugin`: العرض المسبق + الاستضافة الثابتة

تقدّم هذه المقالة كيفية استخدام قدرة تصدير **حزمة ACEX متعددة الملفات** في `@mlightcad/cad-html-plugin` لتحويل رسومات DWG/DXF إلى موارد ثابتة قابلة للاستضافة المباشرة على جانب الخادم (أو أثناء عملية البناء). يمكن للمستخدمين بعد ذلك فتح صفحة ويب وعرض الرسم دون الحاجة إلى تحليل الرسم أو تثليث الهندسة في المتصفح.

للتفاصيل حول الصيغة نفسها (حقول manifest، ترميز ACEC/ACEO الثنائي، وغيرها)، راجع [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md). تركّز هذه المقالة فقط على **كيفية إنشاء عارض رسومات سحابي باستخدام هذه الصيغة**.

---

## 1. الخلفية: معماريتان لعارض الرسومات على الويب

**المعمارية A: التحليل الفوري في المتصفح (الطريقة الافتراضية التي يفتح بها `cad-viewer` ملفات DWG/DXF)**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

تحدث كل تكلفة التحليل والتحويل من «الكيانات → بيانات العرض» على **جهاز المستخدم**: فالرسومات الكبيرة لها عرض أولي بطيء، وقد تصبح الأجهزة المحمولة منخفضة المواصفات بطيئة، وقد يكون ضغط الذاكرة كبيرًا.

**المعمارية B: العرض المسبق + الاستضافة الثابتة (النهج السائد في عارضات الرسومات السحابية مثل Haochen Viewer Web وAutodesk Web Viewer)**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

**الحزمة المتعددة (multi package)** التي يصدّرها `cad-html-plugin` هي نتاج المعمارية B: ملف `.zip` يصبح بعد فك الضغط دليلًا ثابتًا محضًا. يمكن استضافته عبر أي خادم ويب (nginx، تخزين كائنات، CDN) و**لا يتطلب أي وقت تشغيل خلفي**.

### متى تختار المعمارية B

* تُستخدم الرسومات أساسًا في **النشر / المشاركة / العرض الأرشيفي**، مع كثير من المستخدمين الذين يشاهدون الرسم نفسه مرارًا (معدل إصابة عالٍ لذاكرة CDN المؤقتة)؛
* تريد عرضًا أوليًا سريعًا وتجربة جوال جيدة دون مطالبة أجهزة المستخدمين بالتحليل والتثليث؛
* لا تريد توزيع ملف DWG/DXF الأصلي على المشاهدين (الحزمة تحتوي فقط على **بيانات على مستوى العرض**، دون سجلات كيانات قابلة للتحرير، مما يوفر درجة من الحماية لأصول الرسم)؛
* تريد أن تقترب تكاليف الخادم من الصفر (حركة ثابتة محضة).

### التكاليف والمتطلبات المسبقة

* **يجب أن تكون الشبكة سريعة بما يكفي.** بيانات العرض المسبق هي هندسة عرض مسطّحة وقد تكون أكبر من DWG/DXF الأصلي (رغم أنها عادةً صغيرة جدًا بعد ضغط gzip: كتلة غير مضغوطة بحجم نحو 2 MiB تصبح عادةً أقل من 200 KiB بعد gzip). إذا كانت تكلفة الشبكة لتنزيل هذه البيانات أكبر بالفعل من تكلفة التحليل + التثليث محليًا، فلن يكون لهذا النهج ميزة. في بيئات الشبكات الضعيفة أو السيناريوهات التي يُعرض فيها رسم صغير مرة واحدة فقط، قد يكون تسليم ملف HTML واحد مباشرةً أو تحليل الرسم عبر الإنترنت أكثر ملاءمة.
* **يجب إعادة تصدير الرسومات وإعادة نشرها بعد تحديثها.** هذا النهج مناسب لسيناريوهات «القراءة فقط بعد النشر»، لكن ليس للتحرير التعاوني عبر الإنترنت.
* الحماية بكلمة مرور والانتهاء متاحة حاليًا فقط لتصدير **ملف HTML واحد**. يجب التعامل مع التحكم في الوصول للحزم المتعددة بواسطة طبقة الاستضافة (عناوين URL موقّعة، وكلاء عكسيون مصادَق عليهم، وغيرها).

> **كيف تختار بين الملف الواحد والملفات المتعددة؟**
>
> الإرسال مباشرةً إلى شخص أو الفتح دون اتصال بالنقر المزدوج → استخدم `single` (ملف `.html` مكتفٍ ذاتيًا).
>
> الاستضافة على خادم ويب/CDN للوصول بواسطة كثير من المستخدمين → استخدم `multi` (النهج الموصوف في هذه المقالة): تُقسَّم الهندسة إلى أجزاء صغيرة و**تُحمَّل تدريجيًا**. يلزم تنزيل الأجزاء الأولى فقط من التخطيط الحالي للعرض الأولي؛ وتُحمَّل التخطيطات الأخرى وبيانات التقاط الكائنات عند الطلب.

---

## عرض توضيحي عبر الإنترنت

إذا أردت الحصول على إحساس عملي بهذا النهج **العرض المسبق + الاستضافة الثابتة** لعرض DWG على الويب، يمكنك فتح العرض التوضيحي التالي مباشرةً:

👉 [**جرّب عارض DWG على الويب عبر الإنترنت**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

يستخدم هذا العرض التوضيحي نهج العرض المسبق الموصوف في هذه المقالة. تم بالفعل تحليل رسم DWG وتثليث هندسته قبل النشر. عندما يفتح المستخدمون صفحة الويب، لا حاجة إلى تحليل ملف DWG الأصلي مرة أخرى؛ يحمّل العارض بيانات العرض المُولَّدة مسبقًا مباشرةً.

ولأن موارد الرسم مخزّنة مؤقتًا في المتصفح، **قد تحتاج عند فتح الصفحة أول مرة إلى الانتظار حتى تنزيل الموارد؛ وبعد إنشاء ذاكرة التخزين المؤقت، سيكون فتح الصفحة نفسها لاحقًا سريعًا جدًا**. هذا أحد أسباب كون نهج **العرض المسبق + الاستضافة الثابتة** مناسبًا بشكل خاص لنشر الرسومات ومشاركتها وعرضها مرارًا.

يمكنك تجربة العرض التوضيحي أولًا ثم متابعة قراءة تفاصيل المعمارية والتنفيذ أدناه.

---

## 2. المخرجات: دليل ثابت جاهز للاستخدام بعد فك الضغط

ينتج تصدير multi ملف `.zip`، لكن **الملف المضغوط يُستخدم للتوزيع فقط**. لا يفكّ العارض الملف في المتصفح. بل يجلب manifest وملفات الأجزاء الفردية بالتتابع. **يجب فك ضغط الحزمة قبل الاستضافة:**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

تسلسل التحميل بعد وصول المستخدم إلى `viewer.html` هو:

1. قراءة إعداد `#mlcad-package` المضمّن في الصفحة والحصول على عنوان URL للـ manifest (الافتراضي: `./{name}.acex.json`)؛
2. تنزيل manifest (JSON صغير) وتهيئة الطبقة والتخطيط والحدود ومكوّنات واجهة المستخدم الأخرى؛
3. تنزيل أجزاء هندسة **التخطيط الحالي** واحدًا تلو الآخر → gunzip → فك الترميز → عرض، مع عرض كل جزء بمجرد أن يصبح جاهزًا؛
4. بعد أن يصبح الرسم قابلًا للتحريك والتكبير بالفعل، تنزيل بيانات التقاط الكائنات `*.osnap.gz` (المستخدمة للقياس/التقاط الكائنات)؛
5. لا تُحمَّل التخطيطات الأخرى إلا عندما يبدّل المستخدم إليها.

وقت تشغيل العارض مضمّن بالفعل في `viewer.html`، لذلك لا يحتوي الدليل على **أي اعتماديات JavaScript إضافية**. تشمل الميزات: التحديد / التحريك / التكبير (الحدود، النافذة، العرض الأصلي)، لوحة الطبقات، تبديل التخطيط، القياس، الترميز (ترميز Design Review)، التقاط الكائنات، وواجهات متعددة اللغات مدمجة بالصينية / الإنجليزية / التشيكية / التركية.

---

## 3. ثلاث طرق لتوليد حزمة متعددة

### الطريقة 1: التصدير اليدوي من تطبيق cad-viewer على الويب (مناسب للتصدير العرضي)

* افتح الرسم في [cad-viewer](https://mlightcad.com/cad-viewer/)، وشغّل الأمر `chtml` لفتح حوار التصدير، واختر **"حزمة متعددة الملفات (ZIP)"** كصيغة التصدير؛
* أو شغّل `-chtml` من سطر الأوامر وأجب عن المطالبات، واختر **Multi** للصيغة:

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

سينزّل المتصفح ملف `.zip`.

### الطريقة 2: التحويل الدفعي على الخادم / CI (موصى به للمعماريات السحابية)

تستخدم حزمة CLI بلا واجهة [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli) أداة Playwright لتشغيل خط التحليل + التثليث + التصدير الكامل في Chromium بلا واجهة. وهي مثالية للتكامل في خدمة تحويل أو خط CI.

التثبيت (يتطلب Node.js 20+):

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

يتطلب التصدير سكربت `.scr` يجيب عن مطالبات `-chtml` سطرًا بسطر (`Single/Multi`، `Yes/No`، `Black/White/Space`، `Extents/Current`، `Measure/View`). تتضمن حزمة CLI ملف `examples/export-html-multi.scr` جاهزًا للاستخدام (بعد تثبيت npm، يوجد في `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`؛ وفي المستودع يوجد في [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr)):

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / hidden layers / layouts / background /
; initial view / viewer mode / chunk size MiB / compress chunks
-chtml
Multi
Yes
Yes
Black
Extents
Measure
2
Yes
quit
```

تصدير رسم واحد:

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

راجع القسم 6 للحصول على حل أتمتة كامل لتحويل الدلائل دفعيًا وفك ضغط الملف المضغوط والنشر.

يمكنك أيضًا دمجه في خدمة التحويل الخاصة بك باستخدام واجهة البرمجة:

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### الطريقة 3: التصدير البرمجي في تطبيق الويب الخاص بك

إذا كان تطبيقك يضمّن `cad-simple-viewer` بالفعل (يرى المستخدمون الرسومات مباشرةً في تطبيق الويب الخاص بك)، فيمكنك أيضًا استدعاء واجهة التحويل مباشرةً وتحويل «تصدير حزمة الاستضافة» إلى زر في منتجك:

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

واجهات برمجية أدنى (جمّع الحزمة بنفسك وحدد ما إذا كنت ستكتبها على القرص أو ترفعها):

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **ملاحظة:** تحليل DWG/DXF وبناء المشهد يعتمدان على بيئة تشغيل المتصفح في `cad-simple-viewer`، لذلك **يجب أن يستخدم التحويل على جانب الخادم الطريقة 2 (CLI)**. الطريقة 3 مناسبة لدمج وظيفة التصدير في منتجك القائم على الويب.

---

## 4. النشر على خادم ويب

### 4.1 فك الضغط والنشر

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

بعد النشر، ما عليك سوى إعطاء المستخدمين عنوان URL `https://your-domain/cad-packages/floor-plan/viewer.html`. يُوصى بتنظيم الدلائل حسب **معرّف الرسم / رقم الإصدار** (على سبيل المثال، `/cad-packages/{drawingId}/{version}/`). عند تحديث رسم، انشر دليل إصدار جديد. يمكن سحب الإصدار القديم بشكل طبيعي، كما تسهّل هذه البنية التخزين المؤقت.

### 4.2 متطلبات الخادم

أي خدمة قادرة على تقديم ملفات ثابتة ستفي بالغرض: nginx، Apache، IIS، `npx serve`، Python `-m http.server`، وكذلك استضافة المواقع الثابتة على تخزين الكائنات مثل Alibaba Cloud OSS / AWS S3 + CloudFront. هناك متطلبات قليلة فقط:

1. **يجب الوصول عبر HTTP(S).** يستخدم العارض `fetch()` لتحميل manifest وملفات الأجزاء. لا يعمل مع بروتوكول `file://`، لذلك لا يمكنك ببساطة النقر المزدوج على `viewer.html` واستخدامه كملف محلي.
2. **يجب استضافة الحزمة كاملةً على الأصل نفسه (same origin).** لأسباب أمنية، يتحقق المحمّل من أن `manifestUrl` من الأصل نفسه مع الصفحة، وأن ملفات الأجزاء من الأصل نفسه مع manifest وتقع داخل دليل الحزمة (تُرفض عناوين URL المطلقة ومسارات `..` التي تعبر الدلائل). لذلك ضع `viewer.html` وmanifest و`chunks/` تحت **الموقع نفسه / نطاق CDN نفسه**. لا تقسّم ملفات الأجزاء على نطاق آخر. استضافة الصفحة والأجزاء معًا على نطاق CDN أمر مقبول تمامًا.
3. **يجب إرجاع ملفات `.gz` ببايتاتها الأصلية ويجب ألا تتضمن ترويسة استجابة `Content-Encoding: gzip`.**

   ملفات `.acex.gz` / `.osnap.gz` هي بايتات مضغوطة بـ gzip بالفعل، ويقوم العارض بعملية gunzip بنفسه في JavaScript. إذا أضاف خادم الويب (عادةً `mod_mime` في Apache، الذي قد يضبط افتراضيًا `AddEncoding gzip gz` لامتدادات `.gz`، أو بيانات وصفية مهيّأة من بعض خدمات CDN/تخزين الكائنات) ترويسة `Content-Encoding: gzip`، فسيفكّ المتصفح ضغط الملف تلقائيًا مرة واحدة، وسيحاول العارض فك ضغطه مرة أخرى، مما يؤدي إلى خطأ. تأكد من إرجاع هذه الملفات كبيانات ثنائية معتمة (`Content-Type: application/octet-stream` كافٍ؛ يقرأها العارض باستخدام `arrayBuffer` ولا يعتمد على نوع MIME). ويجب أن يستخدم manifest `.acex.json` النوع `application/json`.
4. **استراتيجية التخزين المؤقت.** محتويات ملفات الأجزاء غير قابلة للتغيير (لا تتغير داخل دليل الإصدار نفسه)، لذلك من الآمن منح `chunks/` عمرًا طويلًا للتخزين المؤقت (`Cache-Control: public, max-age=31536000, immutable`). يجب أن تستخدم ملفات manifest عمرًا قصيرًا أو `no-cache`، حتى يتمكن العملاء من اكتشاف التحديثات بسرعة عند إعادة تصدير الحزمة إلى الدليل نفسه. إذا نُشرت الحزم في دلائل مرقّمة بالإصدار، فيمكن للدليل كاملًا استخدام التخزين المؤقت طويل المدى.

مثال nginx (الإعداد الافتراضي لا يضغط/يفكّ ضغط ملفات `.gz` عند طلبها مباشرةً؛ وهذا مصرَّح به هنا لتجنب التأثر بإعدادات CDN أو الإعدادات المخصصة):

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

يجب على مستخدمي Apache التأكد من عدم تفعيل `AddEncoding gzip .gz` لامتداد `.gz` (وهذا شائع في إعداد MIME الافتراضي). إذا لزم الأمر، أزله في `.htaccess` الخاص بدليل الحزمة:

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 التحقق المحلي

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

إذا ظهر الرسم بشكل صحيح وأمكنك تبديل التخطيطات وإجراء القياسات، فإن إعداد الاستضافة صحيح.

---

## 5. كيفية اختيار خيارات التصدير

| الخيار                  | الوصف                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | النهج الموصوف في هذه المقالة. `'single'` ملف HTML واحد مكتفٍ ذاتيًا                                                                                                              |
| `viewerMode`            | `'measure'` (الافتراضي): يشمل القياس والترميز والتقاط الكائنات، مع بيانات `*.osnap.gz`؛ `'view'`: للعرض فقط (تحريك/تكبير/طبقات)، مما ينتج حزمة أصغر وعرضًا أوليًا أسرع |
| `exportLayouts`         | `true` (الافتراضي) يصدّر تخطيطات مساحة الورق؛ `false` يصدّر مساحة النموذج فقط، ولا يعرض شريط الأدوات تبديل التخطيط                                                                    |
| `exportInvisibleLayers` | `true` (الافتراضي) يصدّر أيضًا الطبقات المطفأة/المجمّدة؛ `false` يصدّر الطبقات المرئية فقط، مما ينتج حزمة أصغر                                                                                 |
| `initialView`           | `'fit'` (الافتراضي، ملاءمة الرسم للعرض الكامل عند الفتح) أو `'current'` (الحفاظ على موضع العرض وقت التصدير)                                                                           |
| كلمة المرور / الانتهاء   | مدعومة فقط في وضع `single`؛ بالنسبة للحزم المتعددة، استخدم المصادقة في طبقة الاستضافة (عناوين URL موقّعة، وكيل عكسي مع رموز وصول، وغيرها)                                                   |

---

## 6. مثال خط أنابيب من البداية إلى النهاية

سكربت Node أدنى لعملية «تحويل → فك ضغط → نشر» (يمكن وصله بـ webhook بعد رفع رسم أو بخط CI):

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

في بيئة الإنتاج، يمكنك أيضًا إضافة ميزات مثل: استخدام تجزئة (hash) لمحتوى الرسم لتحديد ما إذا كان يمكن تخطي تحويل مكرر، أو إعادة محاولة التحويلات الفاشلة، أو استخدام `PutObject` مباشرةً لرفع `pkg.files` إلى تخزين الكائنات (باستخدام `buildAcExPackage` من الطريقة 3 حتى لا تحتاج إلى إنشاء ملف مضغوط أصلًا).

---

## 7. الأسئلة الشائعة

**س: هل يمكنني ببساطة وضع ملف zip على الخادم وتقديم رابط له؟**

لا. الملف المضغوط مجرد صيغة تغليف للتنزيل والتوزيع. في وقت التشغيل، يجلب العارض `viewer.html` / `*.acex.json` / `chunks/*.gz` المفكوكة. يجب إما فك ضغطه على الخادم واستضافة الملفات الناتجة، أو استخدام `unzipAcExPackageFiles` في تطبيقك لفك ضغطه على الواجهة الأمامية (انتبه لمشكلات الأصل نفسه والذاكرة؛ وهذا غير موصى به للرسومات الكبيرة).

**س: ملفات الأجزاء تعيد 404 / تفشل في التحميل بعد فتح الصفحة.**

تحقق مما إذا كانت الصفحة تُفتح عبر HTTP(S)؛ وما إذا كان دليل `chunks/` منشورًا مع `viewer.html` وmanifest؛ وما إذا كانت ملفات الأجزاء قد أُعيدت تسميتها أو نُقلت (قيم `href` في manifest هي مسارات نسبية، لذلك يجب الحفاظ على بنية الدليل).

**س: تُنزَّل ملفات الأجزاء بنجاح لكنها تفشل في التحليل.**

السبب الأرجح أن الخادم أضاف `Content-Encoding: gzip` إلى ملفات `.gz` (ففكّ المتصفح ضغطها تلقائيًا مرة واحدة). تحقق من ترويسات الاستجابة وفقًا للبند 3 في القسم 4.2.

**س: هل يمكنني وضع ملفات الأجزاء على CDN مع إبقاء الصفحة على نطاقي الخاص؟**

يتطلب المحمّل الحالي أن تكون الصفحة وmanifest وملفات الأجزاء على الأصل نفسه. انشر **دليل الحزمة كاملًا** على نطاق CDN واترك المستخدمين يصلون إلى `viewer.html` مباشرةً من CDN للاستفادة من تسريع CDN.

**س: لماذا أصبح اسم الملف المصدَّر `floor-plan-2.zip`؟**

عندما يكون الملف الهدف موجودًا بالفعل، تضيف عملية التصدير تلقائيًا رقمًا تسلسليًا لتجنب الكتابة فوقه. قبل التصدير مرة أخرى، احذف دليل الإخراج أو أفرغه حتى لا تلتقط العملية التالية ملفًا مضغوطًا قديمًا.

**س: ماذا يحدث عند تعديل الرسم؟**

شغّل التحويل مرة أخرى وانشره في دليل جديد (أو اكتب فوق الدليل نفسه وأبطل صلاحية ذاكرة manifest المؤقتة). الحزمة لقطة من بيانات العرض ولا تتبع تحديثات الملف المصدر تلقائيًا.

**س: هل سيُكشف الرسم الأصلي؟**

تحتوي الحزمة فقط على بيانات **على مستوى العرض** مثل دفعات الخطوط/الشبكات وأسماء الطبقات وأسماء التخطيطات والحدود والوحدات. ولا تحتوي على بايتات DWG/DXF أو سجلات كيانات قابلة للتحرير. ومع ذلك، فهي لا تزال تمثيلًا كاملًا لهندسة الرسم. إذا كان التحكم القوي في الوصول مطلوبًا، فطبّق المصادقة في طبقة الاستضافة أو استخدم ملف HTML واحدًا، الذي يدعم الحماية بكلمة مرور والانتهاء.
