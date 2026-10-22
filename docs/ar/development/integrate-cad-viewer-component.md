---
title: "دمج مكوّن CAD Viewer"
---

# دمج مكوّن CAD Viewer

**cad-viewer** هو مكوّن Vue 3 **عالي الأداء** لعرض ملفات CAD (DXF، DWG) وتحريرها **بالكامل في المتصفح دون الحاجة إلى أي خادم خلفي**. يوفّر واجهة مستخدم حديثة وإدارة حالة وتكاملًا سلسًا مع محركات عرض محسّنة، لتوفير سير عمل CAD سلس في المتصفح بأداء استثنائي.

## الميزات الرئيسية

- **تحرير وعرض CAD عالي الأداء** مع عرض سلس بمعدل 60+ إطارًا في الثانية
- **لا حاجة إلى خادم خلفي** - تُحلَّل الملفات وتُعالَج بالكامل في المتصفح
- **أمان معزّز للبيانات** - لا تغادر الملفات جهازك أبدًا، مما يضمن خصوصية كاملة
- **دعم الملفات المحلية** - حمّل ملفات DWG/DXF مباشرة من جهازك عبر حوار الملفات أو السحب والإفلات
- **دعم الملفات البعيدة** - حمّل ملفات CAD من عناوين URL تلقائيًا
- **دمج سهل** - لا حاجة إلى إعداد خادم أو بنية خلفية لدمج الطرف الثالث
- **واجهة قابلة للتخصيص** - تحكّم في ظهور أشرطة الأدوات وسطر الأوامر والإحداثيات وإحصاءات الأداء
- **موارد قابلة للتخصيص** - عيّن عناوين أساس مخصصة للخطوط والقوالب والملفات المثال
- واجهة حديثة محسّنة للتعامل مع ملفات CAD كبيرة
- إدارة حالة للطبقات والكيانات والإعدادات
- تكامل مع محركات عرض SVG وTHREE.js المحسّنة
- حوارات وأشرطة أدوات وواجهة سطر أوامر
- مكوّن Vue 3 لتضمين عوارض CAD عالية الأداء في تطبيقاتك

## متى ينبغي عليك اختيار cad-viewer؟

استخدم `cad-viewer` إذا كنت تريد **مكوّن Vue 3 جاهزًا للاستخدام** لعرض ملفات CAD وتحريرها بواجهة حديثة وحوارات وأشرطة أدوات وإدارة حالة. تكون هذه الحزمة مثالية إذا:

- كنت تريد تضمين عارض/محرر CAD عالي الأداء بسرعة في تطبيق Vue الخاص بك بأقل إعداد ممكن.
- كنت بحاجة إلى دعم تحميل الملفات المحلية (من جهاز المستخدم) والملفات البعيدة (من عناوين URL) معًا.
- كنت بحاجة إلى حل يتولى تحميل الملفات والعرض وإدارة الطبقات والكيانات وتفاعلات المستخدم بشكل جاهز.
- كنت تريد دمجًا سلسًا مع محركات عرض SVG وTHREE.js المحسّنة والتعريب والسمات.
- كنت **لا** تريد بناء واجهة المستخدم الخاصة بك من الصفر.

**يُنصح به لـ:** معظم تطبيقات الويب أو لوحات المعلومات أو المنصات التي تحتاج إلى عرض ملفات CAD بواجهة مستخدم مصقولة.

## بنية تعمل في المتصفح فقط

يعمل هذا المكوّن Vue 3 بالكامل في المتصفح **دون أي اعتماد على خادم خلفي**. تُحلَّل ملفات DWG/DXF وتُعالَج محليًا باستخدام WebAssembly وJavaScript، مما يوفّر:

- **عدم الحاجة إلى خادم** - انشر المكوّن في أي مكان باستخدام استضافة الملفات الثابتة فقط
- **خصوصية كاملة للبيانات** - لا تغادر ملفات CAD جهاز المستخدم أبدًا، سواء حُمّلت محليًا أو من عناوين URL
- **دعم الملفات المحلية** - يمكن للمستخدمين تحميل الملفات مباشرة من أجهزتهم باستخدام حوار الملفات المدمج
- **دعم الملفات البعيدة** - تحميل الملفات تلقائيًا من عناوين URL عند توفيرها
- **دمج فوري** - لا حاجة إلى إعداد خلفي معقد أو تهيئة API
- **القدرة على العمل دون اتصال** - يعمل بدون اتصال بالإنترنت بعد التحميل
- **ملائم للطرف الثالث** - يسهل تضمينه في أي تطبيق Vue 3 دون مخاوف من جانب الخادم

## طرق تحميل الملفات

يدعم مكوّن MlCadViewer طرقًا متعددة لتحميل ملفات CAD:

### 1. تحميل الملفات المحلية
يمكن للمستخدمين تحميل الملفات مباشرة من أجهزتهم:
- **حوار الملفات**: انقر على القائمة الرئيسية (☰) واختر "Open" لتصفح ملفات DWG/DXF المحلية وتحديدها
- **السحب والإفلات**: اسحب ملفات CAD وأفلتها مباشرة على العارض (إذا كان ذلك منفَّذًا في تطبيقك)
- **حقل الملف**: استخدم مكوّن قارئ الملفات المدمج لتحديد الملفات برمجيًا
- **خاصية المكوّن**: مرّر كائن `File` مباشرة إلى الخاصية `localFile` للتحميل التلقائي

