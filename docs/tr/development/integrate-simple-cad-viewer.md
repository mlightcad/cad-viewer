---
title: "Simple Viewer Entegrasyonu"
---

# Simple Viewer Entegrasyonu

**cad-simple-viewer**, bir CAD görüntüleyicinin belge yönetimi, komut işleme ve UI ile işleme motorları arasındaki işbirliği gibi **yüksek performanslı** temel bileşenlerini sağlar. Büyük CAD dosyalarını işlerken optimum performans için tasarlanmıştır.

Bu modül herhangi bir UI çerçevesine bağımlı değildir ve canvas dışında UI sağlamaz. Yüksek performanslı bir CAD görüntüleyiciyi kendi UI'ınızla bir web uygulamasına entegre etmek istiyorsanız, bu modül doğru seçimdir.

## Temel Özellikler
- Büyük dosyalar için optimize edilmiş belge yönetimi
- Verimli komut yığını ve geri al/yinele işlemleri
- İşleme motorlarıyla optimize edilmiş entegrasyon
- Performans odaklı ayarlar ve bağlam yönetimi
- Maksimum esneklik için çerçeveden bağımsız tasarım

## cad-simple-viewer'ı Ne Zaman Seçmelisiniz?

Herhangi bir UI çerçevesi bağımlılığı olmadan **yalnızca temel CAD mantığına** (belge yönetimi, komut yığını, işleme motoru entegrasyonu) ihtiyaç duyuyorsanız `cad-simple-viewer` kullanın. Bu paket şu durumlarda idealdir:

- **Kendi özel UI'ınızı** oluşturmak veya CAD işlevselliğini Vue dışı ya da web dışı bir ortama entegre etmek istiyorsanız.
- Büyük CAD dosyalarını işlemek için maksimum esneklik ve performans gerekiyor ve mantığı kendi işleme veya UI katmanınıza bağlamayı planlıyorsanız.
- Yalnızca temel CAD işlemlerini ve canvas işlemesini sunan, çerçeveden bağımsız bir çözüm istiyorsanız.

**Şunlar için önerilir:** Özel entegrasyonlar, başsız (headless) CAD işleme veya son derece özelleştirilmiş CAD çözümleri geliştiren ileri düzey kullanıcılar.

## Kurulum

```bash
npm install @mlightcad/cad-simple-viewer
```

## Kullanım

Temel kullanım ve ileri düzey kullanım için [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) sayfasına bakın.

`cad-simple-viewer` çizimleri DWG/DXF dosyalarına kaydetmeyi desteklemezken, **çizimleri gerçek zamanlı olarak değiştirme** konusunda kapsamlı destek sunar. Çizim içindeki varlıkları ekleyebilir, düzenleyebilir ve silebilirsiniz; görüntüleyici bu değişiklikleri yansıtmak için otomatik olarak güncellenir.

Varlıkları değiştirdiğinizde, doğrudan altta yatan çizim veritabanıyla çalışırsınız. Görüntüleyici bu değişiklikleri otomatik olarak algılar ve görünümü buna göre günceller. Bu gerçek zamanlı senkronizasyon şunları sağlar:

- Tüm değişiklikler anında görünür
- Komut yığını, geri al/yinele işlemleri için değişiklikleri düzgün biçimde izler. Bu yakında uygulanacaktır.

Bu yetenek, `cad-simple-viewer`'ı yalnızca CAD dosyalarını görüntülemekle kalmayıp aynı zamanda kullanıcıların çizim içeriğiyle etkileşim kurmasına ve onu değiştirmesine olanak tanıyan uygulamalar için uygun hale getirir.

**Önemli Not**: `cad-simple-viewer` içindeki kullanım kalıpları **AutoCAD RealDWG'ye çok benzer**. AutoCAD RealDWG geliştirmesine aşinaysanız, API yapısını ve iş akışını neredeyse aynı bulacaksınız. Temel fark, yerel RealDWG kitaplıkları yerine [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) kullanmamızdır.

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) projesinde [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) ile nasıl çizim oluşturulacağı gösterilmektedir.

## Kullanılabilir Dışa Aktarımlar

### Temel Sınıflar

- `AcApContext` - Ana uygulama bağlamı
- `AcApDocManager` - Belge yönetimi
- `AcApDocument` - Tekil belge işleme
- `AcApSettingManager` - Ayar yönetimi

### Komutlar

- `AcApOpenCmd` - Dosya açma komutu
- `AcApZoomCmd` - Yakınlaştırma komutu
- `AcApPanCmd` - Kaydırma komutu
- `AcApSelectCmd` - Seçim komutu
- `AcApConvertToSvgCmd` - SVG dönüştürme komutu

### Düzenleyici Bileşenleri

- `AcEditor` - Ana düzenleyici sınıfı
- `AcEdCommandStack` - Komut yığını yönetimi
- `AcEdSelectionSet` - Seçim işleme
- `AcEdInputPoint` - Girdi noktası yönetimi

### Görünüm Bileşenleri

- `AcTrScene` - Sahne yönetimi
- `AcTrLayoutView` - Yerleşim görünümü işleme
- `AcTrView2d` - 2D görünüm yönetimi

## MLightCAD İçindeki Rolü

Bu paket, ön uç UI'ı işleme motorlarına bağlayan ve belgeyle ilgili tüm işlemleri yöneten temel mantık katmanı olarak işlev görür.
