---
title: "الإضافات المدمجة"
---

# الإضافات المدمجة

يأتي MLightCAD مع مجموعة من الإضافات الرسمية. تركّز كل إضافة على جانب واحد — واجهة التطبيق، أو مساعد الذكاء الاصطناعي، أو خطوط التصدير/الاستيراد، أو مصادر البيانات السحابية — ويمكن دمجها حسب الحاجة.

أما آلية الإضافات نفسها (`AcApPlugin`، مدير الإضافات، التحميل الكسول، وكيفية كتابة إضافتك الخاصة) فراجع [نظام الإضافات](./plugin-system). أما التثبيت والتسجيل والتفاصيل الكاملة للواجهة العامة فتوجد في ملف README لكل حزمة — انظر الروابط أدناه.

## نظرة عامة على الإضافات

| الحزمة | الدور | الأوامر / القدرات |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | **واجهة شريط الأدوات ومدير الطبقات ولوحة المراجعة** لـ `cad-simple-viewer` (DOM عادي، بدون Vue/React) | `layer`، `markuppanel`، شريط الأدوات الافتراضي (عرض، قياس، تصدير، مراجعة، سمة، لغة) |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **وكيل CAD بلغة طبيعية** (لوحة محادثة AI + استدعاءات أدوات الرسم) | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **وحدة تحكم نصوص CAD يدوية** (تشغّل النصوص المُتحقق منها على الرسم، بدون LLM / مفتاح API) | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | تصدير الرسومات إلى **HTML غير متصل مكتفٍ ذاتيًا** | `chtml` (نافذة حوار في `cad-viewer`)، `-chtml` (سطر الأوامر) |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **تصدير واستيراد PDF متجهي** | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **تصدير SVG متجهي** والعارض المتجهي المشترك (يُستخدم أيضًا في تصدير PDF) | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **مصدر بيانات OneDrive** — افتح DWG/DXF من OneDrive / SharePoint | يسجّل `AcApDataSource` (`onedrive`)؛ تدفق من خطوتين: تسجيل الدخول ← فتح (آمن ضد حاجب النوافذ المنبثقة) |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **مصدر بيانات Google Drive** — افتح DWG/DXF من Google Drive | يسجّل `AcApDataSource` (`googledrive`)؛ تدفق من خطوتين: تسجيل الدخول ← فتح (آمن ضد حاجب النوافذ المنبثقة) |

جميع الإضافات المُشغَّلة بالأوامر **كسولة التحميل**: تُسجَّل مسبقًا وحدة تسجيل صغيرة (stub) ولا تُنزَّل الحزمة الثقيلة إلا عند تشغيل المستخدم أمر التشغيل. راجع [نظام الإضافات — تسجيل الإضافات](./plugin-system#تسجيل-الإضافات) للاطلاع على واجهة برمجة التسجيل.

---

## إضافات واجهة المستخدم

### `@mlightcad/cad-simple-ui-plugin` — واجهة العارض البسيط

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) لا يأتي عمدًا مع **أي واجهة تطبيق** — فقط اللوحة (canvas) ونواة CAD. إذا كنت تدمج العارض البسيط في تطبيق الويب الخاص بك وتريد واجهة جاهزة دون اعتماد غلاف [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-editor) الكامل القائم على Vue، فإن **`cad-simple-ui-plugin` هو طبقة الواجهة المقصودة**.

يوفر:

- **شريط أدوات قابل للتهيئة** (وضعه على أي حافة، أوامر CAD افتراضية، قوائم متداخلة، عناصر مخصصة)
- **لوحة دوك (dock panel)** بعلامة تبويب **مدير الطبقات** (إظهار/إخفاء الطبقة، منتقي ألوان ACI، تكبير إلى الطبقة بالنقر المزدوج) وعلامة تبويب **لوحة المراجعة** (قائمة العلامات التوضيحية، الحالة، التعليقات)
- **مزامنة السمة** مع متغير النظام `COLORTHEME` ورموز CSS ‏`--ml-ui-*` على عنصر المضيف
- **مزامنة اللغة** مع `AcApI18n` (الإنجليزية / الصينية / التشيكية / التركية)

