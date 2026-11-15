---
title: PDF Çizimlerini Dönüştürme
---

# PDF Çizimlerini Dönüştürme

PDF çizimleri yalnızca basılı görüntüyü saklar: eğriler Bézier yollarına dönüşür, metin çoğu zaman çizgilerden oluşur, ölçüler ve bloklar dağınık çizgilere ayrılır. Şeritteki **AI** sekmesinin **PDF** paneli böyle bir çizimi düzenlenebilir CAD nesnelerine geri dönüştürür. Kesin olan durumlar içe aktarırken otomatik olarak dönüştürülür; geri kalanı için bir örnek seçer ya da bulunanları onaylarsınız.

| Düğme | Komut | Ne yapar |
|---|---|---|
| PDF İçe Aktar | `pdfimport` / `-pdfimport` | Bir PDF sayfasını içe aktarır; eğrileri, blokları, çizgi kalınlıklarını ve çizgi tiplerini yeniden oluşturur |
| Ölçeği Kalibre Et | `pdfscale` | Bilinen tek bir mesafeden içe aktarımı gerçek boyuta ölçekler |
| Metni Kurtar | `pdftext` | Patlatılmış metin çizgilerini yeniden metne dönüştürür |
| Blok Oluştur | `pdfblock` | Tekrarlanan geometriyi yeniden bloğa dönüştürür |
| Ölçüleri Kurtar | `pdfdim` | Patlatılmış ölçüleri yeniden ölçü nesnelerine dönüştürür |
| Taramaları Kurtar | `pdfhatch` | Kısa çizgilere ayrılmış taramayı deseniyle birlikte yeniden taramaya dönüştürür |

