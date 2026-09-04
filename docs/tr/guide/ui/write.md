---
title: Yazma Modu
---

# Yazma Modu

Yazma modu, özellikleri en eksiksiz olan moddur. İnceleme modunun tüm yeteneklerine ek olarak, DWG/DXF üzerinde doğrudan öğe oluşturma, düzenleme ve silme destekler; web ürününün yalnızca salt okunur önizleme değil, gerçek çizim işlerini de üstlenmesini sağlar.

Salt okunur veya inceleme modu açıkça belirtilmedikçe, bir dosya açıldığında varsayılan olarak yazma modu kullanılır.

## Masaüstü

### Genel Düzen

<WriteModeLayout />

### Üst Ribbon

Ribbon, tüm AutoCAD tarzı sekmeleri tam olarak görüntüler:

| Sekme | Komutlar |
|---|---|
| File | Aç, Export DXF, Export PNG, Export Self-contained HTML |
| Draw | Line, Circle, Arc, Rect, Polyline, Hatch, Text, MText, Block Insert, vb. |
| Modify | Move, Copy, Offset, Trim, Extend, Rotate, Scale, Mirror, Array, vb. |
| Layers | Katman yönetimi (açma/kapama, dondurma/çözme, kilitleme, yalıtma, yeni, silme) |
| Properties | Renk, çizgi tipi, çizgi kalınlığı, katman seçici |
| Measure | Tüm ölçüm komutları |
| Markup | Tüm işaretleme komutları |

### Command Line

Tuvalin altında bir komut satırı penceresi, komut adlarının doğrudan yazılmasını sağlar (örn., bir çizgi çizmek için `L` + Enter, bir daire çizmek için `C` + Enter). Şunları destekler:
- Komut istemlerini ve geçmişini görüntüleme
- Sayısal değerler ve koordinatlar girme
- Komut geçmişine göz atmak için yukarı/aşağı okları kullanma

### Sağ Taraf Araç Çubuğu

İnceleme mod araçlarına ek olarak, bir **Seç / Düzenle araç grubu** vardır:

- Seç
- Pan
- Sınırlara Yakınlaştır
- Pencere Yakınlaştırma
- Katman Yönetimi
- Ölçüm araç grubu
- İşaretleme araç grubu
- Okuma Modu
- Açık/Koyu Arka Planı Değiştir

### Yerleştirilmiş Paneller

| Panel | Açıklama |
|---|---|
| Layers | Tam katman yönetimi |
| Properties | Seçili öğenin özellikleri (tür, koordinatlar, katman, renk, çizgi tipi, çizgi kalınlığı, vb.), düzenlenebilir |
| Measurements | Ölçüm sonucu yönetimi |
| Review (Markup) | İşaretleme yönetimi |
| Statistics | Blok kullanım istatistikleri |
| Missing Resources | Yazı tipi / dış referans uyarıları |

### Durum Çubuğu

Soldan sağa tam bir CAD durum çubuğu:

| Alan | Açıklama |
|---|---|
| Layout sekmeleri | Model uzayı / düzen değiştirme |
| Command prompt | Geçerli etkin komutun istem metni (örn., "Başlangıç noktasını belirtin:") |
| Coordinates | Gerçek zamanlı imleç koordinatları |
| OSNAP | Nesne yakalama geçişi ve yapılandırması |
| ORTHO | Dik mod |
| POLAR | Kutupsal izleme |
| Object Snap Tracking (OTRACK) | |
| Çizgi kalınlığı görüntüleme | |
| Dynamic Input | Yüzen giriş kutusu geçişi |
| Izometrik | |
| Tema | |
| Tam Ekran | |

## Tablet (Pad)

Tablet düzeni, masaüstü ve mobil arasındadır, ancak yazma modu düzenleme için gereken tüm bileşenleri korur:

- Ribbon tam sekmeleri korur, ancak komut düğmeleri simgelere daralır
- Sağ taraf araç çubuğu korunur
- Command Line varsayılan olarak küçük bir çubuğa daralır; genişletmek için tıklayın
- Yerleştirilmiş paneller yan çekmece olarak genişletilebilir
- Durum çubuğu basitleştirilmiş biçimde temel düğmeleri gösterir

## Mobil

Mobilde yazma modunda, komut satırı ve tam çizim/değiştirme yetenekleri, alt sekme çubuğunun yerine geçen bir **Mobil Komut Yerleşimi** aracılığıyla uygulanır.

### Komut Yerleşimi

Bir çizim veya değiştirme komutu yürütülürken, ekranın altında bir komut işlem çubuğu görünür ve şunları içerir:
- Geçerli komut istemi
- ✓ Onayla / ✗ İptal düğmeleri
- Dynamic Input (DYN) açılır paneli

### Giriş Yöntemleri

Mobil çizim aşağıdaki giriş yöntemlerini kullanır:
- **Dokunma noktası girişi**: bir nokta oluşturmak için ekrana dokunun (<0,5 sn)
- **Sürükleme noktası girişi**: ekranı uzun basın (>0,5 sn), sürükle-seç moduna girin ve bırakın
- **Simüle Fare**: varsayılan olarak etkin; uzun basınca parmağın üzerinde bir artı işareti belirir; gerçek giriş konumu artı işaretine dayanır
- **Büyüteç**: ayarlardan açma/kapama; dairesel bir büyüteç HUD'u parmak alanını büyütür

### Otomatik Geri Dönüş

Komut yürütmesi sırasında durum çubuğu geçici olarak gizlenir (komut yerleşimi girişi devralır). Komut bittikten sonra durum çubuğu geri yüklenir.
