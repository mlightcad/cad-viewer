---
title: "تصحيح الأخطاء مع تغييرات متعددة للمستودعات"
---

# تصحيح الأخطاء مع تغييرات متعددة للمستودعات

يعتمد مستودع `cad-viewer` على حزم من مستودعات MLight أخرى، على سبيل المثال:

- المستودع **`cad-viewer`**
  - الحزمة: `@mlightcad/cad-simple-viewer`
- المستودع **`realdwg-web`**
  - الحزم: `@mlightcad/data-model`، `@mlightcad/libredwg-converter`
- المستودع **`mtext-renderer`**
  - الحزم: `@mlightcad/mtext-renderer`، `@mlightcad/mtext-input-box`، `@mlightcad/mtext-parser`

مثال على سلسلة الاعتماديات:

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

أثناء التطوير، قد توجد أخطاء في `realdwg-web` أو `mtext-renderer` ويجب إصلاحها واختبارها فورًا داخل `cad-viewer`.

## مشكلة `pnpm link`

يؤدي استخدام `pnpm link` عبر عدة مستودعات أحادية (monorepos) إلى عدة مشكلات:

- إعداد وتفكيك معقّدان
- سهولة نسيان خطوات إلغاء الربط
- تصبح حالة `node_modules` صعبة الفهم
- تكسر CI / قابلية إعادة الإنتاج
- صعوبة على المطورين الجدد في المتابعة

لتبسيط تصحيح الأخطاء محليًا، نعتمد نهج **اعتمادية دليل محلي** مع تجاوزات pnpm.

## الحل: استخدام اعتماديات الأدلة المحلية مع تجاوزات pnpm

بدلًا من نشر الحزم أو ربطها، نغيّر مؤقتًا `overrides` في `pnpm-workspace.yaml` للإشارة مباشرةً إلى مسار نظام الملفات المحلي للحزم في مستودعات أخرى.

توجد إدارة الإصدارات المركزية في `pnpm-workspace.yaml`:

- نطاقات semver المنشورة (مثل `^1.8.3`) هي مصدر الحقيقة للإصدارات
- ينشر `pnpm sync:versions` تلك القيم في كل `packages/*/package.json`
- تشغّل CI وسكربت الإصدار `pnpm sync:versions:check` لضمان بقاء كل شيء متوافقًا

للتصحيح قصير المدى، استبدل تجاوز semver بمسار `file:`. هذا النهج:

✅ يعمل طبيعيًا مع `pnpm`  
✅ لا يتطلب ربطًا عامًا  
✅ صريح وسهل التراجع عنه  
✅ مناسب للتصحيح قصير المدى  
✅ يحافظ على قابلية التنبؤ في حل الاعتماديات  
✅ ينطبق على جميع الحزم في المستودع الأحادي

## تخطيط الدلائل (موصى به)

ضع المستودعات جنبًا إلى جنب:

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ هذا التخطيط **ليس إلزاميًا**، لكن المسارات النسبية ستكون أسهل في الإدارة.

## دليل خطوة بخطوة

### 1. إضافة تجاوزات `file:` محلية في `pnpm-workspace.yaml`

في `cad-viewer/pnpm-workspace.yaml`، استبدل مؤقتًا مدخلات semver التي تريد تصحيحها بمسارات محلية.

تبدو التجاوزات العادية (المنشورة) هكذا:

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

للتصحيح المحلي، غيّر فقط الحزم التي تحتاج إلى اختبارها:

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> اضبط المسارات النسبية إذا كانت بنية دليلك مختلفة.  
> **لا** تضع التجاوزات في `package.json` الجذري؛ فهي تنتمي إلى `pnpm-workspace.yaml`.

### 2. تثبيت الاعتماديات

من **جذر `cad-viewer`**:

```
pnpm install
```

سيقوم pnpm بما يلي:

- حل الحزم المتجاوَزة من الدلائل المحلية
- إنشاء روابط رمزية داخل `node_modules`
- تتبّعها كاعتماديات قائمة على الملفات

### 3. بناء الاعتماديات (إذا لزم الأمر)

إذا كانت الحزمة المنبع تحتاج إلى خطوة بناء (TypeScript، التجميع، …):

```
cd ../realdwg-web
pnpm install
pnpm build
```

