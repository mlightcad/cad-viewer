---
title: "ترقية cad-simple-viewer و cad-viewer"
---

# ترقية cad-simple-viewer و cad-viewer

يشرح هذا الدليل كيفية ترقية `@mlightcad/cad-simple-viewer` و`@mlightcad/cad-viewer` بأمان — ولماذا لا يمكن رفعهما بمعزل عن غيرهما، وأي الحزم ذات الصلة يجب أن تتحرك معًا، وطريقتان موثوقتان لتحديد مجموعة الإصدارات المتوافقة الصحيحة لأي إصدار معين.

## نظرة عامة

`@mlightcad/cad-simple-viewer` و`@mlightcad/cad-viewer` **ليسا حزمتين مستقلتين**. إنهما جزء من منظومة مترابطة بإحكام تشترك في قاعدة شيفرة ودورة إصدار مشتركتين. يجمع كل إصدار مجموعة منسّقة من التحديثات عبر الإضافات والعارضات وحزم نموذج البيانات ومكتبات عرض النصوص وأطر عمل واجهة المستخدم الخارجية.

**ترقية `cad-simple-viewer` أو `cad-viewer` وحدهما بمعزل عن غيرهما قد تؤدي إلى أعطال خفية في وقت التشغيل**، بما في ذلك:

- واجهات الإضافات التي تتوقع توقيعات API تغيّرت في إصدارات النواة الأحدث (أو الأقدم)
- عدم تطابق شكل نموذج البيانات بين ما تتوقعه النواة وما ينتجه محلّل/عارض أقدم
- فقدان توافق WebAssembly أو Worker بعد رفع `libredwg-converter`
- خلل في عرض النصوص عندما تنحرف إصدارات `mtext-renderer` / `mtext-parser`
- تغييرات كاسرة أو سلوكية في Three.js غير مطابقة عبر طبقة العارض

قم دائمًا بترقية **مجموعة الحزم ذات الصلة كاملةً معًا**. الطريقتان الموثوقتان لتحديد الإصدارات الصحيحة موصوفتان أدناه.

---

## المنظومة في لمحة

قبل الترقية، من المفيد معرفة الحزم التي تنتمي إلى الإصدار المنسّق وأيها خارجي. تُزامَن الفئات التالية مع إصدار cad-viewer نفسه:

### حزم العارض الأساسية

| الحزمة | الدور |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | النواة المستقلة عن إطار العمل (إدارة المستندات، مكدس الأوامر، لصق العرض) |
| `@mlightcad/cad-viewer` | غلاف واجهة المستخدم Vue 3 + Element Plus المبني فوق cad-simple-viewer |

### الإضافات — **يجب أن تطابق إصدار cad-simple-viewer بدقة**

| الحزمة | الغرض |
| --- | --- |
| `@mlightcad/cad-html-plugin` | تصدير HTML مكتفٍ ذاتيًا بنقرة واحدة |
| `@mlightcad/cad-pdf-plugin` | تصدير PDF واستيراد طبقات PDF السفلية |
| `@mlightcad/cad-svg-plugin` | تصدير SVG |
| `@mlightcad/cad-simple-ui-plugin` | شريط أدوات DOM عادي، مدير طبقات، لوحة مثبتة |
| `@mlightcad/cad-agent-plugin` | تفاعل مدعوم بوكيل ذكاء اصطناعي |
| `@mlightcad/cad-onedrive-plugin` | تكامل OneDrive |
| `@mlightcad/cad-google-drive-plugin` | تكامل Google Drive |

> **قاعدة عامة:** يجب تثبيت كل إضافة في القائمة أعلاه على **رقم الإصدار نفسه بالضبط** الذي تنتقل إليه في `cad-simple-viewer` (على سبيل المثال، `1.7.5`).

### طبقة العارض الداخلية (الإصدار نفسه كالنواة، تُنشر منفصلة)

| الحزمة | الغرض |
| --- | --- |
| `@mlightcad/three-renderer` | محرك عرض 2D/3D مبني على THREE.js |
| `@mlightcad/pdf-renderer` | الخلفية التي تستخدمها cad-pdf-plugin لتوليد محتوى PDF |