#### مثال: استخدام الخاصية localFile مع حقل ملف
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. تحميل الملفات البعيدة
تحميل الملفات تلقائيًا من عناوين URL:
- **خاصية URL**: وفّر الخاصية `url` لتحميل ملف تلقائيًا عند تركيب المكوّن
- **التحميل الديناميكي**: غيّر الخاصية `url` لتحميل ملفات مختلفة دون إعادة تركيب المكوّن

### 3. صيغ الملفات المدعومة
- **ملفات DWG**: صيغة رسم AutoCAD الثنائية (تُقرأ كـ ArrayBuffer)
- **ملفات DXF**: صيغة تبادل رسومات AutoCAD النصية/الثنائية (تُقرأ كنص)

## التثبيت

```bash
npm install @mlightcad/cad-viewer
```

## الاستخدام

يرجى الرجوع إلى الحزمة الفرعية `cad-viewer-example` كمثال.

### الاستخدام الأساسي

أولًا، أضف الاعتماديات التالية إلى ملف package.json الخاص بك.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

ثم أنشئ مكوّن vue على النحو التالي.

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## مكوّن MlCadViewer

`MlCadViewer` هو مكوّن Vue 3 الرئيسي الذي يوفّر واجهة كاملة لعرض CAD وتحريره. يشمل أشرطة الأدوات وإدارة الطبقات وسطر الأوامر وشريط الحالة وحوارات متنوعة لتجربة CAD متكاملة.

### خصائص المكوّن (Props)

يقبل مكوّن `MlCadViewer` الخصائص التالية:

| الخاصية            | النوع                        | القيمة الافتراضية     | الوصف                                                                                                                                              |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | لغة واجهة المستخدم. تستخدم `'default'` إعدادات اللغة في المتصفح. تؤثر على واجهة العارض ومكوّنات Element Plus معًا.                                              |
| `url`               | `string`                    | `undefined` | عنوان URL بعيد لملف CAD (DWG/DXF). عند توفيره، يُجلب الملف ويُفتح تلقائيًا عند التركيب. يؤدي تحديث هذه الخاصية إلى إعادة تحميل الملف ديناميكيًا. |
| `localFile`         | `File`                      | `undefined` | ملف CAD محلي ككائن `File`. يُفتح تلقائيًا عند التركيب ويُعاد تحميله عند تغييره. **له أولوية على `url`** إذا تم توفير كليهما.        |
| `background`        | `number`                    | `undefined` | لون خلفية عرض CAD كقيمة RGB سداسية عشرية 24-بت (مثل `0x000000`). يُحدَّث ديناميكيًا عند تغييره.                                  |
| `baseUrl`           | `string`                    | `undefined` | عنوان URL الأساس المستخدم لتحميل الموارد الخارجية مثل الخطوط والقوالب والملفات المثال. مفيد عند استضافة الأصول على CDN.                               |
| `useMainThreadDraw` | `boolean`                   | `false`     | يتحكم في وضع العرض. تستخدم `false` Web Workers (يُنصح بها للرسومات الكبيرة). تجبر `true` العرض على الخيط الرئيسي.                          |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | السمة الأولية للعارض. يمكن تحديثها ديناميكيًا للتبديل بين الوضعين الداكن والفاتح.      

### أحداث المكوّن

يصدر `MlCadViewer` أحداث دورة الحياة حتى تتمكن المكوّنات الأب من الارتباط بإنشاء العارض وتدميره.

| الحدث     | الحمولة | الوصف                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | يُصدر بعد اكتمال تهيئة عارض CAD وأصبح جاهزًا للاستخدام.          |
| `destroy` | `void`  | يُصدر مباشرة قبل تدمير عارض CAD وتحرير الموارد الداخلية. |

### إعدادات واجهة المستخدم

يقرأ `MlCadViewer` ظهور واجهته من `AcApSettingManager` العام (الموفَّر من `@mlightcad/cad-simple-viewer`). قم بتهيئة هذه الأعلام في أي مكان قبل عرض العارض لتخصيص الواجهة.

