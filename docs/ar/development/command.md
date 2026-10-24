---
title: "الأمر"
---

# إنشاء أمر مخصص في MLightCAD

تشرح هذه الصفحة كيفية إنشاء أمر مخصص في **MLightCAD** وتسجيله حتى يتمكن المستخدم من تشغيله.

## نظرة عامة

الأوامر هي الوسيلة الأساسية التي يتفاعل بها المستخدمون مع MLightCAD. يمثّل كل أمر عملية محددة، مثل رسم خط أو إنشاء دائرة أو التكبير أو تحديد الكائنات.

يوفّر النظام **مكدس أوامر** (`AcEdCommandStack`) لإدارة الأوامر في مجموعات والبحث عنها بالاسم ومعالجة أحداث دورة حياتها عبر المحرر.

## دورة حياة الأمر

يتبع كل أمر دورة حياة محددة يديرها `AcEdCommand`:

1.  **يُشغَّل** الأمر عبر `trigger()`
1.  يُطلق الحدث `commandWillStart`
1.  تُستدعى الطريقة `execute()` بالسياق الحالي
1.  يُطلق الحدث `commandEnded` (دائمًا، حتى لو حدث خطأ)

داخليًا، تُنفَّذ دورة الحياة هذه على النحو التالي:

```
async trigger(context: AcApContext) {
  try {
    this.onCommandWillStart(context)
    context.view.editor.events.commandWillStart.dispatch({ command: this })
    await this.execute(context)
  } finally {
    context.view.editor.events.commandEnded.dispatch({ command: this })
    this.onCommandEnded(context)
  }
}
```

### ضمانات أساسية

-   يُطلق `commandWillStart` دائمًا **قبل** `execute()`

-   يُطلق `commandEnded` دائمًا **بعد** التنفيذ، حتى لو رمى الأمر استثناءً أو أُلغي

-   يمكن للأوامر الارتباط بمنطق دورة الحياة عبر إعادة تعريف:

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## إنشاء أمر

ينبغي أن ترث جميع الأوامر من الفئة المجردة `AcEdCommand`:

```
import {
  AcEdCommand,
  AcApContext,
  AcApDocManager,
  AcEdPromptPointOptions,
  AcEdPromptDistanceOptions
} from '@mlightcad/cad-simple-viewer'

import { AcDbCircle } from '@mlightcad/data-model'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    // Prompt for center point
    const centerPrompt = new AcEdPromptPointOptions(
      'Specify center point of circle:'
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Prompt for radius
    const radiusPrompt = new AcEdPromptDistanceOptions(
      'Specify radius of circle:'
    )
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Create circle entity and add it to model space
    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

### ملاحظات

-   تتلقى `execute()` الكائن `AcApContext` الحالي، والذي يحتوي على:

    -   `context.view`
    -   `context.doc`

-   إذا كنت بالفعل داخل أمر، **ففضّل دائمًا**:

    ```
    context.view.editor
    ```

    بدلًا من الوصول إلى نسخة المحرر العامة.

## الأوامر المعقدة (متعددة الفروع) باستخدام آلات الحالة

بالنسبة للأوامر ذات **الإدخال المستمر + الفروع المتعددة + المعاينة في الوقت الفعلي** (مثل `PLINE`)،
تجنّب وضع كل منطق الأمر في Jig واحد. فذلك يصبح صعب الصيانة بسرعة.

النهج الموصى به:

-   يتولى **منطق الأمر** **آلة حالة** (التحكم في الفروع)
-   يتولى **Jig** فقط **معاينة الحالة الحالية**

يحافظ هذا الفصل على قابلية قراءة الأمر ويتيح لك إعادة استخدام نمط آلة الحالة
في أوامر معقدة أخرى.

### لماذا استخدام آلة حالة

-   تحتاج الأوامر المعقدة إلى التفاعل مع فروع كلمات مفتاحية متعددة
-   لكل فرع قواعد مطالبة وسلوك معاينة مختلفان
-   تحافظ آلة الحالة على هذه الاهتمامات محلية لكل حالة

### البنية الموصى بها

```
Command Controller
│
├── State Machine
│    ├── LineState
│    ├── ArcState
│    ├── CloseState
│    ├── UndoState
│    └── ...
│
└── Jig (preview only)
```

### الفئة الأساسية لآلة الحالة

يوفّر المشروع مساعد آلة حالة قابلًا لإعادة الاستخدام للأوامر المدفوعة بالمطالبات:

```
export interface AcEdPromptState<TPromptOptions, TResult> {
  buildPrompt(): TPromptOptions
  handleResult(result: TResult): Promise<'continue' | 'finish'> | 'continue' | 'finish'
}

