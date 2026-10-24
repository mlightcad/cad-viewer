---
title: "Jig Sistemi"
---

# Jig Sistemi

AutoCAD, kullanıcı girdisi alırken gerçek zamanlı görsel geri bildirim sağlamak için AcEdJig çerçevesine dayanır. Güçlü olmakla birlikte, bu sistem istemleri, önizleme işlemesini ve girdi örneklemesini birden çok geçersiz kılınan yönteme ayırır — bu da genellikle mantığı farklı işlevlere ve yaşam döngüsü aşamalarına dağıtır. MLightCAD bu kavramı web için, istem girdisiyle sorunsuz biçimde bütünleşen birleşik ve TypeScript tabanlı bir jig mekanizması sunarak yeniden tasarlar. Geliştiriciler sürükleme döngülerini veya örnekleyici durum kodlarını yönetmek yerine, bir jig'i doğrudan istem seçeneklerine ekler; böylece dinamik önizleme mantığı, kullanıcı girdisi ve nihai varlık oluşturma tek ve okunaklı bir iş akışında bir arada kalır.

## Genel Bakış

MLightCAD'daki **Jig sistemi**, AutoCAD'in **AcEdJig** (ObjectARX) sistemine benzer bir iş akışı sunarak etkileşimli önizlemeler ve dinamik varlık oluşturma sağlar. Bir *jig*, imleç hareketine veya artımlı kullanıcı girdisine göre sürekli güncellenen geçici bir önizleme varlığını yönetir.

Kullanım durumları şunları içerir:

* Etkileşimli geometri oluşturma (nokta, daire, çoklu çizgi vb.)
* Canlı mesafe veya açı ölçümü
* Mevcut varlıkların gerçek zamanlı değiştirilmesi

Ancak MLightCAD, AutoCAD jig'lerinde tipik olarak bulunan yapısal karmaşıklığı azaltan **daha basit, daha bütüncül ve TypeScript dostu bir tasarım** sunar.


## Temel Mimari Fark

### Jig, İstem Seçeneklerine Aktarılır

AutoCAD'te istemler ve jig'ler ayrı mekanizmalardır. Jig yürütmesi `sampler()`, `worldDraw()` yöntemlerinin geçersiz kılınmasını ve `drag()` çağrılmasını gerektirir.

MLightCAD'da istemler doğrudan **bir jig örneği taşıyabilir**:

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

Bu tasarım:

* Kullanıcı girdisini canlı önizlemeye otomatik olarak bağlar
* Manuel sürükleme döngüsü yönetimini ortadan kaldırır

➡️ Sonuç: **daha az şablon kod, daha fazla tutarlılık**.

---

### Eksiksiz Dinamik Girdi Mantığı Bir Arada Kalır

[AutoCAD AcEdJig Örnek Kodu](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC) içinde görebileceğiniz gibi, AutoCAD bir elips oluşturmaya yönelik girdi mantığını birden çok yere ayırır.

* `createEllipse()` — elips merkez noktasını alır
* `sampler()` — ana eksen uç noktasını ve elips merkezinden küçük eksen uç noktasına olan mesafeyi alır

MLightCAD'da dinamik girdi iş akışının tamamı sırayla şu şekilde ifade edilir.

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ Kullanıcı girdisi, jig önizlemesi ve nihai geometri **aynı kod bloğunda** yönetilir.


## Temel Kavramlar

### Genel Jig (`AcEdPreviewJig<T>`)

`AcEdPreviewJig<T>`, geçici önizleme varlıklarını yöneten TypeScript tabanlı bir sınıftır:

| AutoCAD AcEdJig | Web CAD Jig (`AcEdPreviewJig`)      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | Harici olarak JS olayları aracılığıyla kontrol edilir |

**Özellikler:**

-   Birden çok girdi türünü (nokta, mesafe, açı vb.) işlemek için genel bir `T` türü kullanır
-   Geçici varlıkları işlemek için `AcEdBaseView` ile bütünleşir
-   Dinamik geometri güncellemeleri için `onJigUpdate(value: T)` uygulayan önizleme varlıklarını destekler
-   `end()` kullanarak jig'in temiz şekilde sonlandırılmasına olanak tanır

* * *

### Temel Yöntemler

#### `update(value: T): void`

Önizleme varlığını kullanıcı girdisine göre günceller. Bu, AutoCAD'in `sampler()` yönteminin karşılığıdır.

#### `render(): void`

Önizleme varlığını ilişkili görünümde işler; AutoCAD'in `worldDraw()` yöntemine benzer.

#### `end(): void`

Geçici varlığı temizler ve jig oturumunu sonlandırır.

#### `entity: AcDbEntity | null`

Geçerli önizleme varlığını döndüren alıcı.

## Jig'lerin Kullanımı

### Adım 1: Bir Jig Sınıfı Oluşturun

Belirli varlık için `AcEdPreviewJig<T>` sınıfını genişleten bir sınıf oluşturmanız gerekir. Örneğin, bir **daire jig'i** oluşturma:

```ts
import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcEdPreviewJig, AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}
```

**Açıklama:**

-   Jig, geçici bir `AcDbCircle` yönetir.
-   `update` yöntemi, yarıçapı kullanıcı girdisine göre dinamik olarak değiştirir.

* * *

### Adım 2: Jig'i Bir Komutta Kullanın

Varlığı etkileşimli olarak oluşturmak için jig'i bir komuta entegre edebilirsiniz:

```ts
import { AcEdCommand, AcApDocManager, AcEdPromptPointOptions, AcEdPromptDistanceOptions } from '@mlightcad/cad-simple-viewer'
import { AcApCircleJig } from './AcApCircleJig'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context) {
    // Step 2a: Acquire center point
    const centerPrompt = new AcEdPromptPointOptions('Specify center of circle:')
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Step 2b: Acquire radius using Jig
    const radiusPrompt = new AcEdPromptDistanceOptions('Specify radius of circle:')
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Step 2c: Add circle to database
    const circle = new AcDbCircle(center, radius)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

**İş Akışı:**

1.  Kullanıcıdan dairenin **merkezini** isteyin.
1.  Merkeze bağlı bir **daire jig'i** oluşturun.
1.  Etkileşimli önizlemeyle kullanıcıdan **yarıçapı** isteyin.
1.  Sonuçlanan daireyi veritabanına kaydedin.

* * *

## Kullanıcı Girdisi

AcEditor girdi API'leri, istem seçenekleri, anahtar sözcük kuralları ve istem sonucu işleme hakkında eksiksiz ve güncel bir kılavuz için şu sayfaya bakın:

[Kullanıcı Girdisi](./user-input)

## Kaynaklar

-   [AutoCAD AcEdJig Belgeleri](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig Sürükleme Döngüsü](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig Örnek Kodu](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)
