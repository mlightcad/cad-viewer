---
title: "Renk Sistemi"
---

# Renk Sistemi

`cad-viewer` renk sistemi, AutoCAD ObjectARX'in davranışını izlerken tarayıcı ortamında öngörülebilir işleme sağlar.

Hem **AutoCAD Color Index (ACI)** hem de **Gerçek Renk**'i destekler ve bunları `AcCmColor` soyutlaması üzerinden birleştirir.

## Genel Bakış

AutoCAD ile uyumlu sistemlerde renkler iki temel şekilde temsil edilir:

### ACI (AutoCAD Color Index)

- Tamsayı tabanlı renk sistemi (`0–256`)
- Önceden tanımlanmış bir palet kullanır
- Sabit RGB değerleri yerine bağlama bağlı olan **mantıksal renkleri** içerir

### Gerçek Renk

- 24 bit RGB rengi (`R, G, B`)
- Her kanal `0–255` aralığındadır
- ACI'den bağımsız olarak tam renk esnekliği sağlar

## `AcCmColor`

`cad-viewer` içindeki tüm renkler `AcCmColor` sınıfı kullanılarak temsil edilir.

Şunları destekler:

- ACI indeksi
- Gerçek renk (RGB)
- Mantıksal renk modları (ByLayer / ByBlock)

Referans uygulama:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/common/src/AcCmColor.ts>

Bu soyutlama, bir renk nesnesinin indeksli bir rengi veya açık bir RGB değerini temsil edebildiği ObjectARX'i yansıtır.

## Özel ACI Değerleri

Standart ACI değerlerinden (`1–255`) farklı olarak, aşağıdaki değerler **mantıksal renkleri** temsil eder:

### ACI = 0 → ByBlock

- Renk, blok referansı tarafından belirlenir
- Davranış:
  - Eklemeden önce: varsayılan ön plan rengini kullanır
  - Eklemeden sonra: blok bağlamından devralır

Bu sabit bir renk değil, dinamik bir referanstır.

### ACI = 256 → ByLayer

- Renk, varlığın katmanından devralınır
- CAD iş akışlarında en yaygın kullanılan mod

Davranış:

- Katman rengini değiştirmek, ByLayer kullanan tüm varlıkları günceller
- Merkezi renk yönetimi sağlar

### ACI = 7 → Uyarlanabilir Ön Plan Rengi

- **Varsayılan ön plan rengini** temsil eder
- Şu şekilde görüntülenir:
  - **Koyu arka planlarda beyaz**
  - **Açık arka planlarda siyah**

Bu, sabit bir RGB değeri değil **bağlama bağlı bir renk** yapar.

AutoCAD iş akışlarında:

- Yeni bir katman oluşturulduğunda, varsayılan rengi genellikle **ACI 7**'dir
- Bu, yeni oluşturulan geometrinin arka plan temasından bağımsız olarak her zaman görünür olmasını sağlar

## `AcDbEntity` İçinde Renk Çözümlemesi

Her varlık, nihai görüntüleme rengini `resolvedColor` özelliği aracılığıyla çözer.

Referans uygulama:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/entity/AcDbEntity.ts>


`resolvedColor` özelliği, işleme için kullanılan nihai RGB rengini belirler. Çözümleme öncelik tabanlı bir süreci izler:

- Gerçek Renk (En Yüksek Öncelik): Varlık açıkça bir gerçek renk tanımlıyorsa doğrudan onu kullanır
- ByLayer Çözümlemesi: Renk ByLayer ise (ACI = 256), katmanın çözümlenmiş rengine devreder
- ByBlock Çözümlemesi: Renk ByBlock ise (ACI = 0), blok ekleme bağlamına bağlıdır ve bağlam yoksa varsayılan bir renge geri döner
- ACI Renk Çözümlemesi: Standart ACI değerleri (`1–255`) için önceden tanımlanmış bir arama tablosu kullanır


## `cad-viewer` İçinde ACI 7'nin İşlenmesi

`cad-viewer`, ACI 7'yi sabit bir RGB değeri değil anlamsal bir renk olarak ele alır. Arka plan değiştiğinde kontrastı korumak için otomatik olarak tersine döner. Nasıl çalışır? Prensip olarak,

- **Arka plan değişikliği bir ön plan güncellemesini tetikler**: Görünümün arka plan rengi değiştiğinde, işleyiciye "ön plan" işleme rengini güncellemesi açıkça bildirilir. Kural basittir:

  - Arka plan siyahsa, ACI 7 için beyaz kullanın.
  - Arka plan beyazsa, ACI 7 için siyah kullanın.

- **Materyaller "ön plan" olup olmadıklarını hatırlar**: Materyaller oluşturulduğunda, bir ön plan (ACI 7) varlığını temsil edip etmediklerini belirten meta verilerle etiketlenir. Bu, sistemin ön plan değiştiğinde tersine dönmesi gereken *tüm önbelleğe alınmış materyalleri* bulmasını sağlar.

- **Merkezileştirilmiş ön plan güncellemesi**: İşleyicinin stil yöneticisi tek bir "ön planı değiştir" isteğini tüm materyal yöneticilerine (çizgiler, noktalar, dolgular) yönlendirir. Her yönetici önbelleğe aldığı materyalleri dolaşır ve yalnızca ön plan olarak etiketlenenleri günceller.

## Özet

| Tür         | Gösterim | Çözümleme Stratejisi |
| ----------- | -------------- | ------------------- |
| Gerçek Renk | RGB            | Doğrudan            |
| ACI (1–255) | İndeks         | Palet araması       |
| ByLayer     | 256            | Katmana devretme    |
| ByBlock     | 0              | Bağlama bağlı       |
| ACI 7       | 7              | Uyarlanabilir kontrast |

## Tasarım Hedefleri

`cad-viewer` renk sistemi şunları yapmak üzere tasarlanmıştır:

- ObjectARX semantiğiyle uyum sağlamak
- Mantıksal renk davranışlarını (ByLayer / ByBlock) korumak
- Tarayıcılarda tutarlı işleme sağlamak
- Uyarlanabilir ön plan renginin (ACI 7) doğru şekilde işlenmesini sağlamak
