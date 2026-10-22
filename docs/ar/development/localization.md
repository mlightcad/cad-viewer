---
title: "الترجمة المحلية"
---

# الترجمة المحلية

تشرح هذه الصفحة **كيفية ترجمة السلاسل النصية محليًا** عند إنشاء حزمة npm جديدة تعتمد على **`@mlightcad/cad-simple-viewer`**، وكيفية **إضافة سلاسل نصية مترجمة لأوامر مخصصة**.

الهدف هو:

-   إبقاء `@mlightcad/cad-simple-viewer` **مستقلًا عن إطار العمل** (دون اعتماد على Vue / React / i18n في وقت التشغيل)
-   السماح **لتطبيقات المضيف** (Vue + `vue-i18n` أو غيرها) **بدمج الرسائل نفسها وإعادة استخدامها**
-   ضمان ترجمة **الأوامر والمطالبات والأوصاف** محليًا بشكل متسق

## فلسفة التصميم

يوفّر `@mlightcad/cad-simple-viewer` **سجل i18n أدنى** عبر `AcApI18n`:

-   لا اعتماد على إطار عمل واجهة المستخدم
-   صيغة رسائل متوافقة مع `vue-i18n`
-   يدعم **الدمج العميق** من حزم متعددة
-   يوفّر مساعدًا بسيطًا `t(key)` لمنطق النواة/المحرر

فكّر في `AcApI18n` على أنه **سجل رسائل مشترك**، وليس إطار ترجمة كاملًا.

## بنية رسائل اللغة

الرسائل هي كائنات متداخلة عادية:

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

المفاتيح **قابلة للعنونة بمسار نقطي**:

```
AcApI18n.t('command.ACAD.line')
```

### اصطلاح تسمية المفاتيح الموصى به

| الفئة    | البادئة    | المثال                       |
| ----------- | --------- | ----------------------------- |
| الأوامر    | `command` | `command.ACAD.line`           |
| مطالبات Jig | `jig`     | `jig.ellipse.center`          |
| مربعات الحوار     | `dialog`  | `dialog.confirm.ok`           |
| الكيانات    | `entity`  | `entity.property.color`       |
| واجهة التطبيق      | `main`    | `main.toolPalette.draw.title` |

## إنشاء سلاسل نصية مترجمة في حزمة جديدة

### تعريف الرسائل لكل لغة

داخل حزمتك، أنشئ ملفات اللغة:

```
my-plugin/
 └─ i18n/
    ├─ en.ts
    └─ zh.ts
```

**`en.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: 'Create something'
      }
    }
  },
  jig: {
    mycmd: {
      start: 'Specify start point:',
      end: 'Specify end point:'
    }
  }
}
```

**`zh.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: '创建对象'
      }
    }
  },
  jig: {
    mycmd: {
      start: '指定起点：',
      end: '指定终点：'
    }
  }
}
```

اسم المفتاح `ACAD` أعلاه هو اسم مجموعة الأوامر. 

### تسجيل الرسائل مع `AcApI18n`

سجّل الرسائل **مرة واحدة**، عادةً أثناء تهيئة التطبيق أو الإضافة:

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

يعمل هذا سواء:

-   استخدمت Vue + `vue-i18n`
-   استخدمت إطار عمل آخر
-   اعتمدت على `AcApI18n.t()` فقط

## الاستخدام مع Vue + vue-i18n (تطبيق المضيف)

في تطبيق Vue، يعمل `AcApI18n` كـ **مصدر الحقيقة الوحيد** للرسائل.

```
import { createI18n } from 'vue-i18n'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: AcApI18n.messages,
  globalInjection: true
})
```

### مزامنة اللغة (موصى بها)

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

وهذا يضمن:

-   استخدام منطق المحرر الأساسي لـ `AcApI18n.t()`
-   استخدام مكوّنات واجهة المستخدم لـ `vue-i18n`
-   عرض كلاهما اللغة نفسها دائمًا


## الملخص

-   `AcApI18n` سجل i18n خفيف ومستقل عن إطار العمل

-   تُدمج رسائل الإضافات والتطبيقات عبر `mergeLocaleMessage`

-   تعيد تطبيقات Vue استخدام الرسائل نفسها عبر `vue-i18n`

يحافظ هذا النهج على **مكتبات نظيفة** و**تطبيقات مرنة** و**ترجمة محلية متسقة**.
