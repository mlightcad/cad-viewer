---
title: PDF Çizimlerini Dönüştürme
---

# PDF Çizimlerini Dönüştürme

PDF çizimleri yalnızca basılı görüntüyü saklar: eğriler Bézier yollarına dönüşür, metin çoğu zaman çizgilerden oluşur, ölçüler ve bloklar dağınık çizgilere ayrılır. Şeritteki **AI** sekmesinin **PDF** paneli böyle bir çizimi düzenlenebilir CAD nesnelerine geri dönüştürür. Kesin olan durumlar içe aktarırken otomatik olarak dönüştürülür; geri kalanı için bir örnek seçer ya da bulunanları onaylarsınız.

| Düğme | Komut | Ne yapar |
|---|---|---|
| PDF İçe Aktar | `ipdf` | Bir PDF sayfasını içe aktarır; eğrileri, blokları, çizgi kalınlıklarını ve çizgi tiplerini yeniden oluşturur |
| Ölçeği Kalibre Et | `pdfscale` | Bilinen tek bir mesafeden içe aktarımı gerçek boyuta ölçekler |
| Metni Kurtar | `pdftext` | Patlatılmış metin çizgilerini yeniden metne dönüştürür |
| Blok Oluştur | `pdfblock` | Tekrarlanan geometriyi yeniden bloğa dönüştürür |
| Ölçüleri Kurtar | `pdfdim` | Patlatılmış ölçüleri yeniden ölçü nesnelerine dönüştürür |

Bu komutlar **Yazma** modu gerektirir. Önerilen sıra: `ipdf` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim`.

## İçe aktarma (`ipdf`)

1. PDF dosyasını seçin.
2. Çok sayfalı bir dosyada sayfa numarasını girin.
3. Ekleme noktasını belirtin ya da başlangıç noktası için Enter'a basın. Seçenekler:
   - **Ölçek**: içe aktarırken uygulanan tek tip çarpan.
   - **Mod**: sayfanın nasıl içe aktarılacağı.
     - **Kurtar** (varsayılan): aşağıda anlatıldığı gibi özgün çizimi yeniden oluşturmaya çalışır.
     - **Görünüm**: PDF'i göründüğü gibi korur. Her yol bir çizgi veya çoklu çizgi (eğriler parçalanır), her metin parçası ayrı bir metin olur; birleştirme, yineleme temizliği veya blok oluşturma yapılmaz. Kurtarma sayfanın görünümünü değiştirdiğinde kullanın.

**Kurtar** modunda otomatik olarak yeniden oluşturulanlar:

- **Eğriler**: Bézier daireler, yaylar ve elipsler daire, yay ve elips olur. Çizgi ve yayları karıştıran dış hatlar yay parçalı çoklu çizgiler olur. Üretici tarafından zaten kısa çizgilere bölünmüş yaylar yeniden uydurulur. Serbest eğriler spline olur.
- **Bloklar**: aynı PDF formundan birkaç kez çizilen içerik tek bir blok (`PDF_FORM_n`) olur; döndürülmüş ve aynalanmış olanlar dahil her kopya bir blok referansı olur.
- **Stiller**: çizgi genişlikleri çizgi kalınlığına dönüşür, kesikli çizgiler `PDF_DASH_*` çizgi tipini, metin ise `PDF_<yazı tipi>` metin stilini alır. Bir satırın bölünmüş metin parçaları birleştirilir.
- **Temizlik**: tamamen aynı olan yinelenen dış hatlar atılır.

Dolgulu alanlar (renkli paneller, dolgulu logolar ve metin dış hatları) dolgu renginde düz tarama olarak, sayfadaki çizim sırasıyla içe aktarılır. Entegrasyonlar yalnızca dış hat almak için `fillHatches` seçeneğini `false` yapabilir.

Her iki modda da görüntüleyici metni genellikle farklı bir yazı tipiyle çizdiğinden, metin PDF'teki genişliğine göre uzatılır veya daraltılır. Resimler (fotoğraflar, logolar, QR kodları) `PDF_IMAGE_n.png` adlı raster görüntüler olarak içe aktarılır; DWG ve DXF görüntülere ayrı dosya olarak başvurduğundan pikseller yalnızca açık çizimde kalır. QR kodları gibi saydam zemin üzerindeki siyah resimler, PDF sayfasındaki gibi beyaz zemine yerleştirilir.

## Ölçek kalibrasyonu (`pdfscale`)

PDF çizimleri genellikle 1:50 veya 1:100 gibi bir ölçekte basılır.

1. Ölçeklenecek nesneleri seçin.
2. Bilinen bir mesafenin, örneğin ölçülendirilmiş bir kenarın, iki ucunu seçin.
3. Gerçek uzunluğu yazın.

Seçimde patlatılmış ölçüler varsa, metinlerinin gösterdiği ölçeğe göre gerçek uzunluk önceden doldurulur; kabul etmek için Enter'a basın.

## Metni kurtarma (`pdftext`)

1. Metnin bulunduğu alanı seçin. Çerçeveler ve diğer büyük çizgiler yok sayılır.
2. Çizgiler satırlara gruplanır ve her satır sırayla vurgulanır. Metnini yazıp onaylayın; satırı atlamak için boş bırakın, durdurmak için Esc'e basın.
3. Onaylanan her karakter şekli hatırlanır. Yalnızca bilinen şekillerden oluşan satırlar sorulmadan dönüştürülür; ne kadar çok yazarsanız o kadar az yazmanız gerekir.

Hatırlanan şekiller tarayıcıda saklanır, böylece aynı yazı tipini kullanan diğer çizimler de bundan yararlanır. CAD Agent için görüntü destekli bir yapay zekâ modeli ayarlanmışsa, her satır önerilen bir metinle gelir.

## Blok oluşturma (`pdfblock`)

1. Tekrarlanan bir sembolün **bir** kopyasının nesnelerini seçin.
2. Blok taban noktasını seçin. **Ölçek** seçeneği farklı boyuttaki kopyaları da eşleştirir.
3. Blok adını onaylayın.
4. Döndürülmüş ve aynalanmış olanlar dahil diğer tüm kopyalar vurgulanır. Hepsini değiştirmek için **Evet**, yalnızca seçiminizi blok yapmak için **Hayır**, kopya kopya karar vermek için **İncele**'yi seçin.

## Ölçüleri kurtarma (`pdfdim`)

1. Ölçülerin bulunduğu alanı seçin.
2. Şunlar tanınır:
   - **Doğrusal ölçüler**: her açıda, içte veya dışta oklarla, mimari işaretlerle ve zincir ölçüler.
   - **Yarıçap ve çap ölçüleri**: bir daireye değen ok ve `R…` veya `Ø…` metni.
   - **Açısal ölçüler**: iki ucunda ok bulunan bir yay.
3. Bloklarda olduğu gibi **Evet**, **Hayır** veya **İncele**'yi seçin.

Ölçüler, metin yüksekliği ve ok boyutu PDF ile aynı olan `PDF_DIM` stilini kullanır. Doğrusal ölçek çarpanı metinlerden okunan çizim ölçeğine eşittir; bu yüzden 1:100 bir çizim gerçek değerlerini göstermeye devam eder. Ölçümden farklı olan veya ek semboller taşıyan metinler yazıldığı gibi kalır.

::: tip
Geometriyi gerçek boyutta istiyorsanız önce `pdfscale` komutunu çalıştırın; ardından `pdfdim` 1:1 ölçeği bulur.
:::
