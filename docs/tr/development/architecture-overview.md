---
title: "Mimariye Genel Bakış"
---

# Mimariye Genel Bakış

MLightCAD, **arka uç bağımlılığı olmadan** tamamen tarayıcıda çalışır. DWG/DXF dosyaları WebAssembly ve JavaScript kullanılarak yerel olarak ayrıştırılır ve işlenir; bu da şunları sağlar:

- **Sunucu gereksinimi yok** - Yalnızca statik dosya barındırma ile her yere dağıtın
- **Tam veri gizliliği** - Dosyalar asla kullanıcının cihazından ayrılmaz
- **Anında entegrasyon** - Karmaşık arka uç kurulumu veya API yapılandırması yok
- **Çevrimdışı çalışabilme** - İnternet bağlantısı olmadan çalışır

MLightCAD, her biri sistemin belirli bir yönünden sorumlu olan birkaç alt pakete ayrılmıştır:

- **cad-viewer**: UI bileşenleri, iletişim kutuları, araç çubukları, durum yönetimi ve işleme motorlarıyla entegrasyon dahil olmak üzere ana Vue 3 bileşeni ve ön uç uygulaması.
- **cad-simple-viewer**: Belge yönetimi, komut işleme ve UI ile işleme motorları arasındaki entegrasyon için temel mantık. Çerçeveden bağımsız ve UI içermez (yalnızca canvas).
- **svg-renderer**: Dışa aktarma ve ölçeklenebilir 2D çıktı için DWG/DXF varlıklarını SVG grafikleri olarak işler.
- **three-renderer**: Gelişmiş görselleştirme ve özel gölgelendiricilerle DWG/DXF varlıklarını etkileşimli 2D/3D grafikler olarak işlemek için THREE.js kullanır.

## Mimariye Genel Bakış

**MLightCAD**, birden çok CAD veri biçimini yükleme, ayrıştırma, işleme ve bunlarla etkileşim kurmayı desteklemek için modüler ve genişletilebilir bir mimari benimseyen, yüksek performanslı, yalnızca tarayıcıda çalışan bir DWG/DXF görüntüleyicisidir. Sistem aşağıdaki temel katmanlara ayrılmıştır:

