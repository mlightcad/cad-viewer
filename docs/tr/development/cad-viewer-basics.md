---
title: "MLightCAD Temelleri"
---

# MLightCAD Temelleri

Bu proje, kullanıcılar için `cad-viewer` ve `cad-simple-viewer` olmak üzere iki görüntüleyici sunar. Hangi görüntüleyicinin seçileceği, proje gereksinimlerinize ve istediğiniz entegrasyon düzeyine bağlıdır:

## **cad-viewer**'ı şu durumlarda kullanın:

- Modern bir UI, iletişim kutuları, araç çubukları ve durum yönetimi içeren **kullanıma hazır bir Vue 3 bileşeni** istiyorsanız.
- Yüksek performanslı bir CAD görüntüleyici/düzenleyiciyi minimum kurulumla Vue uygulamanıza hızlıca gömmek istiyorsanız.
- Dosya yükleme, işleme, katman/varlık yönetimi ve kullanıcı etkileşimlerini hazır olarak ele alan bir çözüm tercih ediyorsanız.
- Optimize edilmiş SVG ve THREE.js işleyicileri, uluslararasılaştırma ve tema desteğiyle sorunsuz entegrasyon istiyorsanız.
- Kendi UI'ınızı sıfırdan oluşturmak **istemiyorsanız**.

**Şunlar için önerilir:** CAD dosyalarını cilalı bir kullanıcı arayüzüyle göstermesi gereken çoğu web uygulaması, kontrol paneli veya platform.

## **cad-simple-viewer**'ı şu durumlarda kullanın:

- Herhangi bir UI çerçevesi bağımlılığı olmadan **yalnızca temel CAD mantığına** (belge yönetimi, komut yığını, işleme motoru entegrasyonu) ihtiyaç duyuyorsanız.
- **Kendi özel UI'ınızı** oluşturmak veya CAD işlevselliğini Vue dışı ya da web dışı bir ortama entegre etmek istiyorsanız.
- Büyük CAD dosyalarını işlemek için maksimum esneklik ve performans gerekiyor ve mantığı kendi işleme veya UI katmanınıza bağlamayı planlıyorsanız.
- Yalnızca temel CAD işlemlerini ve canvas işlemesini sunan, çerçeveden bağımsız bir çözüm istiyorsanız.

**Şunlar için önerilir:** Özel entegrasyonlar, başsız (headless) CAD işleme veya son derece özelleştirilmiş CAD çözümleri geliştiren ileri düzey kullanıcılar.

**Özet Tablo:**

| Paket               | Sağlanan UI | Çerçeve | Kullanım Durumu                               |
|---------------------|-------------|---------|-----------------------------------------------|
| `cad-viewer`        | Evet        | Vue 3   | Modern UI içeren kullanıma hazır CAD görüntüleyici/düzenleyici |
| `cad-simple-viewer` | Hayır       | Yok     | Özel veya başsız kullanım için temel CAD mantığı |

Daha fazla ayrıntı için [**Simple Viewer Entegrasyonu**](./integrate-simple-cad-viewer) ve [**Vue Bileşeni Entegrasyonu**](./integrate-cad-viewer-component) sayfalarına bakın.

## Örnekler

- [`cad-simple-viewer-demo`](https://github.com/mlightcad/cad-simple-viewer-example): `cad-simple-viewer` bileşeninin gerçek bir projede nasıl kullanılacağını gösteren örnek uygulama.
- [`cad-editor-demo`](https://github.com/mlightcad/cad-viewer-example): `cad-viewer` bileşeninin gerçek bir projede nasıl kullanılacağını gösteren örnek uygulama.
