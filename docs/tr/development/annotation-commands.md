---
title: "Açıklama Komutları"
---

# Açıklama Komutları

Bu sayfa, `cad-viewer` içinde **açıklama komutlarının** nasıl uygulandığını, hem **komut katmanı** hem de **arayüz etkileşim katmanı** dahil olmak üzere tanıtır.  
Tasarım, *sistem değişkenleri*, *geçerli katman* ve *varlık çizim stilleri* gibi AutoCAD benzeri kavramları yakından takip eder.

## Genel Bakış

`cad-viewer` içindeki açıklamalar (açıklama daireleri, dikdörtgenler, bulut dikdörtgenler, eskizler vb.) şu şekilde uygulanır:

-   Ortak bir temel sınıftan türetilen özelleştirilmiş **komutlar**
-   Ayrılmış bir açıklama katmanında dinamik olarak oluşturulan **varlıklar**
-   Katman stilleri yerine sistem değişkenleriyle kontrol edilen **çizim stilleri**
-   Komut yürütme sırasında sistem değişkenlerini değiştiren **geçici bir arayüz araç çubuğu**

Bu yaklaşım şunları sağlar:

-   Tüm açıklama komutları arasında tutarlı davranış
-   Tüm açıklamaların kolayca gösterilmesi/gizlenmesi
-   AutoCAD tarzı iş akışına aşinalık

## Komut Bölümü

### Temel Komut Sınıfı

Tüm açıklamayla ilgili komutlar aynı temel sınıftan miras alır:

-   [`AcApBaseRevCmd`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApBaseRevCmd.ts)

Bu temel sınıf, aşağıdaki gibi ortak davranışları merkezileştirir:

-   Açıklama katmanı yönetimi
-   Sistem değişkeni yedekleme ve geri yükleme
-   Komut yaşam döngüsü yönetimi (başlat / bitir / iptal et)

`AcApBaseRevCmd` sınıfından miras alarak tüm açıklama komutları aynı yürütme desenini ve sistem değişkeni davranışını takip eder.

### Açıklama Katmanı Yönetimi

Tüm açıklama varlıkları, şu özelliklere sahip **ayrılmış bir açıklama katmanında** oluşturulur:

-   Yoksa **dinamik olarak oluşturulur**
-   Yalnızca açıklama komutu yürütülürken kullanılır

Arka planda bu, şu sistem değişkeni manipüle edilerek gerçekleştirilir:

-   `clayer` (geçerli katman)

#### İş Akışı

1.  Bir açıklama varlığı oluşturmadan önce:

    -   `clayer` değişkeninin özgün değeri kaydedilir
    -   `clayer` açıklama katmanına geçirilir

1.  Açıklama varlıkları oluşturulur

1.  Komut bittikten (veya iptal edildikten) sonra:

    -   `clayer` özgün değerine geri yüklenir

Bu şunları garanti eder:

-   Açıklamalar her zaman doğru katmana yerleştirilir
-   Kullanıcının katman durumu kalıcı olarak değiştirilmez

### Açıklamaları Gösterme / Gizleme

Açıklamaları gizlemek veya göstermek basitçe şu şekilde uygulanır:

-   **Açıklama katmanını gizlemek veya göstermek**

Varlık başına görünürlük mantığı gerekmez.  
Bu, açıklama görünürlüğü yönetimini verimli ve tutarlı hale getirir.

### Varlık Çizim Stili Çözümlemesi

Açıklama varlıkları görünümleri için **katman stillerini kullanmaz**.

Bunun yerine çizim stilleri, aşağıdakiler dahil olmak üzere **sistem değişkenlerinden** çözümlenir:

-   `cecolor` — geçerli varlık rengi
-   `celweight` — geçerli varlık çizgi kalınlığı

Bu tasarım şunlara olanak tanır:

-   Her açıklamanın görsel stilini oluşturulma anında koruması
-   Katman stili değişikliklerinin mevcut açıklamaları etkilememesi

## Arayüz Bölümü

### Varlık Çizim Stili Araç Çubuğu

Bir açıklama varlığı oluştururken aşağıdaki arayüz bileşeni gösterilir:

-   [`MlEntityDrawStyleToolbar`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-editor/src/component/layout/MlEntityDrawStyleToolbar.vue)

#### Davranış

-   Görüntüleyicinin **üst orta** kısmında görünür

-   Kullanıcıların şunları değiştirmesine olanak tanır:

    -   Renk
    -   Çizgi kalınlığı
    -   Diğer varlık çizim stilleri

Bu araç çubuğu dosya adı gösterimiyle çakıştığı için:

-   Araç çubuğu görünürken **dosya adı geçici olarak gizlenir**

### Sistem Değişkeni Bağlama

`MlEntityDrawStyleToolbar` ile kullanıcı etkileşimleri, aşağıdakiler gibi sistem değişkenlerini doğrudan değiştirir:

-   `cecolor`
-   `celweight`

Bu sistem değişkenleri daha sonra oluşturma sırasında açıklama varlıkları tarafından kullanılır ve şunları sağlar:

-   Kullanıcının araç çubuğunda gördüğü şeyin çizilenle eşleşmesi
-   Açıklama davranışının AutoCAD tarzı iş akışlarıyla tutarlı olması

### Sistem Değişkenini Geri Yükleme

Bir açıklama komutu bittikten sonra (başarılı olsun olmasın):

-   Değiştirilen sistem değişkenleri (`cecolor`, `celweight` vb.) özgün değerlerine geri yüklenir

Bu şunları sağlar:

-   Açıklama komutlarının genel çizim durumunu kalıcı olarak etkilememesi
-   Kullanıcıların açıklama ve normal çizim komutları arasında güvenle geçiş yapabilmesi

## Özet

`cad-viewer` içindeki açıklama sistemi üç temel fikir etrafında kurulmuştur:

1.  **Komut mirası**

    -   Tüm açıklama komutları ortak bir temel uygulamayı paylaşır

1.  **Katman tabanlı düzenleme**

    -   Tüm açıklamalar dinamik olarak yönetilen bir açıklama katmanında yaşar

1.  **Sistem değişkeni odaklı stiller**

    -   Çizim stilleri katman stilleriyle değil, sistem değişkenleriyle kontrol edilir

Bu mimari şunları sağlar:

-   Öngörülebilir komut davranışı
-   Kolay açıklama yönetimi
-   Tanıdık, CAD benzeri bir kullanıcı deneyimi
