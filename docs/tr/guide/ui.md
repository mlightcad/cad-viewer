---
title: Kullanıcı Arayüzü
---

# Kullanıcı Arayüzü

MLightCAD Viewer, AutoCAD benzeri klasik üç bölümlü bir düzen kullanır: üst şerit, orta tuval alanı ve alt durum çubuğu.

## Genel Düzen

```
┌─────────────────────────────────────────────────┐
│  Üst Şerit (Ribbon)                             │
├─────────────────────────────────────────────────┤
│                                                 │
│           Tuval + Üst katmanlar                 │
│    ┌──────────┐                                 │
│    │Sağ araç  │  Yerleştirilebilir paneller     │
│    │çubuğu    │  (Katmanlar, Özellikler vb.)    │
│    │          │                                 │
│    └──────────┘                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  Durum çubuğu                                   │
└─────────────────────────────────────────────────┘
```

## Üst Şerit

Şerit, komut düğmelerini sekme (Tab) ve grup (Group) halinde düzenler.

### Dosya

| Düğme | Açıklama |
|---|---|
| Aç | DWG / DXF dosyası aç |
| DXF dışa aktar | Geçerli çizimi DXF biçiminde dışa aktar |
| PNG dışa aktar | Tuvayı PNG görüntü olarak dışa aktar |

### Çizim

Line, Circle, Arc, Rect, Polyline, Hatch vb. çizim komutlarını içerir. Bu komutlar inceleme modunda kullanılamaz.

### Katmanlar

Katman açma/kapama, donma/çözme, kilitleme, izolasyon vb. katman işlemleri.

### Düzenle

Move, Copy, Offset vb. düzenleme komutları.

### Ölçüm

Mesafe, açı, alan, yay uzunluğu, sürekli ölçüm, koordinat noktası. Ayrıntılar için [Ölçüm Genel Bakış](/tr/guide/measure/overview).

### Açıklama

Ok, bulut çizgisi, dikdörtgen, daire, metin, Callout (etiket), vurgu, damga vb. Ayrıntılar için [Açıklama Genel Bakış](/tr/guide/markup/overview).

## Sağ Araç Çubuğu

Tuvalin sağında yüzen dikey araç çubuğu, sık kullanılan araçlara hızlı erişim sağlar:

- **Seç**: Varlıkları seç ve taşı
- **Kaydır**: Görünümü sürükleyerek kaydır
- **Tüm çizime sığdır**: Tüm grafikleri ortalanmış göster
- **Pencere yakınlaştırma**: Seçilen bölgeye yakınlaştır
- **Katman yönetimi**: Katmanlar panelini aç
- **Arka plan değiştir**: Açık/koyu arka plan değiştir
- **Okuma modu**: Odaklanmış okuma için tam ekran moduna gir
- **Ölçüm araç grubu**: Ölçüm araçları panelini aç
- **Açıklama araç grubu**: Açıklama araçları panelini aç (inceleme modunda görüntülenir)

## Yerleştirilebilir Paneller

Paneller tuvalin sağına yerleştirilebilir veya yüzen pencere olarak sürüklenebilir. Sık kullanılan paneller:

| Panel | Açıklama |
|---|---|
| Katmanlar | Tüm katmanları listeler; açma/kapama, kilitleme, donma, izolasyon vb. işlemleri destekler |
| Özellikler | Seçili varlığın özellik bilgilerini gösterir |
| Ölçüm listesi | Geçerli çizimdeki tüm ölçüm öğelerini listeler; tıklayarak ilgili ölçüme konumlanılabilir |
| İnceleme (Açıklama) | Tüm açıklamaları listeler; açıklama meta verilerini düzenleme, temizleme vb. destekler |
| İstatistik | Çizimdeki blok kullanımını sayısal olarak gösterir |
| Eksik kaynaklar | Çizimde eksik olan yazı tiplerini veya dış referansları bildirir |

## Durum Çubuğu

Durum çubuğu arayüzün alt kısmında bulunur, soldan sağa sırasıyla:

| Alan | Açıklama |
|---|---|
| Düzen sekmeleri | Model uzayı / Düzenler değişimi |
| Koordinat | Geçerli imleç konumu koordinatını gösterir (yalnızca masaüstü) |
| OSNAP | Nesne yakalama modu açma/kapama ve yapılandırma |
| ORTHO | Dik mod açma/kapama |
| POLAR | Kutupsal izleme açma/kapama ve açı artışı |
| Çizgi genişliği görüntüleme | Çizgi genişliklerinin gösterilip gösterilmeyeceğini kontrol eder |
| Dinamik girdi | Dinamik girdi açma/kapama |
| Tema değiştir | Açık/koyu tema |
| Tam ekran | Tam ekran modu |

## İnceleme Modu

Bir açıklama komutu çalıştırıldığında, görüntüleyici otomatik olarak **inceleme moduna** geçer. Bu sırada DWG/DXF arka planı salt okunur olur ve tüm açıklamalar ve ölçümler üst katman olarak görüntülenir. Açıklama komutundan çıkıldıktan sonra, elle düzenleme moduna geri değiştirilene kadar inceleme modunda kalınır.

İnceleme modunda, açıklama komutları otomatik kullanılabilir olur; düzenleme modunda ise açıklama araçlarının elle etkinleştirilmesi gerekir.