Bu komutlar **Yazma** modu gerektirir. Önerilen sıra: `pdfimport` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim` → `pdfhatch`.

## İçe aktarma (`pdfimport`)

1. PDF dosyasını seçin. **PDF İçe Aktar** iletişim kutusu açılır.
2. **İçe aktarılacak sayfa** bölümünde sayfayı seçin (yalnızca çok sayfalı dosyalar). Önizleme sayfayı gösterir; yanındaki küçük resim düğmesi tüm sayfaları listeler. **Gözat...** başka bir dosya seçer.
3. **Konum** bölümüne ekleme noktasının X/Y değerlerini girin (varsayılan başlangıç noktası) ya da Tamam'dan sonra çizimde seçmek için **Ekleme noktasını ekranda belirt** kutusunu işaretleyin. **Ölçek**, içe aktarırken uygulanan tek tip çarpandır.
4. **İçe aktarma modu** bölümünde sayfanın nasıl içe aktarılacağını seçin:
   - **Çizimi kurtar** (varsayılan): aşağıda anlatıldığı gibi özgün çizimi yeniden oluşturmaya çalışır.
   - **PDF görünümünü koru**: PDF'i göründüğü gibi korur. Her yol bir çizgi veya çoklu çizgi (eğriler parçalanır), her metin parçası ayrı bir metin olur; birleştirme, yineleme temizliği veya blok oluşturma yapılmaz. Kurtarma sayfanın görünümünü değiştirdiğinde kullanın.
5. **Tamam**'a tıklayın. Konum, ölçek ve mod bir sonraki `pdfimport` için hatırlanır.

`-pdfimport` iletişim kutusu olmadan içe aktarır: dosya seçildikten sonra komut satırında sayfayı (yalnızca çok sayfalı dosyalar), ardından **Ölçek** ve **Mod** seçenekleriyle ekleme noktasını sorar. Enter başlangıç noktasını kabul eder.

**Çizimi kurtar** modunda otomatik olarak yeniden oluşturulanlar:

- **Eğriler**: Bézier daireler, yaylar ve elipsler daire, yay ve elips olur. Çizgi ve yayları karıştıran dış hatlar yay parçalı çoklu çizgiler olur. Üretici tarafından zaten kısa çizgilere bölünmüş yaylar yeniden uydurulur. Serbest eğriler spline olur.
- **Bloklar**: aynı PDF formundan birkaç kez çizilen içerik tek bir blok (`PDF_FORM_n`) olur; döndürülmüş ve aynalanmış olanlar dahil her kopya bir blok referansı olur.
- **Stiller**: çizgi genişlikleri çizgi kalınlığına dönüşür, kesikli çizgiler `PDF_DASH_*` çizgi tipini, metin ise `PDF_<yazı tipi>` metin stilini alır. Bir satırın bölünmüş metin parçaları birleştirilir.
- **Temizlik**: tamamen aynı olan yinelenen dış hatlar atılır.

Dolgulu alanlar (renkli paneller, dolgulu logolar ve metin dış hatları) dolgu renginde düz tarama olarak, sayfadaki çizim sırasıyla içe aktarılır. Entegrasyonlar yalnızca dış hat almak için `fillHatches` seçeneğini `false` yapabilir.

Desenli taramalar (ANSI31, tuğla, çapraz tarama vb.) PDF'e binlerce kısa çizgi olarak yazılır. **Çizimi kurtar** modunda bu çizgiler tarama nesneleri olarak yeniden oluşturulur: çizgiler standart `acadiso.pat` desenleriyle ya da kullanıcı tanımlı tek veya çapraz bir desenle, çizildikleri ölçek, açı ve başlangıç noktasıyla birlikte eşleştirilir. Sınır, çizilmiş kapalı bir dış hattan, PDF kırpma yolundan veya çizgi uçlarından alınır. Tarama yalnızca çizimi sayfadaki çizgileri yeniden ürettiğinde tutulur; diğer her şey çizgi olarak kalır. Entegrasyonlar tüm çizgileri korumak için `recognizeHatches` seçeneğini `false` yapabilir.

Her iki modda da görüntüleyici metni genellikle farklı bir yazı tipiyle çizdiğinden, metin PDF'teki genişliğine göre uzatılır veya daraltılır. Resimler (fotoğraflar, logolar, QR kodları) `PDF_IMAGE_n.png` adlı raster görüntüler olarak içe aktarılır; DWG ve DXF görüntülere ayrı dosya olarak başvurduğundan pikseller yalnızca açık çizimde kalır. QR kodları gibi saydam zemin üzerindeki siyah resimler, PDF sayfasındaki gibi beyaz zemine yerleştirilir.

## Ölçek kalibrasyonu (`pdfscale`)

PDF çizimleri genellikle 1:50 veya 1:100 gibi bir ölçekte basılır.

1. Ölçeklenecek nesneleri seçin.
2. Bilinen bir mesafenin, örneğin ölçülendirilmiş bir kenarın, iki ucunu seçin.
3. Gerçek uzunluğu yazın.

Seçimde patlatılmış ölçüler varsa, metinlerinin gösterdiği ölçeğe göre gerçek uzunluk önceden doldurulur; kabul etmek için Enter'a basın.

## Metni kurtarma (`pdftext`)

1. Metnin bulunduğu alanı seçin. Çerçeveler ve diğer büyük çizgiler yok sayılır.
2. Çizgiler metin satırlarına gruplanır ve her satırın **SHX** metin (açık çizgi vuruşları) mi yoksa **TrueType** metin (kapalı anahatlar) mi olduğu belirlenir. Yalnızca daha önce yazdığınız karakter şekillerinden oluşan satırlar hemen okunur.
3. Görüntü destekli bir AI modeli yapılandırılmışsa (`LLMSETTINGS`), diğer tüm satırlar birkaç istekte tek seferde gönderilir. Tanıma başarısız olursa nedeni (örneğin geçersiz bir API anahtarı) bildirilir.
4. Paletde **Metni Kurtar** paneli açılır ve sonuç çizimde önizlenir. Panel açıkken kaydırma ve yakınlaştırma yapabilirsiniz.
   - SHX metin ve TrueType metin için ayrı ayrı mevcut bir **metin stili** seçin veya yenisini oluşturun ve kullandığı **yazı tipini** ile **büyük yazı tipini** kontrol edin. Özgün çizimle uyuşmuyorsa değiştirin; bir yazı tipi eksikse yerine neyin çizildiği, mevcut bir stilin yazı tiplerini değiştirmek o stili kullanan metinleri de değiştiriyorsa bu bir uyarıyla bildirilir. Varsayılan olarak SHX metin `PDF_SHX` stilini (`txt` + `gbcbig`) kullanır; böylece SHX metnin görünümü ve boyutu korunur.
   - **Yükseklik ölçeğini** ayarlayın; **genişlik faktörünü** özgün genişliğe sığdırın veya kendiniz belirleyin.
   - Liste her satırı metniyle ve kaynağıyla (öğrenildi, OCR, düzenlendi, okunamadı) gösterir; okunamayan satırlar en üstte yer alır. Bir satıra tıklayarak onu çizimde gösterin, metnini düzeltin veya yazın ve sonraki okunamayan satıra geçmek için Enter'a basın; bir satırı yazmak, aynı karakterleri kullanan diğer satırları da doldurur. Bir satırı atlamak için onay kutusunu kaldırın veya yanlış belirlenen bir satırı SHX ile TrueType arasında değiştirin.
   - Tek bir metin olması gerekirken ayrı satırlar olarak tanınan karakterler tek bir çok satırlı metinde (MText) birleştirilebilir: satırları Ctrl+tıklama veya Shift+tıklama ile seçip **MText olarak birleştir**'e tıklayın ya da aynı taban çizgisinde yan yana duran her şeyi birleştirmek için **Bitişikleri birleştir**'e tıklayın. Farklı taban çizgilerindeki satırlar, özgün satır aralığıyla MText'in ayrı satırları olur. **Ayır**, birleştirilmiş metni yeniden satırlarına ayırır.
   - **Özgün çizgileri gizle** yalnızca önizlemeyi gösterir.
5. Dönüştürmek için **Uygula**'ya tıklayın. **İptal** veya paleti kapatmak hiçbir şeyi değiştirmez.

Yazdığınız her karakter şekli tarayıcıda hatırlanır, böylece aynı yazı tipini kullanan diğer çizimler de bundan yararlanır. Yapay zekâ modelinin okuduğu metin hatırlanmaz. Komutun tamamı tek adımda geri alınabilir ve dönüştürülen metinler diğer metinler gibi düzenlenebilir.

## Blok oluşturma (`pdfblock`)

1. Tekrarlanan bir sembolün **bir** kopyasının nesnelerini seçin.
2. Blok taban noktasını seçin. **Ölçek** seçeneği farklı boyuttaki kopyaları da eşleştirir.
3. Blok adını onaylayın.
4. Döndürülmüş ve aynalanmış olanlar dahil diğer tüm kopyalar vurgulanır. Hepsini değiştirmek için **Evet**, yalnızca seçiminizi blok yapmak için **Hayır**, kopya kopya karar vermek için **İncele**'yi seçin.

## Ölçüleri kurtarma (`pdfdim`)

1. Ölçülerin bulunduğu alanı seçin. Değer metni TEXT olabilir veya hâlâ patlatılmış çizgiler (`pdftext` öncesi) olabilir: rakamlar ve CAD sembolleri yerleşik şablonla yerel okunur, LLM kullanılmaz. Çizgiler okunamazsa doğrusal ölçüler ölçülen uzunluğu değer olarak kullanır.
2. Şunlar tanınır:
   - **Doğrusal ölçüler**: her açıda, içte veya dışta oklarla, mimari işaretlerle ve zincir ölçüler.
   - **Yarıçap ve çap ölçüleri**: bir daireye değen ok ve `R…` veya `Ø…` metni.
   - **Açısal ölçüler**: iki ucunda ok bulunan bir yay.
3. **Ölçüleri Kurtar** paneli palette açılır ve çizgilerin yerine ölçü önizlemesi gösterilir. Panel açıkken kaydırıp yakınlaştırabilirsiniz.
   - Her değeri düzenleyin, bir ölçüyü atlamak için onay kutusunu kaldırın ve bir ölçü stili seçin veya oluşturun (önizleme, kurtarılan boyutları seçilen stilin görünümüyle gösterir).
   - **Orijinal çizgileri gizle** (varsayılan açık) değiştirilecek çizgileri gizleyerek sonucu gösterir.
4. Dönüştürmek için **Uygula**'ya tıklayın. **İptal** veya paneli kapatmak hiçbir şeyi değiştirmez.

Ölçüler, kağıt boyutları PDF ile aynı olan `PDF_DIM` stilini (veya oluşturduğunuz adı) kullanır; varlık üzerine yazmalar, başka bir stilin DIMSCALE'i büyük olsa bile bu boyutları sabitler. Doğrusal ölçek çarpanı metinlerden okunan çizim ölçeğine eşittir; bu yüzden 1:100 bir çizim gerçek değerlerini göstermeye devam eder. Ölçümden farklı olan veya ek semboller taşıyan metinler yazıldığı gibi kalır.

::: tip
Geometriyi gerçek boyutta istiyorsanız önce `pdfscale` komutunu çalıştırın; ardından `pdfdim` 1:1 ölçeği bulur.
:::

## Taramaları kurtarma (`pdfhatch`)

PDF bir desen taramasını yalnızca sınıra göre kesilmiş çok sayıda kısa çizgi olarak saklar.

1. Taralı alanı çevresindeki çizgilerle birlikte seçin. Alanın üzerinden bir kesişme penceresi yeterlidir.
2. Düzenli çizgiler önce `acadiso.pat` desenleriyle (ANSI31, ANSI36, AR-B816, ...), sonra kullanıcı tanımlı tek veya çapraz çizgilerle karşılaştırılır. Hiçbiri uymazsa aralık, kaydırma ve kesikler ölçülür ve tarama özel bir `PDF_HATCH` deseni alır.
3. Sınır, seçimdeki kapalı konturlardan veya seçili çizgi, yay ve çoklu çizgilerin çevrelediği alandan bulunur; bunlar birbirini kesse ya da sınırın dışına uzasa bile. Adalar delik olarak kalır.
4. Palette **Taramaları Kurtar** paneli açılır ve taramalar çizgilerin yerinde önizlenir. Panel açıkken kaydırma ve yakınlaştırma yapabilirsiniz.
   - Listede her taramanın deseni, ölçeği ve açısı, eşleşme puanı ve kaç nesnenin yerini alacağı gösterilir. Çizgilerini iyi yeniden çizemeyen taramalar işaretlenir. Çizimde göstermek için bir taramaya tıklayın; atlamak için onay kutusunu temizleyin.
   - Başka bir **desen** seçtiğinizde (`acadiso.pat` desenleri veya kullanıcı tanımlı tek ya da çift çizgiler) ölçeği ve açısı çizgilerden yeniden ölçülür. **Ölçeği** (veya **aralığı**) ve **açıyı** kendiniz de girebilirsiniz; **Otomatik uydur** bunları yeniden ölçer.
   - **Alan ekle**, tanımanın kaçırdığı bir alanın içinde bir nokta seçmenizi sağlar: o noktayı çevreleyen kapalı alandaki çizgilere en uygun desen uydurulur.
   - **Özgün çizgileri gizle** (varsayılan olarak açık), sonucu yerini aldığı çizgiler olmadan gösterir.
5. Dönüştürmek için **Uygula**'ya tıklayın. **İptal** veya paleti kapatmak hiçbir şeyi değiştirmez.

Bir tarama yalnızca yeniden çizildiğinde çizgilerini aynen oluşturuyorsa bulunur ve deseni değiştirdikten sonra da yalnızca taramanın tamamen yeniden çizdiği nesneler silinir. Desen ölçeği ve açısı çizim birimindedir; 1 ölçeğiyle içe aktarılan bir taramanın ölçeği küçük olur. Gerçek değerler için önce `pdfscale` çalıştırın.