جميع العناصر مستقلة عن إطار العمل (DOM عادي). تطبيق Vue الكامل `cad-viewer` لديه واجهة Element Plus خاصة به ولا يحتاج هذه الإضافة؛ استخدم `cad-simple-ui-plugin` عندما تبني على `cad-simple-viewer` مباشرة.

→ **البداية السريعة وتخصيص شريط الأدوات والخيارات:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — مساعد الرسم بالذكاء الاصطناعي

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) يضيف **وكيل CAD بلغة طبيعية** إلى التطبيقات المبنية على `cad-simple-viewer`. يصف المستخدمون ما يريدون بلغة عادية؛ ويستدعي الوكيل أدوات CAD لفحص الرسم وإنشاء الهندسة أو تعديلها.

يوفر:

- `AcApPlugin` **كسول التحميل** (أمر التشغيل: `agent`) حتى لا تكون حزمة الذكاء الاصطناعي في المسار الحرج
- **لوحة محادثة Vue** (`AgentChatPanel`) مبنية على Vercel AI SDK (`Experimental_Agent` + `@ai-sdk/vue`)
- **تهيئة LLM في المتصفح** — مفاتيح API لـ OpenAI أو Anthropic أو نقاط النهاية المتوافقة مع OpenAI تبقى في العميل (مشفّرة في `localStorage`)
- **أدوات CAD للمرحلة الأولى** — `get_drawing_context`؛ و`draw_line` و`draw_circle` و`draw_arc` و`draw_rectangle` و`draw_polyline` و`draw_text`؛ و`set_current_layer` و`create_layer` و`zoom_extents`
- **الإنجليزية / الصينية / التركية / التشيكية** لسلاسل واجهة المستخدم عبر طبقة i18n الخاصة بالإضافة

يسجّل تطبيق Vue الكامل `cad-viewer` الوكيل تلقائيًا عند تثبيت الحزمة (علامة تبويب في اللوحة). يربطه `cad-simple-viewer-demo` بعلامة تبويب دوك عبر `cad-simple-ui-plugin`. تستدعي التطبيقات المضيفة `registerLazyAgentPlugin` و`setAgentPaletteOpener` لتركيب اللوحة حيث تريد.

→ **التثبيت والتسجيل وقائمة الأدوات:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — وحدة تحكم نصوص CAD

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) يضيف **وحدة تحكم نصوص CAD يدوية** للتطبيقات المبنية على `cad-simple-viewer`. على عكس إضافة الوكيل، فهي **لا** تتحدث مع نموذج ولا تحتاج **مفتاح API**: تشغّل وحدة التحكم مضيف النصوص الذي تم التحقق منه من `@mlightcad/cad-agent-core`، وكل نص (script) هو جسم دالة بوسيط واحد هو `cad` يمنح وصولًا برمجيًا إلى أدوات الرسم نفسها التي يستخدمها الوكيل.

- `AcApPlugin` كسول التحميل (أمر التشغيل: `cadscript`)
- يعيد استخدام أدوات CAD من `@mlightcad/cad-agent-core`؛ تضيف هذه الحزمة اللوحة والأمر فقط
- تستدعي التطبيقات المضيفة `registerLazyCadScriptPlugin` وتركّب `new CadScriptPanel().element` (علامة تبويب دوك في `cad-simple-viewer-demo`، علامة تبويب لوحة الأدوات في `cad-viewer`)؛ استدعِ `destroy()` عند إزالة علامة التبويب

→ **الاستخدام:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## إضافات التصدير / الاستيراد (HTML / PDF / SVG)

تضيف هذه الإضافات أوامر تصدير (واستيراد PDF) إلى مدير الإضافات نفسه. وهي **كسولة التحميل** حتى يبقى وزن الصفحة الأولي صغيرًا. يسجّل العرض النموذجي `cad-simple-viewer-demo` إضافات التصدير الثلاث كلها بالإضافة إلى إضافات الواجهة/الوكيل/النصوص؛ ويسجّل تطبيق `cad-viewer` الكامل إضافات التصدير وإضافات الوكيل/النصوص (عند تثبيتها) في تهيئته.

