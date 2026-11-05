---
title: "لوحة فتح الملفات (واجهة صفحة الهبوط)"
---

# لوحة فتح الملفات (واجهة صفحة الهبوط)

تشرح هذه الصفحة كيفية بناء **منتقي ملفات لصفحة الهبوط** مع إبقاء **`@mlightcad/cad-simple-viewer`** خارج المسار الحرج عبر **المسار الفرعي `/file-open-panel`**.

**فضّل [`acuiCreateFileOpenSession`](#quick-start-recommended)** لمضيفي DocManager — يثبت واجهة الهبوط، ينشئ العارض كسولًا، يربط مصادر السحابة، ويفتح الرسم. استخدم [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open) عندما تتحكم أنت في الفتح (مثل props لـ Vue `MlCadViewer`). استخدم [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel) منخفض المستوى فقط لتوصيل قائمة مخصّص.

لتنفيذ أصول السحابة (OneDrive وGoogle Drive ومصادر مخصّصة)، راجع [إضافة مصدر البيانات](./data-source-plugin).

---

## لماذا مدخل منفصل؟

استيراد واجهة فتح الملفات من **الحزمة الرئيسية** `@mlightcad/cad-simple-viewer` كان يجذب `AcApDocManager` وthree.js ومكدس الأوامر/العرض إلى أول رسم لشاشة الرئيسية / الرفع.

من **1.8.0**، استخدم المسار الفرعي الخالي من DocManager:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

يستدعي session دالة `createDocManager` فقط عندما يفتح المستخدم شيئًا — عادةً عبر استيراد ديناميكي للحزمة الرئيسية.

تطبيقات مرجعية:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + `AcApDocManager.createInstance` مؤجَّل
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## البدء السريع (موصى به) {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// مصادر سحابة اختيارية (الاستيراد الديناميكي يبقي SDKs خارج أول رسم):
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

عند كل فتح، يقوم session بـ:

1. استدعاء `createDocManager` **مرة واحدة** (يُخزَّن بعدها)
2. `attachSourcesTo(docManager.dataSourceManager)` لإعادة استخدام عملاء MSAL / GIS
3. تشغيل `openDocument` / `openUrl` / `newDocument`

خطافات اختيارية: `onBeforeOpen` و`onPrepareOpen` (بعد جاهزية DocManager) و`onAfterOpen`.

استدعِ `session.dispose()` عند إزالة شاشة الهبوط. للفتح البرمجي: `session.open({ kind: 'file' | 'url' | 'new', … })`.

---

## خيارات Session

| الخيار | الوصف |
|--------|-------------|
| `host` | العنصر الذي يستقبل جذر اللوحة |
| `createDocManager` | يُرجع كائنًا شبيهًا بـ DocManager (`dataSourceManager` + واجهات الفتح) |
| `getOpenOptions?` | يُمرَّر إلى openDocument / openUrl / newDocument |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | خطافات دورة الحياة |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | نفس خيارات chrome كواجهة landing |

واجهة برمجة مفيدة: `landing` و`manager` و`registerSource()` و`open()` و`ensureDocManager()` و`dispose()`.

---

## `AcUiFileOpenLanding` (فتح مخصّص) {#acuifileopenlanding-custom-open}

عندما يفتح المضيف الرسومات بنفسه (مخزن Vue + `MlCadViewer`، واجهة تقدم مخصّصة، …):

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // كودك
  }
})

// بعد وجود DocManager / العارض:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// أو: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`.

---

## ماذا تفعل واجهة اللوحة

session وlanding يثبتان `AcUiFileOpenPanel`:

| السطح | السلوك |
|---------|----------|
| جسم البطاقة | منطقة إفلات محلية، صف URL، أو chrome «اختر ملفًا» / حساب سحابي |
| سهم التذييل | **محلي** و**URL**، بالإضافة إلى مصادر السحابة المسجّلة |
| اختياري | زر **رسم جديد** |

اللوحة **لا** تصل أبدًا إلى `AcApDocManager` مباشرة.

---

## ملاحظات التحميل الكسول

1. كود landing / session يستورد فقط `@mlightcad/cad-simple-viewer/file-open-panel`.
2. `createDocManager` (أو معالج `onOpen`) يستورد الحزمة الرئيسية ديناميكيًا.
3. سجّل إضافات التصدير / OneDrive `/register` **بعد** createInstance؛ يمكن لإضافات السحابة إعادة استخدام مصدر مربوط مسبقًا من سجل landing.

لـ Vue i18n دون تركيب المحرر على صفحة الهبوط، فضّل `@mlightcad/cad-editor/locale`.

---

## `AcUiFileOpenPanel` منخفض المستوى {#low-level-acuifileopenpanel}

يمكن للمضيفين المتقدمين الذين يحتاجون توصيل `onDataSourceAction` / `onResult` مخصّصًا استخدام `AcUiFileOpenPanel` مباشرة. للتكاملات الجديدة فضّل session أو واجهة landing.

---

## قائمة التحقق

- [ ] صفحة الهبوط تستورد `/file-open-panel` وليس الحزمة الرئيسية
- [ ] مضيفو DocManager يفضّلون `acuiCreateFileOpenSession`
- [ ] مضيفو الفتح المخصّص يستخدمون `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] حزم إضافات السحابة تُستورد ديناميكيًا
- [ ] تبقى تسجيل الدخول والاختيار إيماءات مستخدم منفصلة

---

## وثائق ذات صلة

- [إضافة مصدر البيانات](./data-source-plugin) — `AcApDataSource` ومساعدات القائمة وكتابة إضافات السحابة
- [دمج Simple Viewer](./integrate-simple-cad-viewer) — `AcApDocManager` بعد صفحة الهبوط
- [دمج مكوّن Vue](./integrate-cad-viewer-component) — `MlCadViewer`
- [الإضافات المدمجة](./built-in-plugins) — حزم OneDrive / Google Drive
- [الترجمة](./localization) — سلاسل `main.dataSource.*`
- [الترقية](./upgrade-guide) — المسارات الفرعية `/file-open-panel` و`/locale` في 1.8.0