export class AcEdPromptStateMachine<TPromptOptions, TResult> {
  setState(state: AcEdPromptState<TPromptOptions, TResult>): void
  run(getResult: (prompt: TPromptOptions) => Promise<TResult>): Promise<void>
}
```

### التفاعل بين الحالة وJig

-   تبني كل حالة خيارات مطالبتها الخاصة
-   تربط المطالبة Jig **للمعاينة فقط**
-   **لا** يعرف Jig شيئًا عن الكلمات المفتاحية أو التفرّع

بعبارة أخرى:

-   **الحالة** تقرر ما يُطلب وكيفية الانتقال
-   **Jig** يرسم فقط المعاينة الحالية لتلك الحالة

### مثال: خط متعدد متفرّع (مبسّط)

```
class LineState implements AcEdPromptState<AcEdPromptPointOptions, AcEdPromptPointResult> {
  buildPrompt() {
    const prompt = new AcEdPromptPointOptions('Specify next point or')
    prompt.keywords.add('Arc(A)', 'Arc', 'Arc')
    prompt.keywords.add('Undo(U)', 'Undo', 'Undo')
    prompt.keywords.add('Close(C)', 'Close', 'Close')
    prompt.jig = new AcApPolylineJig(view, points, bulges)
    return prompt
  }

  async handleResult(result: AcEdPromptPointResult) {
    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Arc') machine.setState(new ArcState(machine))
      if (result.stringResult === 'Undo') undo()
      if (result.stringResult === 'Close') return 'finish'
      return 'continue'
    }

    if (result.status === AcEdPromptStatus.OK) {
      appendPoint(result.value!)
      return 'continue'
    }

    return 'finish'
  }
}
```

### ملاحظات عملية

-   احتفظ بـ**نموذج البيانات** (النقاط والانتفاخات وحالة المعاينة) في وحدة تحكم الأمر
-   ينبغي أن تكون كل حالة **صغيرة ومركّزة**
-   فُضّل `AcEdPromptStateMachine` لأنماط سير العمل المشتركة
-   وحدة تحكم الأمر تملك **إنشاء الكيان النهائي**

للاطلاع على مثال كامل، راجع [تنفيذ أمر الخط المتعدد](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts).

## الاستماع إلى أحداث دورة حياة الأمر

تُكشَف أحداث دورة حياة الأمر عبر **المحرر**، لا عبر الأمر نفسه.

### أحداث المحرر المتاحة

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### الحصول على نسخة `AcEditor`

حسب موقعك في التطبيق:

#### من أي مكان (وصول عام)

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### من داخل تنفيذ أمر

```
const editor = context.view.editor
```

### مثال: الاستماع إلى أحداث الأوامر

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### حالات الاستخدام النموذجية

-   تتبّع سجل الأوامر
-   تحديث حالة واجهة المستخدم (أشرطة الأدوات واللوحات)
-   قفل التفاعلات أو إلغاء قفلها
-   تنفيذ التحليلات أو القياس عن بُعد
-   محاكاة سلوك `commandWillStart` / `commandEnded` في ObjectARX

## وضع وصول الأمر

يدعم `AcEdCommand` الآن **متطلب الحد الأدنى من وضع الوصول**، مما يتيح للأوامر الإعلان عن مستوى الوصول إلى المستند الذي تحتاجه.

### أوضاع الفتح

يدعم MLightCAD ثلاثة أوضاع لفتح المستندات:

```
export enum AcEdOpenMode {
  /** Read-only mode */
  Read = 0,
  /** Review mode (compatible with Read) */
  Review = 4,
  /** Write mode (compatible with Review and Read) */
  Write = 8
}
```

الأوضاع ذات القيم الأعلى متوافقة مع الأوضاع ذات القيم الأدنى:

-   `Write` ≥ `Review` ≥ `Read`

يمكنك الوصول إلى وضع فتح المستند الحالي عبر:

```
context.doc.openMode
```

أو

```
AcApDocument.openMode
```

### ضبط وضع الأمر

يمكن لكل أمر الإعلان عن **الحد الأدنى من وضع الوصول المطلوب**:

```
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