![Mimariye Genel Bakış](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

Bu katmanlı mimari, **MLightCAD**'ın farklı veri ölçekleri, işleme gereksinimleri ve dağıtım ortamlarıyla uğraşırken yüksek performansı, düşük gecikmeyi ve güçlü ölçeklenebilirliği koruyabilmesini sağlar.

### **Model Katmanı**

- [`realdwg-web`](https://github.com/mlightcad/realdwg-web) içindeki [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) modülü aracılığıyla ayrıştırılmış CAD verilerini (geometrik varlıklar, katman bilgileri, görünüm parametreleri vb. dahil) tanımlamak için birleşik bir **Veri Modeli** tanımlar.
- Farklı dönüştürücülerin CAD verilerini birleşik Veri Modeli'ne dönüştürmesini sağlayan birleşik bir CAD dosya dönüştürme arayüzünü [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts) aracılığıyla uygular.
- `realdwg-web` içindeki [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) modülü aracılığıyla DWG ayrıştırma yetenekleri sunar ve DWG dosyalarını birleşik Veri Modeli'ne dönüştürür.
- [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json) modülü aracılığıyla DXF ayrıştırma yetenekleri sunar ve DXF dosyalarını birleşik Veri Modeli'ne dönüştürür.
- `realdwg-web` içindeki [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) modülü aracılığıyla çeşitli geometrik hesaplamaları (noktalar, çizgiler, çoklu çizgiler, spline'lar, daireler, yaylar, elipsler, eliptik yaylar) ve matematiksel işlemleri (vektörler, matrisler vb.) destekleyen bir geometri motoru sunar.

`AcDbDatabaseConverter` arayüzünü neden tanımladığımıza dair kısa bir not: piyasadaki mevcut DXF/DWG okuma/yazma ve dönüştürme araçları genellikle eksiktir. `@mlightcad/libredwg-converter` ve `@mlightcad/dxf-json` paketlerini bazı açık kaynak kodlara dayanarak uyguladım. Ancak mevcut en iyi DWG/DXF ayrıştırma ve dönüştürme aracı aslında [ODA](https://www.opendesign.com/products/drawings)'dır. Bunu kullanmak için kaynak koduna erişmek üzere bir lisans satın almanız gerekir; bu kaynak koddan DXF/DWG'yi `@mlightcad/data-model` içinde tanımlanan birleşik Veri Modeli'ne dönüştüren bir WebAssembly modülü oluşturabilirsiniz. Biri ODA'nın kaynak kodunu benimle paylaşırsa, ona dayalı bir dönüştürücü de uygulayabilirim.

### **İşleme Katmanı**

- Çeşitli CAD varlık türlerini işlemek için `realdwg-web` içindeki [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) modülü aracılığıyla birleşik bir işleme arayüzü tanımlar.
- İşleme arayüzünü `cad-viewer` içindeki [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) modülünde uygular ve tüm varlık türlerini işlemek için Three.js kullanır.
- İşleme arayüzünü `cad-viewer` içindeki [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) modülünde uygular ve çizimleri SVG olarak işler.

### **Görünüm Katmanı**

- `cad-viewer` içindeki [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) modülü, CAD dosyaları için belge yönetimi, komut işleme ve UI ile işleme motoru arasında koordinasyon gibi temel görüntüleme mantığını sağlar. Herhangi bir UI çerçevesi bağımlılığı yoktur ve canvas dışında UI öğesi sunmaz.
- [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) modülü, menüler, araç çubukları, komut satırı, durum çubuğu ve hem koyu hem de açık temalar içeren Vue 3 tabanlı bir UI sağlamak için `@mlightcad/cad-simple-viewer` üzerine inşa edilmiştir. Tüm temel özellikleri kolay entegrasyon için bir Vue 3 bileşeninde paketler.

## İşleme Motoru

DXF/DWG dosyalarını işlemek birkaç zorluğu beraberinde getirir:

- Çok sayıda varlık içeren çizimlerin yüksek performanslı işlenmesi.
- AutoCAD'in metin işleme efektlerinin yeniden üretilmesi.
- Çizgi stilleri ve tarama desenlerinin desteklenmesi.

### Yüksek Performanslı İşleme

Büyük çizimlerin yüksek performanslı işlenmesi için anahtar, **Draw Calls** sayısını azaltmak amacıyla noktaları, çizgileri ve yüzeyleri birleştirmektir. THREE.js, üçgen ağlarını birleştirmek için [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) sınıfı aracılığıyla kısmi bir çözüm sunar. Ancak noktaların ve çizgilerin birleştirilmesini desteklemez ve yüzey birleştirmesi bile ihtiyaçlarımızı tam olarak karşılamaz. Bu nedenle, noktaları, çizgileri ve yüzeyleri birleştirmek için `BatchedMesh`'ten esinlenerek birkaç sınıf uyguladık. [Kodu burada](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch) inceleyebilirsiniz.

### Metin İşleme

AutoCAD, zengin metin için [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) biçimini ve daha hızlı işleme için özel bir [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) yazı tipini (yalnızca çizgilerle çizilen kontur tabanlı bir yazı tipi) kullanır. Başlıca zorluklar şunlardır:

- **MText ayrıştırma** – [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser) paketiyle uygulanır.
- **SHX yazı tiplerini ayrıştırma** – [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser) paketiyle uygulanır.
- **MText işleme** – [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer) paketiyle uygulanır. Performans için ayrıştırılmış yazı tipi dosyaları tarayıcının IndexedDB'sinde önbelleğe alınır; böylece bir kez indirilip ayrıştırıldıktan sonra sonraki işlemeler daha hızlı olur.

Metin işlemeyi hata ayıklamak için THREE.js tabanlı bir zengin metin düzenleyicisi olan [mtext-editor](https://github.com/mlightcad/mtext-editor) geliştirdik. Şu anda THREE.js tabanlı başka bir açık kaynak zengin metin düzenleyicisi bulunmadığından, bu herhangi bir işleme motoru için metin düzenleyicisi olarak yeniden kullanılabilir.

### Çizgi Stilleri ve Tarama Desenleri

AutoCAD özel çizgi türlerini ve tarama desenlerini destekler. Bunlardan bazılarını uyguladık (metin içeren çizgi türleri henüz desteklenmiyor). Tüm çizgi stilleri ve tarama efektleri THREE.js'in `ShaderMaterial` sınıfıyla uygulanmıştır. [Kodu burada](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style) inceleyebilirsiniz.