### HTML (`@mlightcad/cad-html-plugin`)

**عارض غير متصل** في ملف واحد للمشاركة والأرشفة — يضمّن HTML المُصدَّر بيانات الرسم وعارضًا لوقت التشغيل، دون الحاجة إلى خادم.

| العنصر | القيمة |
|------|-------|
| الأمر | `chtml` (نافذة حوار في `cad-viewer`)، `-chtml` (سطر الأوامر عبر `cad-simple-viewer-cli`) |
| إعداد إضافي | `htmlViewerRuntimeUrl` على `AcApDocManager.createInstance()` — عنوان URL إلى `viewer-runtime.iife.js` (انسخه من `dist/` في الحزمة) |
| واجهة عامة | `registerLazyHtmlPlugin`، `createHtmlPlugin`، `AcApHtmlConvertor`، `packHtml`، أنواع اللقطات |

→ **مخرجات البناء والتكامل:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **واجهة سطر أوامر headless تستخدم خط المعالجة نفسه:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF (`@mlightcad/cad-pdf-plugin`)

**تصدير PDF متجهي واستيراد PDF إلى CAD.**

| العنصر | القيمة |
|------|-------|
| الأوامر | `cpdf` (تصدير)، `ipdf` (استيراد) |
| واجهة عامة | `registerLazyPdfPlugin`، `createPdfPlugin`، المحوّلات |

→ **مخرجات البناء والتكامل:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG (`@mlightcad/cad-svg-plugin`)

**تصدير SVG متجهي** والعارض المتجهي المشترك الذي يستخدمه تصدير PDF.

| العنصر | القيمة |
|------|-------|
| الأمر | `csvg` |
| واجهة عامة | `registerLazySvgPlugin`، `createSvgPlugin`، `AcApSvgConvertor`، أدوات عارض SVG |

→ **مخرجات البناء والتكامل:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## إضافات مصادر البيانات (OneDrive / Google Drive)

لا تسجّل هذه الإضافات أوامر — بل تسجّل [`AcApDataSource`](./data-source-plugin) حتى يتمكن المستخدمون من فتح رسومات DWG/DXF مباشرة من التخزين السحابي. ويستخدم كلاهما **تدفقًا من خطوتين: تسجيل الدخول ← فتح** مصمّمًا ليبقى آمنًا ضد حاجب النوافذ المنبثقة.

### `@mlightcad/cad-onedrive-plugin`

**مصدر بيانات OneDrive / SharePoint** مبني على Microsoft File Picker v8 + MSAL. يتطلب تسجيل تطبيق Azure (SPA، أذونات مفوَّضة `User.Read` + `Files.Read.All`).

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **إعداد تطبيق Azure والتكامل الكامل:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) و[إضافة مصدر البيانات](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

**مصدر بيانات Google Drive** بعقد `AcApDataSource` نفسه.

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **إعداد Google Cloud والتكامل الكامل:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## ما الإضافات التي يسجّلها كل تطبيق؟

| التطبيق | الإضافات المسجّلة |
|-----|--------------------|
| `cad-simple-viewer` | لا شيء — النواة فقط، والإضافات اختيارية |
| `cad-simple-viewer-demo` | إضافات التصدير (HTML/PDF/SVG)، `cad-simple-ui-plugin`، `cad-agent-plugin`، `cad-script-plugin` |
| `cad-viewer` (Vue) | إضافات التصدير (HTML/PDF/SVG)؛ وتسجَّل إضافتا الوكيل والنصوص تلقائيًا **عند تثبيتهما** (أقران اختياريون) |

---

## وثائق ذات صلة

- [نظام الإضافات](./plugin-system) — واجهة `AcApPlugin`، مدير الإضافات، التحميل الكسول، وكتابة إضافتك الخاصة
- [إضافة مصدر البيانات](./data-source-plugin) — آلية `AcApDataSource` التي تستخدمها إضافتا OneDrive / Google Drive
- [الأوامر](./command) — دورة حياة الأمر و`AcEdCommand`