export class AcApCircleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    // write operations
  }
}
```

#### خاصية الوضع

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### السلوك

-   **لا يمكن للأمر أن يُنفَّذ** إلا إذا:

    ```
    document.openMode >= command.mode
    ```

-   أمثلة:

    -   **لا يمكن** لأمر `Write` العمل في وضع `Read`
    -   **يمكن** لأمر `Review` العمل في وضع `Write`
    -   يعمل أمر `Read` في جميع الأوضاع

يتيح ذلك:

-   عوارض آمنة للقراءة فقط
-   سير عمل للمراجعة فقط
-   حماية صارمة ضد الكتابة لأوامر التحرير

## تسجيل أمر

تُسجَّل الأوامر عبر `AcApDocManager.instance.commandManager`.

```
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcApCircleCmd } from './AcApCircleCmd'

const register = AcApDocManager.instance.commandManager

const circleCommand = new AcApCircleCmd()
circleCommand.globalName = 'CIRCLE'
circleCommand.localName = 'CIRCLE'

register.addCommand(
  'USER',
  circleCommand.globalName,
  circleCommand.localName,
  circleCommand
)
```

### ملاحظات

-   يجب أن تكون `globalName` فريدة داخل مجموعة الأوامر

-   `localName` موجّهة للمستخدم ويمكن تعريبها

-   مجموعات الأوامر:

    -   `ACAD` – أوامر النظام
    -   `USER` – الأوامر المخصصة

## اسم مستعار للأمر

يدعم MLightCAD أسماء مستعارة للأوامر بأسلوب AutoCAD (مشابهة لسلوك `acad.pgp`).

### تسجيل اسم مستعار باستخدام `addCommand`

يمكنك توفير أسماء مستعارة في الوسيطة الخامسة لـ `addCommand`:

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

قواعد الأسماء المستعارة:

-   مطابقة الأسماء المستعارة غير حساسة لحالة الأحرف (تُوحَّد داخليًا إلى أحرف كبيرة)
-   يجب أن يكون الاسم المستعار فريدًا داخل مجموعة الأوامر نفسها
-   لا يمكن أن يتعارض الاسم المستعار مع أسماء أوامر عامة/محلية موجودة في المجموعة نفسها

### تهيئة الأسماء المستعارة في `AcApDocManager`

يوفّر `AcApDocManagerOptions` الخاصية `commandAliases` بحيث يمكنك تجاوز تعيين الأسماء المستعارة عند التهيئة:

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

السلوك:

-   إذا كان للأمر أسماء مستعارة مهيأة من المستخدم، فإنها تحل محل الأسماء الافتراضية المدمجة لذلك الأمر
-   إذا لم يُهيَّأ الأمر، تُستخدم الأسماء المستعارة الافتراضية المدمجة

### البحث وسلوك واجهة المستخدم

-   تدعم `lookupGlobalCmd()` و`lookupLocalCmd()` البحث بالأسماء المستعارة
-   تدعم `searchCommandsByPrefix()` مطابقة بادئة الأسماء المستعارة
-   يعرض الإكمال التلقائي لسطر الأوامر الأسماء المستعارة في القائمة، على سبيل المثال:
    `LINE（L, LN） - description`

## تشغيل أمر

بمجرد تسجيله، يمكن تنفيذ الأمر برمجيًا:

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## سير العمل الكامل

1.  أنشئ أمرًا بالوراثة من `AcEdCommand`
1.  (اختياري) عيّن `mode` الوصول المطلوب للأمر
1.  سجّله مع `commandManager`
1.   (اختياري) استمع إلى أحداث دورة الحياة عبر `AcEditor` إذا لزم الأمر
1.  شغّل الأمر بالاسم أو برمجيًا


## تعريب أمر مخصص

في <https://github.com/mlightcad/cad-simple-viewer-example> يمكنك العثور على مثال كامل يوضّح الأوامر المخصصة مع دعم التعريب.
