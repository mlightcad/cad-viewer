---
title: Oturum Paneli (Mobil)
---

# Oturum Paneli (Mobil)

Masaüstünde, imlecin yakınındaki **Dinamik Girdi (DYN)** yüzen çerçevesi kullanıcıların mesafe/açı değerlerini doğrudan yazıp **Enter** ile onaylamasına veya **Esc** ile iptal etmesine olanak sağlar. Fiziksel klavyenin bulunmadığı mobilde bu etkileşim farklı bir araca ihtiyaç duyar.

**Oturum Paneli** mobildeki Dinamik Girdi + klavye karşılığıdır. Ekranın altına yerleşir, bir komut aktifken otomatik açılır, mevcut istemi ve canlı ölçüm değerlerini gösterir ve ekrandaki **Onay** (✓) ve **İptal** (×) düğmelerini sağlar — masaüstündeki **Enter** ve **Esc** komutlarının mobil karşılıkları.

## Önizleme

Oturum Paneli'nin dokümantasyonda gerçekten render edilmiş hali aşağıdadır:

<MobileSessionPanel />

## Panel yapısı

Genişletilmiş modda panel yukarıdan aşağıya doğru aşağıdaki bölümlere ayrılır:

### Aksesuar / Başlık Satırı

İlk satırın sol tarafında aktif komutun yerleştirdiği **Oturum Aksesuarı** gösterilir. Farklı komutlar farklı aksesuarlar yerleştirir — ölçüm ve açıklama komutları **Çizim Stili Oturum Aksesuarı** (renk + metin yüksekliği) yerleştirirken, PLine, Text gibi diğer komutlar kendi özel aksesuar kontrollerini yerleştirebilir. Eğer aktif komut **hiçbir oturum aksesuarı yerleştirmiyorsa**, ilk satırın sol tarafında komut istemi metni doğrudan gösterilir (ve aşağıda açıklanan istem satırı görünmez).

Aşağıdaki demo, bir çizim stili aksesuarının yerleştirildiği ölçüm / açıklama senaryosunu gösterir:

| Kontrol | Simge | Amaç |
|---|---|---|
| Renk düğmesi | <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#1a8cff;border:1px solid #555;"></span> | Aktif çizim rengini ayarlamak için ACI renk paleti / iletişim kutusunu açar |
| Metin yüksekliği düğmesi | <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle"><text x="2" y="18" font-family="Georgia, Times New Roman, serif" font-size="16" font-weight="600" fill="#e8eaed">A</text><g stroke="#2dd4bf" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M18 4v16"/><path d="M15.5 6.5 18 4l2.5 2.5"/><path d="M15.5 17.5 18 20l2.5-2.5"/></g></svg> | Metin boyutunu ayarlamak için metin yüksekliği iletişim kutusunu açar |

Satırın sağ tarafında iki daire ikonlu düğme bulunur:

| Düğme | Simge | Amaç |
|---|---|---|
| Yardım | ? | Tam ekran yardım panelini açar |
| Daralt / Genişlet | ▼ / ▲ | Kompakt mod ile genişletilmiş mod arasında geçiş yapar |

### İstem Satırı

İkinci satır **yalnızca aktif komut bir oturum aksesuarı yerleştirdiğinde** görünür. Komutun **istem metnini** (ör. "İlk noktayı belirtin") ve komutun isteğe bağlı bağımsız değişkenler sunması durumunda ilgili **anahtar kelime çiplerini** (ör. `[Geri al(U)/Devam et(C)]`) gösterir. İstem sola hizalanır ve otomatik olarak yerelleştirilir.

Eğer aktif komut bir oturum aksesuarı yerleştirmiyorsa, istem metni doğrudan ilk satırın sol tarafına (aksesuarın yerine) geçer ve ayrı bir ikinci satır gösterilmez.

Bir anahtar kelime çipine dokunmak, masaüstü komut satırına anahtar kelime yazmanın mobil karşılığıdır.

