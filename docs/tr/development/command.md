---
title: "Komut"
---

# CAD-Viewer'da Özel Komut Oluşturma

Bu sayfa, **CAD-Viewer**'da özel bir komutun nasıl oluşturulacağını ve kullanıcı tarafından tetiklenebilmesi için nasıl kaydedileceğini açıklar.

## Genel Bakış

Komutlar, kullanıcıların CAD-Viewer ile etkileşim kurmasının başlıca yoludur. Her komut, çizgi çizme, daire oluşturma, yakınlaştırma veya nesne seçme gibi belirli bir işlemi temsil eder.

Sistem, komutları gruplar halinde yönetmek, adlarına göre aramak ve yaşam döngüsü olaylarını düzenleyici aracılığıyla işlemek için bir **komut yığını** (`AcEdCommandStack`) sağlar.

## Komut Yaşam Döngüsü

Her komut, `AcEdCommand` tarafından yönetilen iyi tanımlanmış bir yaşam döngüsünü izler:

1.  Komut `trigger()` aracılığıyla **tetiklenir**
1.  `commandWillStart` olayı yayılır
1.  `execute()` yöntemi geçerli bağlamla çağrılır
1.  `commandEnded` olayı yayılır (hata oluşsa bile her zaman)

Dahili olarak bu yaşam döngüsü şu şekilde uygulanır:

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

### Temel Garantiler

-   `commandWillStart` her zaman **`execute()` öncesinde** yayılır

-   `commandEnded` her zaman yürütmeden **sonra** yayılır; komut hata fırlatsa veya iptal edilse bile

-   Komutlar aşağıdakileri geçersiz kılarak yaşam döngüsü mantığına bağlanabilir:

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## Komut Oluşturma

Tüm komutlar soyut `AcEdCommand` sınıfını genişletmelidir:

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

### Notlar

-   `execute()`, aşağıdakileri içeren geçerli `AcApContext` alır:

    -   `context.view`
    -   `context.doc`

-   Zaten bir komutun içindeyseniz, genel düzenleyici örneğine erişmek yerine **her zaman şunu tercih edin**:

    ```
    context.view.editor
    ```

## Durum Makineleriyle Karmaşık Komutlar (Çok Dallı)

**Sürekli girdi + birden çok dal + gerçek zamanlı önizleme** içeren komutlar için (örneğin `PLINE`), tüm komut mantığını tek bir Jig'e koymaktan kaçının. Bu hızla bakımı zor hale gelir.

Önerilen yaklaşım:

-   **Komut mantığı** bir **durum makinesi** tarafından işlenir (dal kontrolü)
-   **Jig** yalnızca **geçerli durumun önizlemesini** işler

Bu ayrım, komutu okunaklı tutar ve durum makinesi kalıbını
diğer karmaşık komutlarda yeniden kullanmanıza olanak tanır.

### Neden Durum Makinesi Kullanılmalı

-   Karmaşık komutların birden çok anahtar sözcük dalına tepki vermesi gerekir
-   Her dalın farklı istem kuralları ve önizleme davranışı vardır
-   Durum makinesi bu sorumlulukları her duruma yerel tutar

### Önerilen Mimari

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

### Durum Makinesi Temel Sınıfı

Proje, istem tabanlı komutlar için yeniden kullanılabilir bir durum makinesi yardımcısı sağlar:

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

### Durum ve Jig Arasındaki Etkileşim

-   Her durum kendi istem seçeneklerini oluşturur
-   İstem, **yalnızca önizleme için** bir Jig ekler
-   Jig, anahtar sözcükleri veya dallanmayı **bilmez**

Başka bir deyişle:

-   **Durum**, neyin sorulacağına ve geçişin nasıl yapılacağına karar verir
-   **Jig**, yalnızca o durum için geçerli önizlemeyi çizer

### Örnek: Çok Dallı Çoklu Çizgi (Basitleştirilmiş)

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

### Pratik Notlar

-   **Veri modelini** (noktalar, kabartılar, önizleme durumu) komut denetleyicisinde tutun
-   Her durum **küçük ve odaklı** olmalıdır
-   Ortak iş akışı kalıpları için `AcEdPromptStateMachine` tercih edin
-   **Nihai varlık oluşturma** komut denetleyicisine aittir

Tam bir örnek için [çoklu çizgi komutu uygulamasına](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts) bakın.

## Komut Yaşam Döngüsü Olaylarını Dinleme

Komut yaşam döngüsü olayları, komutun kendisi tarafından değil **düzenleyici** tarafından sunulur.

### Kullanılabilir Düzenleyici Olayları

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### `AcEditor` Örneğini Alma

