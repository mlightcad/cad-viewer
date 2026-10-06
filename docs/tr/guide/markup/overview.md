---
title: Açıklama Genel Bakış
---

# Açıklama Genel Bakış

Açıklama komutları, çizim üzerine inceleme işaretleri eklemek için kullanılır. Bir açıklama komutu çalıştırıldığında, görüntüleyici otomatik olarak **inceleme moduna** geçer (DWG/DXF arka planı salt okunur).

Tüm açıklamalar HTML üst katmanı olarak çizilir ve **orijinal DWG/DXF dosyasını değiştirmez**. Bunlar bir JSON sidecar dosyası (`çizimAdı.markup.json`) ile bağımsız olarak kaydedilir ve paylaşılır.

## Açıklama Oluşturma

Çoğu açıklama komutu, CAD tarzı adımlı nokta seçimi etkileşimini kullanır:

1. Komutu seç (şerit → Açıklama grubu, veya sağ araç çubuğu açıklama paneli)
2. Komut istemine göre gerekli noktaları sırayla tıklat
3. Sürükleme sırasında gerçek zamanlı önizleme (Jig)
4. Tamamlandığında açıklama anında tuvalde görüntülenir

## Açıklamayı Düzenleme

- Açıklamaya **tıkla** ve seç, grip düzenleme noktaları görüntülenir
- **Grip noktasını sürükle** şekli, uç noktaları vb. ayarlayabilirsin
- Metin içeren açıklamaya **çift tıkla** (metin, Callout, ek Callout içeren şekiller) satır içi metin düzenlemesine girer
- Seçtikten sonra **Delete** tuşuna basarak sil

## Geri Al / Yinele

Açıklama işlemleri geri almayı ve yinelemeyi destekler. Geri alma yalnızca oluşturma işlemini değil, grip düzenlemesi, silme vb. değişiklikleri de geri alır.

## İçe / Dışa Aktarma

- **Dışa aktarma**: Tüm mevcut açıklamaları JSON dosyası olarak dışa aktar ve indir
- **İçe aktarma**: Daha önce dışa aktarılan JSON dosyasını yükle, tüm açıklamaları geri yükle

Sidecar JSON dosyası çizimler ve cihazlar arasında paylaşılabilir.