### Ölçümler

Kullanıcı parmağını sürüklerken panel gerçek zamanlı olarak güncellenir. Gösterilen değerler komut durumuna bağlıdır:

| Durum | Gösterilen değerler | Anlamı |
|---|---|---|
| İlk nokta seçilmeden önce | **X** / **Y** | Mevcut imleç konumunun mutlak koordinatları |
| İlk nokta seçildikten sonra (göreceli mod) | **Uzunluk** / **Açı** | İlk noktadan mevcut konuma kadar olan mesafe ve açı |
| İlk nokta seçildikten sonra (göreceli mod) | **ΔX** / **ΔY** | İlk noktadan mevcut konuma kadar X ve Y delta değerleri |

Telefon ve tablet yerleşimleri farklıdır: telefonda her ölçüm değeri kendi satırına sahiptir ve İptal/Onay düğmesi sağ tarafa gömülür; tablette ölçüm değerleri yan yana durur ve İptal/Onay düğmeleri en sağdaki ortak alanda gruplanır.

### Onay / İptal Düğmeleri

| Düğme | Simge | Masaüstü karşılığı | Amaç |
|---|---|---|---|
| **Onay** | ✓ (mavi daire) | `Enter` / boş dönüş | Mevcut girdiyi kabul et veya varsayılan değeri kullan |
| **İptal** | × (gri daire) | `Esc` | Mevcut komutu durdur |

Komut boş bir dönüşü kabul etmiyorsa (kullanıcının bir değer sağlaması gerekiyorsa), **Onay** düğmesi devre dışı bırakılır (soluk görünür).

## Kompakt Mod

Başlık satırındaki ▼ düğmesine dokunarak **Kompakt Mod**a geçin. Panel birden fazla satırdan tek satıra küçülür; istem satırı, ölçümler ve anahtar kelime çipleri gizlenir. Sadece aşağıdakiler görünür kalır:

- **Oturum aksesuarı** (yerleştirilmişse)
- **Genişlet** düğmesi (▲, ok yönü ters)
- **İptal** (×) / **Onay** (✓) düğmeleri

Kompakt mod, temel işlemleri korurken komut yürütme sırasında tuvali mümkün olduğunca görünür tutar. Genişletilmiş moda dönmek için **Genişlet** düğmesine dokunun.

Yerleştirilmiş bir oturum aksesuarı ile kompakt durum aşağıdadır:

<MobileSessionPanel initialCompact />

## Telefon vs Tablet

Oturum paneli görüntü alanının genişliğine otomatik olarak uyum sağlar:

| Özellik | Telefon (≤ 600px) | Tablet (> 600px) |
|---|---|---|
| Panel genişliği | Tam ekran genişliği | Ortalanmış, sabit 480px, yuvarlak köşeler ve gölge |
| Ölçüm yerleşimi | Dikey yığılmış, ölçüm başına bir satır | Yan yana, iki ölçüm grubu paralel |
| Düğme yerleşimi | İptal / Onay farklı ölçüm satırlarına gömülmüş | İptal / Onay sağdaki ortak alanda gruplanmış |
| Kompakt stil | Tam genişlikli tek satır | Ortalanmış sabit genişlikli tek satır |

## Masaüstü karşılığı

| Masaüstü eylemi | Mobil oturum paneli karşılığı |
|---|---|
| Mesafe / açı gösteren Dinamik Girdi (DYN) | Uzunluk, Açı, ΔX, ΔY gösteren canlı ölçümler |
| Komut satırına anahtar kelime seçenekleri yazmak | Anahtar kelime çiplerine dokunmak |
| Varsayılanı kabul etmek için `Enter` / boş dönüş | **Onay** (✓) düğmesi |
| Komutu iptal etmek için `Esc` | **İptal** (×) düğmesi |
| Komut satırı istemi `İlk noktayı belirtin:` | Aynı metni gösteren istem satırı |
