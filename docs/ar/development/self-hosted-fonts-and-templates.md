---
title: "الخطوط والقوالب المستضافة ذاتيًا"
---

# الخطوط والقوالب المستضافة ذاتيًا

يشرح هذا الدليل كيفية نشر الخطوط وقوالب DWG/DXF على خادمك الخاص.

## نظرة عامة

يتوقع **cad viewer** بنية دليل محددة لتحميل الخطوط والقوالب. باتباع هذه البنية، يمكنك استضافة خطوطك وقوالبك الخاصة بدلًا من استخدام [الخادم الافتراضي في Github](https://github.com/mlightcad/cad-data/).

للاطلاع على مثال Next.js عملي يقدّم الخطوط والقوالب من نسخة محلية من [cad-data](https://github.com/mlightcad/cad-data) (وحدة فرعية في git) ويضبط `baseUrl` على كل من العارض المباشر وCLI بدون واجهة، راجع [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo).

## بنية الدليل

ينبغي أن يتبع خادمك البنية نفسها الموجودة في [مستودع mlightcad/cad-data](https://github.com/mlightcad/cad-data):

```
your-base-url/
├── fonts/                    # Font files directory
│   ├── arial.ttf
│   ├── simkai.ttf
│   ├── custom-font.shx
│   └── ...
├── templates/                # DWG/DXF template files directory
│   ├── acadiso.dxf
│   ├── custom-template.dwg
│   └── ...
└── fonts.json               # Font metadata configuration file
```

## التهيئة

### ضبط عنوان URL الأساس

قم بتهيئة الخاصية `baseUrl` في تطبيقك لتشير إلى خادمك:

#### في مكوّن Vue
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### في TypeScript/JavaScript
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### في cad-simple-viewer-cli (CLI بدون واجهة)

> **متاح اعتبارًا من `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2.**

عند تشغيل CLI بدون واجهة مقابل خادم خطوط/قوالب مستضاف ذاتيًا، يجب تمرير عنوان URL الأساس الخاص بك. وإلا فسيواصل CLI استخدام عنوان URL الافتراضي `cad-data` على CDN ولن يحمّل الخطوط أو القوالب من خادمك.

**سطر الأوامر** (`--base-url`):

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**واجهة API البرمجية** (`runHeadless`):

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

تُحمَّل الخطوط من `<base-url>/fonts/` (مثل `https://your-server.com/cad-data/fonts/`). يجب أن يكون العنوان بصيغة `http` أو `https`.

### السلوك الافتراضي

إذا لم يُوفَّر `baseUrl`، يستخدم العارض عنوان URL الافتراضي: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

## إدارة الخطوط

### دليل الخطوط

ضع جميع ملفات الخطوط في الدليل `fonts/`. تشمل صيغ الخطوط المدعومة:
- **TTF** (TrueType Font) - ملفات `.ttf`
- **SHX** (AutoCAD Shape Font) - ملفات `.shx`
- **OTF** (OpenType Font) - ملفات `.otf`

### تهيئة fonts.json

ملف `fonts.json` هو مصفوفة JSON تحتوي على بيانات وصفية لكل خط متاح. يجب أن يقع هذا الملف في جذر عنوان URL الأساس الخاص بك.

#### بنية الملف

```json
[
  {
    "name": ["Arial"],
    "file": "arial.ttf",
    "type": "mesh",
    "description": "Standard Arial font for text rendering"
  },
  {
    "name": ["SimKai"],
    "file": "simkai.ttf", 
    "type": "mesh",
    "description": "Chinese Kai font for CJK text support"
  },
  {
    "name": ["Custom SHX Font"],
    "file": "custom.shx",
    "type": "shx",
    "description": "Custom AutoCAD shape font",
    "encoding": "gbk"
  }
]
```

#### أوصاف الحقول

| الحقل | النوع | مطلوب | الوصف |
|-------|------|----------|-------------|
| `name` | مصفوفة نصية | نعم | اسم الخط المستخدم في ملفات DWG/DXF. يمكن أن يكون للخط الواحد أسماء متعددة. |
| `file` | نص | نعم | اسم ملف الخط الموجود في الدليل `fonts/`. يجب أن يطابق الاسم تمامًا. |
| `type` | نص | نعم | نوع/صيغة الخط. القيم الشائعة: `"mesh"` و`"shx"`. تعني `"mesh"` خطوط `"ttf"` و`"otf"` و`"woff"`. |
| `description` | نص | لا | وصف اختياري لغرض الخط أو خصائصه. |
| `encoding` | نص | لا | وصف اختياري لترميز الخط، ويمكن أن يكون إحدى القيم المتاحة في [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding). هذه الخاصية مطلوبة فقط إذا كان الخط [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) أو [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D). |

### إضافة خطوط جديدة

لإضافة خط جديد إلى خادمك:

1. **ارفع ملف الخط** إلى الدليل `fonts/`
2. **حدّث `fonts.json`** بإضافة إدخال جديد:

```json
[
  // ... existing fonts ...
  {
    "name": "My Custom Font",
    "file": "my-custom-font.ttf",
    "type": "mesh",
    "description": "Custom font for specific project needs"
  }
]
```

3. **اختبر تحميل الخط** في تطبيقك:

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## إدارة القوالب

### دليل القوالب

ضع ملفات قوالب DWG وDXF في الدليل `templates/`. تُستخدم هذه القوالب عند إنشاء مستندات جديدة.

### القالب الافتراضي

تتوقع المكتبة قالبًا افتراضيًا باسم `acadiso.dxf` في الدليل `templates/`. يستخدم أمر "Quick New" (`AcApQNewCmd`) هذا القالب.

### إضافة قوالب مخصصة

1. **ارفع ملفات القوالب** إلى الدليل `templates/`
2. **أشر إلى القوالب** في تطبيقك:

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## متطلبات الخادم

### تهيئة CORS

تأكد من أن خادمك يسمح بطلبات المصادر المتقاطعة كي يتمكن CAD Viewer من تحميل الموارد:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### أنواع MIME

قم بتهيئة خادمك لتقديم ملفات الخطوط بأنواع MIME الصحيحة:

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### مثال على تهيئة Nginx

```nginx
location /cad-data/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    location ~* \.(ttf|otf|shx)$ {
        add_header Content-Type font/ttf;
    }
    
    location ~* \.(dwg|dxf)$ {
        add_header Content-Type application/octet-stream;
    }
}
```

## معالجة الأخطاء

توفّر المكتبة معالجات أحداث لمشكلات تحميل الخطوط:

```typescript
import { eventBus } from '@mlightcad/cad-simple-viewer'

// Handle fonts that cannot be found
eventBus.on('fonts-not-found', (params) => {
  console.warn('Fonts not found:', params.fonts)
  // Implement fallback logic or user notification
})

// Handle fonts that fail to load
eventBus.on('fonts-not-loaded', (params) => {
  console.error('Fonts failed to load:', params.fonts)
  // Implement error handling or user notification
})
```

## أفضل الممارسات

1. **التحكم في الإصدارات**: احتفظ بملف `fonts.json` تحت التحكم في الإصدارات لتتبّع إضافات الخطوط وتغييراتها
2. **تحسين الخطوط**: استخدم صيغ الخطوط المضغوطة (`woff`) عند الإمكان لتقليل أوقات التحميل
3. **الاختبار**: اختبر تحميل الخطوط مع ملفات CAD مختلفة لضمان التوافق
4. **التوثيق**: وثّق خطوطك وقوالبك المخصصة لأعضاء الفريق

## استكشاف الأخطاء وإصلاحها

### المشكلات الشائعة

1. **الخطوط لا تُحمَّل**: تحقق من إمكانية الوصول إلى `fonts.json` على `{baseUrl}/fonts.json`
2. **أخطاء CORS**: تأكد من أن خادمك يسمح بطلبات المصادر المتقاطعة
3. **أخطاء 404**: تحقق من مطابقة مسارات الملفات في `fonts.json` لأسماء الملفات الفعلية
4. **مشكلات نوع MIME**: قم بتهيئة خادمك لتقديم الخطوط بأنواع MIME الصحيحة

### التصحيح

فعّل أدوات مطوّري المتصفح لمراقبة طلبات الشبكة والتحقق من:
- نجاح تحميل `fonts.json`
- تنزيلات ملفات الخطوط
- ترويسات CORS
- رموز حالة HTTP

## مثال على التنفيذ

إليك مثالًا متكاملًا لإعداد خادم خطوط وقوالب مخصص:

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

يتيح لك هذا الإعداد تخصيص الخطوط والقوالب المتاحة لتطبيقك بالكامل مع الحفاظ على التوافق مع البنية المتوقعة.