تُستهلك هذه داخليًا بواسطة الإضافات وcad-simple-viewer. عادةً **لا** تثبّتها مباشرةً، لكن إصدارها يجب أن يكون متوافقًا مع الإضافات التي تثبّتها.

### طبقة البيانات والنصوص منخفضة المستوى — **يجب أن تطابق إصدارات الإصدار**

| الحزمة | ملاحظات |
| --- | --- |
| `@mlightcad/data-model` | أنواع الكيانات وقاعدة البيانات الأساسية؛ كل إصدار يرفعها مع العارض |
| `@mlightcad/libredwg-converter` | غلاف WebAssembly لتحليل DWG — دعم DWG يعتمد عليه |
| `@mlightcad/mtext-parser` | محلّل محتوى MTEXT |
| `@mlightcad/mtext-renderer` | عارض MTEXT → هندسة THREE |
| `@mlightcad/mtext-input-box` | أداة تحرير MTEXT داخل اللوحة |

### اعتماديات واجهة Vue الخاصة بـ cad-viewer فقط

تظهر هذه في تجاوزات `pnpm-workspace.yaml` لكنها مطلوبة فقط عند استخدام `@mlightcad/cad-viewer` (واجهة Vue 3 الكاملة). لا تثبّتها تكاملات cad-simple-viewer مباشرةً.

| الحزمة | الغرض |
| --- | --- |
| `@mlightcad/ribbon` | مكوّن واجهة الشريط |
| `@mlightcad/ui-components` | عناصر Vue UI مشتركة |

### اعتماديات أقران خارجية (أبقِ الإصدارات كما هي مثبتة في الإصدار)

| الحزمة |
| --- |
| `three` |
| `vue` (لـ cad-viewer فقط) |
| `element-plus` (لـ cad-viewer فقط) |
| `vue-i18n` (لـ cad-viewer فقط) |
| `lodash-es` |

---

## الطريقة 1 — قراءة `pnpm-workspace.yaml` عند الإصدار الهدف

مصدر الحقيقة المرجعي لكل إصدار هو قسم `overrides` في `pnpm-workspace.yaml` للمستودع الأحادي عند وسم Git المقابل. وهو يسرد **الإصدارات الدقيقة** لكل حزمة `@mlightcad/*` وكل اعتمادية أقران خارجية اختُبر معها الإصدار.

### الخطوات

1. ابحث عن الوسم للإصدار الذي تريد الترقية إليه. تتبع الوسوم النمط `vX.Y.Z` (على سبيل المثال، `v1.7.5`). جميع الوسوم في المستودع الرئيسي:

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. افتح `pnpm-workspace.yaml` عند ذلك الوسم. قالب عنوان URL هو:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   استبدل `vX.Y.Z` بوسم الإصدار الحقيقي، على سبيل المثال:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. انسخ كتلة `overrides:` إلى `pnpm-workspace.yaml` في مشروعك. ستبدو مشابهة لهذا (مثال مختصر):

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. حدّث كل `@mlightcad/cad-*-plugin` تستخدمه إلى **الإصدار نفسه** كـ `cad-simple-viewer` / `cad-viewer`:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. شغّل `pnpm install` (أو `npm install`) وتحقق من تحميل التطبيق دون تحذيرات اعتماديات الأقران.

> إذا كان مشروعك مساحة عمل `npm` أو `yarn` عادية، فانسخ التجاوزات نفسها إلى كتلة `pnpm.overrides` / `resolutions` على التوالي — القيم هي المهمة، لا صيغة الملف.

---

## الطريقة 2 — متابعة التزامات ترقية `cad-simple-viewer-demo`

مستودع [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) هو المضيف الأدنى الرسمي لـ `cad-simple-viewer`. وفي كل مرة تُنشر النواة، يتلقى المشروع النموذجي التزامًا بعنوان `feat: upgrade to cad-simple-viewer vX.Y.Z` يحدّث **جميع الاعتماديات ذات الصلة معًا**. هذا الالتزام مرجع عملي ملموس يبيّن بدقة الإصدارات التي استخدمها القائمون على الصيانة لذلك الإصدار.

### الخطوات

1. افتح سجل التزامات ملف package.json:

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. ابحث عن الالتزام الذي تقول رسالته `feat: upgrade to cad-simple-viewer vX.Y.Z` لإصدارك الهدف.

