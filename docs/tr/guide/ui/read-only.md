---
title: Salt Okunur Mod
---

# Salt Okunur Mod

Salt okunur mod, çizimleri yalnızca görüntülemek ve ölçmek içindir. DWG/DXF arka planı tamamen düzenlenemez; işaretleme, çizim ve değiştirme komutlarının tümü kullanılamaz.

Salt okunur moda girildiğinde, arayüz düzenini cihaz türüne göre otomatik olarak uyarlar.

## Masaüstü

### Genel Düzen

Salt okunur modda Ribbon ve durum çubuğu yoktur. Arayüz tuval merkezlidir; tüm komutlara sağ taraftaki araç çubuğu ve yerleştirilmiş paneller üzerinden erişilir:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                                                      │
│                  Canvas + Overlays                   │
│                                                      │
│    ┌────┐                                            │
│    │ R  │   Docked Panels (Layers, Measurements,     │
│    │ T  │   Entity Info, etc.)                       │
│    │ B  │                                            │
│    └────┘                                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Sağ Taraf Araç Çubuğu

Tuvalin sağ tarafında yüzen dikey bir araç çubuğu — salt okunur modda birincil komut giriş noktası:

- Seç / Seçimi Kaldır
- Pan (el)
- Sınırlara Yakınlaştır
- Pencere Yakınlaştırma
- Katman Yönetimi (paneli açar)
- Ölçüm Araç Grubu (ölçüm panelini açar)
- Okuma Modu (tam ekran odak moduna girer)
- Açık/Koyu Arka Planı Değiştir

### Yerleştirilmiş Paneller

| Panel | Açıklama |
|---|---|
| Layers | Tüm katmanları listeler; açma/kapama, kilitleme, dondurma, yalıtma destekler |
| Measurements | Geçerli çizimdeki tüm ölçümleri listeler; konumlandırmak için tıklayın |
| Entity Info | Seçili öğenin türünü, koordinatlarını, katmanını ve özelliklerini gösterir |
| Statistics | Blok kullanım istatistikleri |
| Missing Resources | Eksik yazı tipleri veya dış referanslar için uyarılar |

## Tablet (Pad)

Tablet düzeni, masaüstü ve mobil arasındaki kompakt bir tasarımdır:

- Sağ taraf araç çubuğu korunur, ancak dokunma için düğme aralığı artırılır
- Yerleştirilmiş paneller varsayılan olarak simge çubuğuna daraltılır; yan çekmece olarak genişletmek için tıklayın

## Mobil

Mobil, **alt sekme çubuğu + çekmece paneli** tasarımı kullanır; tüm etkileşimi ekranın altında toplar ve üst kısmı tuval için bırakır.

### Alt Sekme Çubuğu

Ekranın altında altı simge düğmesi görüntülenir:

```
┌──────┬─────────┬────────┬────────┬────────┬─────────┐
│ Zoom │ Measure │ Review │ Layers │ Layout │ Setting │
└──────┴─────────┴────────┴────────┴────────┴─────────┘
```

| Düğme | İşlev |
|---|---|
| Zoom | Yakınlaştırma araç grubu: yakınlaştır, uzaklaştır, sınırlara yakınlaştır, pencere yakınlaştırma |
| Measure | Ölçüm araç grubu: mesafe, sürekli mesafe, alan, koordinatlar, yay uzunluğu, açı |
| Review | İşaretleme girişi (salt okunur modda devre dışı, gri tonlu) |
| Layers | Katman panel çekmecesini açar |
| Layout | Düzeni değiştir |
| Setting | Ayarlar menüsü: tema, simüle fare, OSNAP, vb. |

### Çekmece Paneli

Layers düğmesine dokunmak, alttan bir katman paneli açar; her katmanın adını, görünürlüğünü (Açık/Kapalı), rengini vb. gösterir. Tuvale veya panelin dışındaki alana dokunmak çekmceyi kapatır.

### Tuval Alanı

Tuval ekranın üst kısmını doldurur. Bir ölçüm seçildiğinde, tuvalde bir ölçüm rozeti görüntülenir.

### Masaüstünden Farkları

Mobil, sağ taraf araç çubuğunu veya yerleştirilmiş panelleri görüntülemez; işlevleri alt sekme çubuğu + çekmece panelleri ile değiştirilir.
