---
title: İnceleme Modu
---

# İnceleme Modu

İnceleme modu, salt okunur modun üzerine tam işaretleme yetenekleri ekler. DWG/DXF arka planı salt okunur kalır; tüm işaretlemeler HTML yerleşimleri olarak çizilir ve sidecar JSON dosyaları aracılığıyla bağımsız olarak kaydedilir/paylaşılır.

İnceleme moduna girildiğinde, arayüz otomatik olarak işaretlemeyle ilgili araçları ve panelleri görüntüler.

## Masaüstü

### Genel Düzen

Salt okunur modla aynı: Ribbon ve durum çubuğu yoktur. Arayüz tuval merkezlidir; komutlara sağ taraf araç çubuğu ve yerleştirilmiş paneller üzerinden erişilir. Fark, sağ taraf araç çubuğunun bir işaretleme araç grubu kazanması ve yerleştirilmiş panellerin bir inceleme paneli kazanmasıdır.

<ReviewModeLayout mode="review" />


### Sağ Taraf Araç Çubuğu

Salt okunur mod araçlarına ek olarak, şu komutları içeren bir **İşaretleme Araç Grubu** açılır paneli vardır: ok, metin, bulut, dikdörtgen, daire, Callout, damga ve diğer işaretleme komutları.

### Yerleştirilmiş Paneller

Salt okunur mod panellerine ek olarak, bir **İnceleme (İşaretleme) Paneli** vardır:

| Panel | Açıklama |
|---|---|
| Review (Markup) | Tüm işaretlemeleri listeler; simge, oluşturan, zaman ve türüne göre özet gösterir. Tıklayarak konumlandırma, meta veri düzenleme (Yorum / Durum) ve temizleme destekler |

Tüm diğer paneller (Layers, Measurements, Entity Info, Statistics, Missing Resources) salt okunur moddakiyle aynıdır.

## Tablet (Pad)

Salt okunur moddakiyle aynı tablet düzeni, ancak:

- Sağ taraf araç çubuğu bir işaretleme araç grubu açılır düğmesi kazanır
- Yerleştirilmiş panel listesi bir "Review" panel girişi kazanır

## Mobil

Mobil alt sekme çubuğundaki **Review düğmesi** bu modda aktiftir ve kullanılabilirdir.

### Alt Sekme Çubuğu

| Düğme | Durum |
|---|---|
| Zoom | Kullanılabilir |
| Measure | Kullanılabilir |
| Review | **Kullanılabilir** — işaretleme araç panelini açmak için tıklayın |
| Layers | Kullanılabilir |
| Layout | Kullanılabilir |
| Setting | Kullanılabilir |

<MobileBottomTabBar mode="review" />


### Review Düğmesi

Review düğmesine dokunmak, alttan bir işaretleme araç paneli açar; şu komutları listeler: ok, metin, bulut, dikdörtgen, daire, Callout, damga vb. Birini seçmek, işaretleme komutuna doğrudan girer; tuvalde gerçek zamanlı önizleme ve etkileşimli oluşturma ile.

### İşaretleme Listesi

Review panelinin altında veya ikincili bir görünümde, geçerli çizimdeki tüm işaretlemeleri görebilirsiniz. Bir liste öğesine tıklamak size şunları sağlar:

- Tuviali işaretlemenin konumuna yakınlaştırma
- İşaretleme görünürlüğünü değiştirme
- İşaretleme meta verisi düzenlemeyi açma (Yorum / Durum)

### İşaretlemeyi İçe / Dışa Aktarma

Review panelinin üst kısmı dışa ve içe aktarma düğmeleri sağlar. Sidecar JSON dosyaları çizimler ve cihazlar arasında paylaşılabilir.

## Salt Okunur Moddan Farkları

| Bileşen | Salt Okunur | İnceleme |
|---|---|---|
| Sağ taraf araç çubuğu · İşaretleme araç grubu | ✗ | ✓ |
| Yerleştirilmiş panel · Review (Markup) | ✗ | ✓ |
| Mobil · Review alt düğmesi | Devre dışı (gri tonlu) | Kullanılabilir |
| İşaretleme oluşturma / düzenleme | ✗ | ✓ |
| İşaretleme içe / dışa aktarma | ✗ | ✓ |
