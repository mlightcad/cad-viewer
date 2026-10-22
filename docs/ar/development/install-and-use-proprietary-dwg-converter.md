---
title: "تثبيت واستخدام محوّل DWG الخاص"
---

# تثبيت واستخدام محوّل DWG الخاص

يشرح هذا الدليل كيفية **تثبيت** حزمة محلّل DWG الخاصة **`@mlightcad/dwg-converter`** و**تسجيلها** مع نموذج بيانات cad-viewer.

للاطلاع على الترخيص والوصول التجريبي والأسعار والتوافق مع GPL، راجع [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) في المستودع الرئيسي.

> **المتطلبات المسبقة:** يجب أن يكون لحساب GitHub الخاص بك بالفعل **صلاحية قراءة** الحزمة الخاصة (تُمنح بعد الموافقة على الفترة التجريبية أو الشراء).

## نظرة عامة

- تُنشر `@mlightcad/dwg-converter` على **GitHub Packages**.
- تُنشر حزم `@mlightcad/*` الأخرى (مثل `@mlightcad/data-model` و`@mlightcad/cad-viewer`) على **سجل npm** العام.
- يدعم npm وpnpm تعيين السجلات على **مستوى النطاق (scope)** فقط — ولا يوجد **تعيين رسمي على مستوى الحزمة** ضمن النطاق نفسه.

وهذا يعني أنك **لا تستطيع** استخدام:

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

لجلب `@mlightcad/dwg-converter` فقط. فذلك سيوجّه **جميع** حزم `@mlightcad/*` إلى GitHub Packages ويعطّل تثبيت الحزم العامة.

**ملاحظة حول الإصدار:** استبدل `1.2.3` (وأي تجزئة tarball) في الأمثلة أدناه بـ**الإصدار الدقيق الذي سُلّم إليك**.

## إنشاء `GITHUB_TOKEN` بصلاحية `read:packages`

تستخدم GitHub Packages حاليًا **رمز وصول شخصي (classic)** للمصادقة؛ ولا تدعم الرموز الدقيقة (fine-grained) في سجل npm.

