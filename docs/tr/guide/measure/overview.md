---
title: Ölçüm Genel Bakış
---

# Ölçüm Genel Bakış

Ölçüm komutları, çizim üzerinde geçici ölçümler yapmak için kullanılır. Tüm ölçüm sonuçları HTML üst katmanı olarak görüntülenir ve **DWG/DXF dosyasına yazılmaz**; bağımsız olarak dışa aktarılıp paylaşılabilir.

## Ölçüm Oluşturma

Komutu seçtikten sonra, isteme göre gerekli noktaları sırayla tıklatın. Sürükleme sırasında gerçek zamanlı önizleme (lastik bant + ölçüm değeri rozeti) görüntülenir.

## Ölçümü Düzenleme

- Ölçüm nesnesine **tıkla** ve seç, grip noktaları görüntülenir
- **Grip noktasını sürükle** ölçümü ayarlar; değer gerçek zamanlı güncellenir

## Geri Al / Yinele

Ölçüm işlemleri geri almayı ve yinelemeyi destekler.

## Birim ve Duyarlılık

Ölçüm değerlerinin görüntülenen birimi ve duyarlılığı ayarlardan değiştirilebilir; milimetre / santimetre / metre / feet / inç vb. desteklenir. Bu ayarlar orijinal DWG/DXF dosyasını etkilemez, yalnızca ölçüm görüntülemesini etkiler.

## İçe / Dışa Aktarma

Ölçüm verileri bir JSON sidecar dosyası olarak dışa aktarılabilir (`çizimAdı.measurement.json`); çizimler ve cihazlar arasında paylaşılması için uygundur. İçe aktarıldığında tüm ölçüm nesneleri ve bunların biçimleri otomatik olarak geri yüklenir.