Uygulamada bulunduğunuz yere bağlı olarak:

#### Her yerden (genel erişim)

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### Bir komut yürütmesinin içinde

```
const editor = context.view.editor
```

### Örnek: Komut Olaylarını Dinleme

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### Tipik Kullanım Durumları

-   Komut geçmişini izleme
-   UI durumunu güncelleme (araç çubukları, paneller)
-   Etkileşimleri kilitleme veya kilidini açma
-   Analitik veya telemetri uygulama
-   ObjectARX `commandWillStart` / `commandEnded` davranışını taklit etme

## Komut Erişim Modu

`AcEdCommand` artık bir **minimum erişim modu gereksinimini** destekler; komutlar hangi belge erişim düzeyine ihtiyaç duyduklarını bildirebilir.

### Açma Modları

CAD-Viewer üç belge açma modunu destekler:

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

Daha yüksek değerli modlar, daha düşük değerli modlarla uyumludur:

-   `Write` ≥ `Review` ≥ `Read`

Geçerli belgenin açma moduna şu şekilde erişebilirsiniz:

```
context.doc.openMode
```

veya

```
AcApDocument.openMode
```

### Komut Modunu Ayarlama

Her komut **gereken minimum erişim modunu** bildirebilir:

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

#### Mode Özelliği

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### Davranış

-   Bir komut **yalnızca şu durumda yürütülebilir**:

    ```
    document.openMode >= command.mode
    ```

-   Örnekler:

    -   Bir `Write` komutu `Read` modunda **çalışamaz**
    -   Bir `Review` komutu `Write` modunda **çalışabilir**
    -   Bir `Read` komutu tüm modlarda çalışır

Bu şunları sağlar:

-   Güvenli salt okunur görüntüleyiciler
-   Yalnızca inceleme amaçlı iş akışları
-   Düzenleme komutları için sıkı yazma koruması

## Komut Kaydetme

Komutlar `AcApDocManager.instance.commandManager` aracılığıyla kaydedilir.

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

### Notlar

-   `globalName`, komut grubu içinde benzersiz olmalıdır

-   `localName` kullanıcıya yöneliktir ve yerelleştirilebilir

-   Komut grupları:

    -   `ACAD` – sistem komutları
    -   `USER` – özel komutlar

## Komut Takma Adı

CAD-Viewer, AutoCAD tarzı komut takma adlarını destekler (`acad.pgp` davranışına benzer).

### `addCommand` ile Takma Ad Kaydetme

Takma adları `addCommand` işlevinin 5. bağımsız değişkeninde sağlayabilirsiniz:

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

Takma ad kuralları:

-   Takma ad eşleştirme büyük/küçük harfe duyarsızdır (dahili olarak büyük harfe normalleştirilir)
-   Takma ad aynı komut grubu içinde benzersiz olmalıdır
-   Takma ad, aynı gruptaki mevcut genel/yerel komut adlarıyla çakışamaz

### `AcApDocManager` İçinde Takma Adları Yapılandırma

`AcApDocManagerOptions`, başlatma sırasında takma ad eşlemesini geçersiz kılabilmeniz için `commandAliases` sağlar:

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

Davranış:

-   Bir komutun kullanıcı tarafından yapılandırılmış takma adları varsa, o komut için yerleşik varsayılanların yerini alırlar
-   Bir komut yapılandırılmamışsa, yerleşik varsayılan takma adlar kullanılır

### Arama ve UI Davranışı

-   `lookupGlobalCmd()` ve `lookupLocalCmd()` her ikisi de takma ad aramasını destekler
-   `searchCommandsByPrefix()` takma ad öneki eşleştirmesini destekler
-   Komut satırı otomatik tamamlama takma adları listede gösterir, örneğin:
    `LINE（L, LN） - description`

## Komut Tetikleme

Kaydedildikten sonra bir komut programatik olarak yürütülebilir:

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## Eksiksiz İş Akışı

1.  `AcEdCommand` sınıfını genişleterek bir komut oluşturun
1.  (İsteğe bağlı) Komutun gereken erişim `mode` değerini ayarlayın
1.  Komutu `commandManager` ile kaydedin
1.   (İsteğe bağlı) Gerekirse `AcEditor` üzerinden yaşam döngüsü olaylarını dinleyin
1.  Komutu adıyla veya programatik olarak tetikleyin


## Özel Komutu Yerelleştirme

<https://github.com/mlightcad/cad-simple-viewer-example> adresinde yerelleştirme desteğiyle özel komutları gösteren tam bir örnek bulabilirsiniz.