3. انقر على الالتزام لعرض الفرق. سيُظهر الفرق رفعًا منسّقًا عبر:
   - جميع الإضافات (إلى الإصدار نفسه كـ `cad-simple-viewer`)
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - وأي حزم خارجية تغيّرت

4. انقل الإصدارات من الفرق إلى `package.json` الخاص بك.

### مثال ملموس — الترقية من v1.7.3 إلى v1.7.4

أُخذ الفرق الحقيقي التالي من [الالتزام `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff) في المستودع النموذجي. لاحظ كيف تحركت **كل حزمة `@mlightcad/*` الواحدة تلو الأخرى**:

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> هذا بالضبط نوع التحديث المنسّق الذي يجب أن تجريه في مشروعك. لاحظ أن `mtext-parser` بقي على `^1.5.3` (لم تكن هناك حاجة لتغييره)، بينما انتقل `mtext-renderer` من `0.13.1` إلى `0.13.2`. تُتخذ هذه القرارات لكل إصدار، وينبغي أن تتبعها بدلًا من التخمين.

---

## بعد الترقية — فحوصات سلامة سريعة

1. **التثبيت** — شغّل تثبيتًا نظيفًا لضمان عدم تداخل `node_modules` قديم:

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **فتح رسم** — تحقق من تحميل ملفات DXF وDWG معًا، ومن عمل التحريك/التكبير، ومن عدم ظهور أخطاء في وحدة التحكم.

3. **التصدير** — إذا كنت تستخدم إضافات التصدير، فاختبر تصدير HTML وPDF وSVG على رسم نموذجي.

4. **فحص تحذيرات اعتماديات الأقران** — سيحذّر `pnpm` إذا كانت أي `peerDependencies` غير ملبّاة. تعامل معها كمسائل يجب إصلاحها؛ فسببها عادةً انحراف إصدار إضافة عن النواة.

5. **بناء تطبيقك** — `vite build` كامل (أو ما يعادله) هو أسرع طريقة لاكتشاف عدم تطابق الأنواع بين أنواع العارض وشيفرة التكامل الخاصة بك.

---

## الأسئلة الشائعة

**س: هل يمكنني خلط `cad-simple-viewer@1.7.5` مع `cad-html-plugin@1.7.3`؟**

ج: عمومًا لا. تُنشر الإضافات مع النواة وغالبًا تعتمد على واجهات برمجية داخلية تغيّرت بين الإصدارات الثانوية. حتى إذا تجمّع TypeScript، فقد تواجه أعطالًا في وقت التشغيل (مثل إنتاج تصدير فارغ بصمت، أو فشل تسجيل الإضافة برسالة خطأ مضللة).

**س: ماذا لو استخدمت `cad-simple-viewer` فقط بدون إضافات؟**

ج: لا تزال بحاجة إلى `data-model` و(إذا كنت تحمّل ملفات DWG) `libredwg-converter` بإصدارات متوافقة. ولا يزال `pnpm-workspace.yaml` عند وسمك الهدف ساريًا.

**س: هل تحميني الترقية الدلالية (semver)؟**

ج: تعمل نطاقات Semver (`^`، `~`) بشكل جيد لرفع مستوى التصحيحات *داخل* سلسلة إصدار واحدة (على سبيل المثال، سيلتقط `^1.7.0` الإصدار `1.7.5` تلقائيًا)، لكن **إصدارات الإضافات/data-model/libredwg-converter المنسّقة** لا يمكن اكتشافها من semver وحده — بل يضبطها القائمون على الإصدار. لا تزال بحاجة إلى إحدى الطريقتين أعلاه لمعرفة الإصدارات التي تتوافق مع بعضها لأي رفع ثانوي معين.

**س: أستخدم npm/yarn بدلًا من pnpm. هل ينطبق هذا أيضًا؟**

ج: نعم. تنسيق الإصدارات هو نفسه بغض النظر عن مدير الحزم. استخدم `overrides` (pnpm) أو `resolutions` (yarn) أو `overrides` (npm) بالقيم من `pnpm-workspace.yaml`، أو ببساطة ثبّت الإصدارات من فرق `cad-simple-viewer-demo` في `package.json` الخاص بك.
