---
title: "Kullanıcı Girdisi"
---

# Kullanıcı Girdisi

Bu sayfa, AcEditor'ün kullanıcı girdilerini nasıl topladığını açıklar; buna kullanılabilir girdi yöntemleri, ortak istem seçeneği kalıpları (mesajlar, anahtar sözcükler, jig'ler ve lastik bant davranışı), anahtar sözcük eşleştirme kuralları ve istem sonuçlarının nasıl yorumlanacağı dahildir. Ayrıca amaçlanan kullanımı netleştirir: girdi, canvas üzerinde manuel fare/klavye dinleyicileri yerine AcEditor API'leri aracılığıyla alınmalıdır.

**Amaç**

AcEditor, AutoCAD'in düzenleyici girdi API'lerinin yapısını ve amacını yansıtır. Dinamik istemleri, anahtar sözcükleri ve önizleme jig'lerini koordine ederken kullanıcı girdisi almak için üst düzey ve tutarlı bir yol sağlar. Girdi işleme kasıtlı olarak merkezileştirilmiştir: anahtar sözcük ayrıştırma ve fare etkileşimleri soyutlanmıştır ve AcEditor yöntemleri aracılığıyla erişilmelidir. Teknik olarak `AcEdBaseView.canvas` üzerinde doğrudan klavye veya fare olaylarını dinleyebilseniz de bu yanlış kullanım olarak kabul edilir ve düzenleyicinin girdi yaşam döngüsünü, anahtar sözcük işlemeyi ve istem sonucu kurallarını atlar.

**Girdi Yöntemleri**

| Yöntem | Seçenek Türü | Sonuç Türü | Tipik Kullanım |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | Nokta edinme |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | İsteğe bağlı temel noktayla mesafe girdisi |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | İsteğe bağlı temel noktayla açı girdisi |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | Sayısal girdi (kayan nokta) |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | Serbest metin girdisi |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | Yalnızca anahtar sözcük girdisi (genel anahtar sözcüğü döndürür) |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | Tek bir varlık seçme |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | Birden çok varlık seçme |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | Bir kutu tanımlamak için iki köşe seçme |

**Ortak İstem Seçenekleri**

Tüm istem seçeneği türleri `AcEdPromptOptions<T>` sınıfından türetilir ve şu yetenekleri paylaşır:

- `message`: Kullanıcıya gösterilen istem metni.
- `keywords`: Geçerli anahtar sözcükleri tutan bir `AcEdKeywordCollection`.
- `appendKeywordsToMessage`: True olduğunda, anahtar sözcükler görüntüleme için mesaja eklenir.
- `jig`: Girdi sırasında canlı önizlemeyi etkinleştirmek için bir `AcEdPreviewJig<T>` ekler.
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`: `"Pick point [Yes/No]"` gibi birleşik bir mesajı ayrıştırır ve boşlukla ayrılmış bir listeden genel anahtar sözcükleri atar.

**Lastik Bant ve Temel Nokta Ayarları**

Birkaç istem seçeneği lastik bant çizgisi veya temel nokta davranışını destekler:

- `AcEdPromptPointOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `allowNone`.
- `AcEdPromptDistanceOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `only2d`.
- `AcEdPromptAngleOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `useAngleBase`.
- `AcEdPromptBoxOptions`: `useBasePoint`, `useDashedLine` ve ayrı `firstCornerMessage` / `secondCornerMessage`.

`useBasePoint` true olduğunda, düzenleyici temel noktadan imlece bir lastik bant çizgisi çizer. `useDashedLine`, bu çizginin kesikli olup olmayacağını kontrol eder.

**Anahtar Sözcük Kuralları ve Biçimleri**

Anahtar sözcükler `AcEdKeywordCollection` aracılığıyla tanımlanır ve büyük/küçük harfe duyarsız olarak eşleştirilir. Çözümlenen değer her zaman anahtar sözcüğün **genel adıdır**.

- Her anahtar sözcüğün bir `displayName` (UI), bir `globalName` (dahili) ve bir `localName` (kullanıcı girdisi) değeri vardır.
- Kullanıcılar `localName`, `globalName`, görüntü metni veya türetilmiş bir takma ad girebilir; hepsi büyük/küçük harfe duyarsız olarak eşleştirilir.
- Takma ad, genel addaki büyük harflerden türetilir; örneğin `Yes → Y`, `sAve → A`, `eXit → X`.
- Girdinin başına `_` eklemek genel anahtar sözcük eşleşmesini zorlar.

Anahtar sözcükleri iki yaygın şekilde tanımlayabilirsiniz:

- API kullanımı: `options.keywords.add(displayName, globalName, localName)`.
- ObjectARX tarzı dizge listesi (`AcEdKeywordCollection` kurucusu için): yerel ve genel bölümler `_` ile ayrılır, isteğe bağlı virgül kısaltması ve büyük harfler takma adı tanımlar.

Örnekler:

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**İstem Sonuçları**

Çoğu girdi yöntemi, aşağıdakileri içeren `PromptResult` tarzı bir nesne döndürür:

- `status`: `OK`, `Cancel` veya `Keyword` gibi bir `AcEdPromptStatus` kodu.
- `stringResult`: `status === Keyword` olduğunda, eşleşen **genel anahtar sözcüğü** tutar.

Türe özgü sonuç sınıfları, `status === OK` olduğunda tiplendirilmiş bir `value` sağlar:

| Sonuç Türü | Değer Alanı | Notlar |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | OK olduğunda nokta |
| `AcEdPromptDoubleResult` | `value: number` | OK olduğunda double |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | Seçilen varlık kimliği |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | Seçim kümesi |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | Sınırlayıcı kutu |

Not: `getKeywords`, `PromptResult` nesnesi yerine anahtar sözcük dizgesini doğrudan döndürür.

**Örnek: Anahtar Sözcüklü Nokta**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```