1. سجّل الدخول إلى GitHub بالحساب الذي يملك صلاحية الوصول إلى الحزمة.
2. افتح **Settings → Developer settings → Personal access tokens → Tokens (classic)**  
   (رابط مباشر: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. انقر على **Generate new token → Generate new token (classic)**.
4. سمّ الرمز (مثل `dwg-converter-install`) واضبط تاريخ انتهاء يتوافق مع سياسة الأمان لديك.
5. ضمن **Select scopes**، فعّل **`read:packages`**. لا تحتاج إلى `write:packages` أو `delete:packages` للاستخدام في التثبيت فقط.
6. انقر على **Generate token**، ثم انسخه فورًا (يُعرض مرة واحدة فقط).
7. أظهره كمتغير `GITHUB_TOKEN`:

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. عندما يتصل **العميل** بـ GitHub Packages مباشرة (الخيار 2 أدناه)، أضف إدخال مصادقة على **مستوى المضيف** في `.npmrc`:

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   يربط هذا بيانات الاعتماد بمضيف `npm.pkg.github.com` فقط. وهو **لا** يعيد تعيين نطاق `@mlightcad`. **لا** تضف `@mlightcad:registry=https://npm.pkg.github.com`.

   يقرأ `pnpm install` هذا الملف. أما `npm view` فلا يقرأه عند تشغيله من حزمة ضمن مساحة عمل: منذ npm 8.5 يتجاهل CLI ملف `.npmrc` الخاص بتلك الحزمة (`ignoring workspace config`) ويُرسل الطلب دون رمز (`401 Unauthorized - authentication token not provided`)، حتى لو كان `GITHUB_TOKEN` مضبوطًا. مرّر الرمز في أمر `npm view` نفسه — راجع الخيار 2.

   في المستودع الأحادي (monorepo)، ضع هذا الملف في **جذر مساحة العمل**. إن ملف `.npmrc` الموجود داخل حزمة عضو فقط هو الملف الذي يتخطاه npm.

   إذا كنت تستخدم الخيار 1 (وكيل سجل خاص)، فلا يحتاج العملاء عادةً إلى هذا السطر — ضع الرمز على الوكيل بدلًا من ذلك.

**ملاحظات أمنية**

- تعامل مع الرمز ككلمة مرور. **لا** ترفعه إلى git ولا تلصقه في المشكلات العامة.
- يُفضَّل استخدام متغيرات البيئة (أو مخزن أسرار CI لديك) بدلًا من تثبيت الرمز كتابةً في `.npmrc`.
- في GitHub Actions، اربط سرًا في المستودع (مثل `GH_PACKAGES_TOKEN`) بـ `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` لمهمة التثبيت.

## خيارات التثبيت

اختر **واحدًا** من الأساليب أدناه.

### الخيار 1: سجل خاص موحّد يعمل كوسيط بين npm وGitHub Packages

إذا كنت تشغّل (أو تستخدم بالفعل) سجل npm خاصًا — Verdaccio أو JFrog Artifactory أو Sonatype Nexus أو سجل npm من مزوّد سحابي — فوجّه العملاء إلى ذلك السجل ودعه يحدد المصدر الأعلى لكل حزمة:

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

ملف `.npmrc` للعميل:

```ini
registry=https://npm.example.com/
```

قم بتهيئة السجل الخاص بحيث:

| الحزمة | المصدر الأعلى |
|---------|----------|
| `@mlightcad/foo` (الحزم العامة) | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

ثم ثبّت بشكل طبيعي:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

هذا هو الإعداد الأنظف على المدى الطويل إذا كنت تدير سجلًا خاصًا بالفعل. أما للمشاريع الصغيرة التي تحتاج إلى حزمة أو حزمتين من GitHub Packages فقط، فالخيار 2 عادةً أخف.

### الخيار 2: تثبيت `@mlightcad/dwg-converter` على عنوان URL لملف tarball من GitHub Packages

ثبّت الحزمة على **عنوان URL الخاص بـ tarball** في `package.json` حتى ينزّل مدير الحزم ذلك العنوان مباشرة بدلًا من الحل عبر سجل نطاق `@mlightcad`.

1. صادِق على GitHub Packages (عنوان URL الخاص بـ tarball **لا يتجاوز** المصادقة):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. احصل على عنوان URL الخاص بـ tarball للإصدار الذي تحتاجه.

   لا تعتمد على ملف `.npmrc` الخاص بالمشروع لهذا الأمر. يتجاهل `npm view` ملف `.npmrc` الخاص بحزمة في مساحة العمل، لذا لا يُطبَّق `${GITHUB_TOKEN}` الموجود في ذلك الملف أبدًا. مرّر الرمز في سطر الأوامر:

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   لا يزال إدخال `.npmrc` من الخطوة 1 مطلوبًا: يستخدمه `pnpm install` عند تنزيل tarball.

   مثال على المخرجات:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. ضع ذلك العنوان في `package.json` (استخدم **إصدارك** وعنوان URL الخاص بـ tarball الخاص بك):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. ثبّت:

   ```bash
   pnpm install
   ```

**تحذيرات**

- تتطلب الترقيات جلب عنوان URL جديد لـ tarball وتحديث `package.json` / ملف القفل (lockfile).
- لا تزال عمليات التثبيت في CI والمحلية تحتاج إلى رمز GitHub صالح بصلاحية قراءة.
- أبقِ إدخال مصادقة GitHub Packages في `.npmrc`.

يعمل الخيار 2 جيدًا للتقييم والفرق الصغيرة. فُضّل الخيار 1 (أو نطاقًا خاصًا منفصلًا مثل `@mlightcad-private/*` معيَّنًا إلى GitHub Packages) إذا كنت تتوقع ترقيات متكررة أو حزمًا خاصة كثيرة.

## تسجيل المحوّل

المحلّل الخاص هو **محوّل قابل للتسجيل** يُركَّب في المسار نفسه الذي تستخدمه الحزمة مفتوحة المصدر.

- تتوافق المخرجات مع **`@mlightcad/data-model`** المرخّص بموجب MIT: `AcDbDatabase` وكيانات `AcDb*` وجداول الطبقات والكتل والبنى ذات الصلة.
- سجّله عبر **`AcDbDatabaseConverterManager`**، وهي الآلية نفسها التي يستخدمها `AcDbLibreDwgConverter`.
- بعد التحليل، يعمل مسار العرض والتحديد والتفاعل والطبقات الحالي المرخّص بموجب MIT (`cad-simple-viewer` و`cad-viewer` والإضافات وغيرها) دون تغيير.

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

لا توفّر الحزمة واجهة API مستقلة باسم "parse DWG". فمثل [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) مفتوحة المصدر، فإنها تنفّذ **`AcDbDatabaseConverter`**. بعد التحويل، تعامل مع الرسم الناتج عبر `@mlightcad/data-model`.

**لا** تسجّل أيضًا `libredwg-converter` القائم على GPL إذا كنت تعتمد على المحلّل الخاص لأغراض التوافق.

للاطلاع على نموذج عملي متكامل (المصادقة وأصول Worker والتسجيل وتصفح قاعدة البيانات)، راجع [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example).

## صفحات ذات صلة

- [تهيئة عناوين Worker](./configure-worker-urls) — إعداد عناوين Worker لمحلّلات DWG/DXF
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — الترخيص التجاري والفترة التجريبية وملاحظات GPL
- [دليل التطوير](./) — فهرس مواضيع المطوّرين