| الإعداد                  | النوع      | القيمة الافتراضية | الوصف                                                                |
| ------------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`  | يتحكم في ظهور شريط الأدوات الرئيسي                                |
| `isShowMainMenu`         | `boolean` | `true`  | يتحكم في ظهور القائمة الرئيسية                                   |
| `isShowCommandLine`      | `boolean` | `true`  | يتحكم في ظهور واجهة سطر الأوامر                      |
| `isShowCoordinate`       | `boolean` | `true`  | يتحكم في ظهور عرض الإحداثيات                          |
| `isShowEntityInfo`       | `boolean` | `true`  | يتحكم في ظهور بطاقة معلومات الكيان                     |
| `isShowFileName`         | `boolean` | `true`  | يتحكم في عرض اسم الملف المفتوح حاليًا               |
| `isShowLanguageSelector` | `boolean` | `true`  | يتحكم في ظهور محدّد اللغة                           |
| `isShowStats`            | `boolean` | `false` | يتحكم في ظهور إحصاءات الأداء (FPS، زمن العرض، وغيرها)

#### مثال (موصى به)
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### ملاحظات

- الإعدادات عامة ويعكسها `MlCadViewer` فورًا.
- يمكنك تغييرها في وقت التشغيل باستخدام المرجع نفسه `AcApSettingManager.instance`.

### تهيئة عنوان URL الأساس

تتيح خاصية `baseUrl` تخصيص المكان الذي يحمّل منه عارض CAD الخطوط والقوالب والملفات المثال. وهذا مفيد بشكل خاص في:

- **الموارد المستضافة ذاتيًا**: استضف خطوطك وقوالبك على CDN أو خادمك
- **بيئات المؤسسات**: استخدم خوادم داخلية لموارد CAD
- **عمليات النشر دون اتصال**: قدّم الموارد من أنظمة ملفات محلية
- **العلامة التجارية المخصصة**: استخدم قوالبك وخطوطك الخاصة

#### السلوك الافتراضي
إذا لم يُوفَّر `baseUrl`، يستخدم العارض عنوان URL الافتراضي: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

#### بنية الموارد
عند استخدام `baseUrl` مخصص، تأكد من أن خادمك يحتوي على البنية التالية:
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### مثال: عنوان URL أساس مخصص
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

سيؤدي هذا الإعداد إلى:
- تحميل الخطوط من `https://my-company.com/cad-resources/fonts/`
- تحميل القوالب من `https://my-company.com/cad-resources/templates/`
- استخدام عنوان URL الأساس المخصص لأي عمليات "Quick New"

### ميزات المكوّن

يشمل مكوّن `MlCadViewer`:

- **القائمة الرئيسية** - عمليات الملفات (بما في ذلك فتح الملفات المحلية) وعناصر التحكم في العرض والإعدادات
- **أشرطة الأدوات** - أدوات الرسم والتحكم في التكبير وأدوات التحديد
- **مدير الطبقات** - إدارة ظهور الطبقات وخصائصها
- **سطر الأوامر** - إدخال أوامر بأسلوب AutoCAD
- **شريط الحالة** - الموضع الحالي ومستوى التكبير وحالة النظام
- **مدير الحوارات** - حوارات نمطية لعمليات متنوعة
- **قارئ الملفات** - تحميل الملفات المحلية عبر حوار الملفات ودعم السحب والإفلات
- **معلومات الكيان** - معلومات تفصيلية عن الكيانات المحددة
- **محدّد اللغة** - تبديل لغة الواجهة
- **دعم السمات** - تبديل الوضع الداكن/الفاتح

### معالجة الأحداث

يتولى المكوّن تلقائيًا معالجة أحداث متنوعة:

- **تحميل الملفات** - يدعم تحميل الملفات المحلية (عبر حوار الملفات) والسحب والإفلات والتحميل من عناوين URL
- **رسائل الخطأ** - يعرض رسائل خطأ سهلة الفهم للعمليات الفاشلة
- **تحميل الخطوط** - يعالج الخطوط المفقودة بإشعارات مناسبة
- **رسائل النظام** - يعرض تحديثات الحالة وتعليقات العمليات

### الاستخدام المتقدم

يرجى الرجوع إلى [دمج مكوّن CAD Viewer](./) للاطلاع على الاستخدام المتقدم التالي.

- تسجيل محوّل DWG لعرض الرسومات بصيغة DWG
- تعريف محمّل خطوط خاص بك لتحميل الخطوط من خادمك
- إنشاء رسم أو تعديل رسم

## الصادرات المتاحة

### المكوّن الرئيسي

- `MlCADViewer` - مكوّن عارض CAD الرئيسي

### الأوامر

- `AcApLayerStateCmd` - أمر حالة الطبقة
- `AcApLogCmd` - أمر السجل
- `AcApMissedDataCmd` - أمر البيانات المفقودة
- `AcApPointStyleCmd` - أمر نمط النقطة

### المكوّنات

- `MlPointStyleDlg` - حوار نمط النقطة
- `MlReplacementDlg` - حوار الاستبدال
- مكوّنات تخطيط وواجهة متنوعة

### الدوال التركيبية (Composables)

- `useCommands` - إدارة الأوامر
- `useCurrentPos` - تتبّع الموضع الحالي
- `useDark` - دعم الوضع الداكن
- `useDialogManager` - إدارة الحوارات
- `useFileTypes` - أدوات أنواع الملفات
- `useLayers` - إدارة الطبقات
- `useLayouts` - إدارة التخطيطات
- `useMissedData` - معالجة البيانات المفقودة
- `useSettings` - إدارة الإعدادات
- `useSystemVars` - متغيرات النظام

### اللغة

- `i18n` - نسخة التعريب
- ملفات لغة للإنجليزية والصينية

### الأنماط

- ملفات CSS وSCSS للتنسيق
- دعم الوضع الداكن
- تكامل Element Plus