للتطوير النشط، يمكنك أيضًا تشغيل:

```
pnpm dev
```

أو وضع المراقبة إذا كان مدعومًا. كرر الخطوات نفسها في `mtext-renderer` عند تصحيح حزم من ذلك المستودع.

### 4. التصحيح عادةً

الآن يمكنك:

- تعديل الشيفرة داخل المستودع المنبع (مثل `realdwg-web/packages/data-model`)
- إعادة البناء (أو ترك وضع المراقبة يعيد البناء)
- اختبار التغييرات فورًا في `cad-viewer`

لا ربط، لا نشر، لا حاجة لإعادة التثبيت.

## العودة إلى الحزم المنشورة

بعد اكتمال التصحيح:

1. استعد تجاوزات semver في `cad-viewer/pnpm-workspace.yaml` (أزل جميع مسارات `file:`).
2. زامن إصدارات الاعتماديات في حزم مساحة العمل:

```
pnpm sync:versions
```

3. أعد تثبيت الاعتماديات:

```
pnpm install
```

4. التزم بأي تغييرات في `package.json` أنتجها `pnpm sync:versions` مع `pnpm-workspace.yaml` المستعاد.

وهذا يضمن:

- اتساق CI
- رسم اعتماديات نظيف
- عدم الالتزام بمسارات محلية بالخطأ

## مزامنة الإصدارات قبل الإصدار أو PR

قبل فتح PR أو تشغيل إصدار، تأكد من توافق إصدارات الاعتماديات:

```
pnpm sync:versions
```

يقرأ هذا `overrides` من `pnpm-workspace.yaml` ويحدّث المدخلات المطابقة في كل `packages/*/package.json`.

للتحقق دون كتابة ملفات:

```
pnpm sync:versions:check
```

يشغّل سكربت الإصدار (`pnpm release`) و CI الفحص تلقائيًا. إذا كانت الإصدارات غير متزامنة، فأصلحها عبر `pnpm sync:versions`، ثم التزم، ثم أعد المحاولة.

سير العمل المعتاد عند رفع اعتمادية خارجية:

1. تحديث semver في `overrides` في `pnpm-workspace.yaml`
2. تشغيل `pnpm sync:versions`
3. تشغيل `pnpm install`
4. الاختبار، الالتزام، وفتح PR

## ⚠️ ملاحظات مهمة

### لا تلتزم بالمسارات المحلية

تجاوزات `file:` المحلية **للمطورين فقط**.

قبل الالتزام:

- تأكد من أن `pnpm-workspace.yaml` **لا** يحتوي على مسارات `file:`
- شغّل `pnpm sync:versions` حتى يطابق كل `package.json` تجاوزات semver المنشورة
- استخدم الإصدارات المنشورة في PRs والإصدارات

### متى تستخدم هذا النهج

✅ إصلاح الأخطاء عبر المستودعات  
✅ تصحيح مشكلات التكامل  
✅ التكرار السريع دون نشر  
❌ إدارة الاعتماديات طويلة المدى  
❌ CI / عمليات بناء الإنتاج

## المقارنة: `pnpm link` مقابل المسار المحلي مع تجاوزات pnpm

| الجانب           | pnpm link | مسار محلي مع تجاوزات pnpm |
| ---------------- | --------- | ------------------------------- |
| تعقيد الإعداد | عالٍ      | منخفض                             |
| الصراحة     | ضمني  | صريح                        |
| سهولة التراجع   | ❌         | ✅                               |
| آمن مع CI          | ❌         | ❌ (للتطوير فقط)                    |
| ملائم للفريق    | ❌         | ✅                               |

## الملخص

لتصحيح المشكلات التي تمتد عبر **`cad-viewer`** والمستودعات المنبع مثل **`realdwg-web`** أو **`mtext-renderer`**، استخدم مؤقتًا **تجاوزات `file:` في `pnpm-workspace.yaml`**.

إنه:

- بسيط
- شفاف
- سهل التعليم
- سهل التراجع
- ينطبق على جميع الحزم في المستودع الأحادي

عند الانتهاء من التصحيح — أو قبل أي إصدار — استعد تجاوزات semver، وشغّل **`pnpm sync:versions`**، والتزم بملفات `package.json` المتزامنة.
