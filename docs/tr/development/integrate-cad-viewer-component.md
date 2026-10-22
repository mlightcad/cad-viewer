---
title: "CAD Viewer Bileşeni Entegrasyonu"
---

# CAD Viewer Bileşeni Entegrasyonu

**cad-viewer**, CAD dosyalarını (DXF, DWG) **herhangi bir arka uç sunucusuna ihtiyaç duymadan tamamen tarayıcıda** görüntülemek ve düzenlemek için **yüksek performanslı** bir Vue 3 bileşenidir. Modern bir kullanıcı arayüzü, durum yönetimi ve optimize edilmiş işleme motorlarıyla sorunsuz entegrasyon sunarak olağanüstü performansla akıcı tarayıcı tabanlı CAD iş akışları sağlar.

## Temel Özellikler

- Akıcı 60+ FPS işleme ile **yüksek performanslı** CAD düzenleme ve görüntüleme
- **Arka uç gerekmez** - Dosyalar tamamen tarayıcıda ayrıştırılır ve işlenir
- **Gelişmiş veri güvenliği** - Dosyalar asla cihazınızdan ayrılmaz ve tam gizlilik sağlar
- **Yerel dosya desteği** - DWG/DXF dosyalarını dosya iletişim kutusu veya sürükle-bırak ile doğrudan bilgisayarınızdan yükleyin
- **Uzak dosya desteği** - CAD dosyalarını URL'lerden otomatik olarak yükleyin
- **Kolay entegrasyon** - Üçüncü taraf entegrasyonu için sunucu kurulumu veya arka uç altyapısı gerekmez
- **Özelleştirilebilir UI** - Araç çubuklarının, komut satırının, koordinatların ve performans istatistiklerinin görünürlüğünü kontrol edin
- **Özelleştirilebilir Kaynaklar** - Yazı tipleri, şablonlar ve örnek dosyalar için özel temel URL'ler belirleyin
- Büyük CAD dosyalarını işlemek için optimize edilmiş modern UI
- Katmanlar, varlıklar ve ayarlar için durum yönetimi
- Optimize edilmiş SVG ve THREE.js işleyicileriyle entegrasyon
- İletişim kutuları, araç çubukları ve komut satırı arayüzü
- Yüksek performanslı CAD görüntüleyicileri kendi uygulamalarınıza gömmek için Vue 3 bileşeni

## cad-viewer'ı Ne Zaman Seçmelisiniz?

CAD dosyalarını modern bir UI, iletişim kutuları, araç çubukları ve durum yönetimiyle görüntülemek ve düzenlemek için **kullanıma hazır bir Vue 3 bileşeni** istiyorsanız `cad-viewer` kullanın. Bu paket şu durumlarda idealdir:

- Yüksek performanslı bir CAD görüntüleyici/düzenleyiciyi minimum kurulumla Vue uygulamanıza hızlıca gömmek istiyorsanız.
- Hem yerel dosya yükleme (kullanıcının bilgisayarından) hem de uzak dosya yükleme (URL'lerden) desteğine ihtiyaç duyuyorsanız.
- Dosya yükleme, işleme, katman/varlık yönetimi ve kullanıcı etkileşimlerini hazır olarak ele alan bir çözüme ihtiyaç duyuyorsanız.
- Optimize edilmiş SVG ve THREE.js işleyicileri, uluslararasılaştırma ve tema desteğiyle sorunsuz entegrasyon istiyorsanız.
- Kendi UI'ınızı sıfırdan oluşturmak **istemiyorsanız**.

**Şunlar için önerilir:** CAD dosyalarını cilalı bir kullanıcı arayüzüyle göstermesi gereken çoğu web uygulaması, kontrol paneli veya platform.

## Yalnızca Tarayıcı Mimarisi

Bu Vue 3 bileşeni, **arka uç bağımlılığı olmadan** tamamen tarayıcıda çalışır. DWG/DXF dosyaları WebAssembly ve JavaScript kullanılarak yerel olarak ayrıştırılır ve işlenir; bu da şunları sağlar:

- **Sunucu gereksinimi yok** - Bileşeni yalnızca statik dosya barındırma ile her yere dağıtın
- **Tam veri gizliliği** - İster yerel olarak ister URL'lerden yüklenmiş olsun, CAD dosyaları asla kullanıcının cihazından ayrılmaz
- **Yerel dosya desteği** - Kullanıcılar dosyaları yerleşik dosya iletişim kutusunu kullanarak doğrudan bilgisayarlarından yükleyebilir
- **Uzak dosya desteği** - Sağlandığında dosyaları URL'lerden otomatik olarak yükler
- **Anında entegrasyon** - Karmaşık arka uç kurulumu veya API yapılandırması gerekmez
- **Çevrimdışı çalışabilme** - Yüklendikten sonra internet bağlantısı olmadan çalışır
- **Üçüncü taraflarla uyumlu** - Sunucu tarafı kaygıları olmadan herhangi bir Vue 3 uygulamasına kolayca gömülebilir

## Dosya Yükleme Yöntemleri

MlCadViewer bileşeni, CAD dosyalarını yüklemenin birden çok yolunu destekler:

### 1. Yerel Dosya Yükleme
Kullanıcılar dosyaları doğrudan bilgisayarlarından yükleyebilir:
- **Dosya İletişim Kutusu**: Ana menüye (☰) tıklayın ve yerel DWG/DXF dosyalarına göz atmak ve seçmek için "Aç" öğesini seçin
- **Sürükle ve Bırak**: CAD dosyalarını doğrudan görüntüleyiciye sürükleyip bırakın (uygulamanızda uygulanmışsa)
- **Dosya Girdisi**: Programatik dosya seçimi için yerleşik dosya okuyucu bileşenini kullanın
- **Bileşen Prop'u**: Otomatik yükleme için bir `File` nesnesini doğrudan `localFile` prop'una aktarın

#### Örnek: Dosya girdisiyle localFile prop'unu kullanma
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. Uzak Dosya Yükleme
Dosyaları URL'lerden otomatik olarak yükleyin:
- **URL Prop'u**: Bileşen bağlandığında bir dosyayı otomatik olarak yüklemek için bir `url` prop'u sağlayın
- **Dinamik Yükleme**: Bileşeni yeniden bağlamadan farklı dosyaları yüklemek için `url` prop'unu değiştirin

### 3. Desteklenen Dosya Biçimleri
- **DWG dosyaları**: İkili AutoCAD çizim biçimi (ArrayBuffer olarak okunur)
- **DXF dosyaları**: ASCII/ikili AutoCAD çizim değişim biçimi (metin olarak okunur)

## Kurulum

```bash
npm install @mlightcad/cad-viewer
```

## Kullanım

Bir örnek olarak `cad-viewer-example` alt paketine başvurun.

### Temel Kullanım

Öncelikle aşağıdaki bağımlılıkları package.json dosyanıza ekleyin.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

Ardından aşağıdaki gibi bir Vue bileşeni oluşturun.

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer Bileşeni

`MlCadViewer`, eksiksiz bir CAD görüntüleme ve düzenleme arayüzü sağlayan ana Vue 3 bileşenidir. Tam özellikli bir CAD deneyimi için araç çubukları, katman yönetimi, komut satırı, durum çubuğu ve çeşitli iletişim kutuları içerir.

### Bileşen Özellikleri (Props)

`MlCadViewer` bileşeni aşağıdaki prop'ları kabul eder:

| Özellik             | Tür                         | Varsayılan  | Açıklama                                                                                                                                                 |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | UI dili. `'default'` tarayıcının yerel ayarını kullanır. Hem görüntüleyici UI'sini hem de Element Plus bileşenlerini etkiler.                              |
| `url`               | `string`                    | `undefined` | Bir CAD dosyasının (DWG/DXF) uzak URL'si. Sağlanırsa, dosya bağlanma sırasında getirilir ve otomatik olarak açılır. Bu prop'un güncellenmesi dosyayı dinamik olarak yeniden yükler. |
| `localFile`         | `File`                      | `undefined` | `File` nesnesi olarak yerel CAD dosyası. Bağlanma sırasında otomatik olarak açılır ve değiştirildiğinde yeniden yüklenir. Her ikisi de sağlanırsa **`url` yerine geçer**. |
| `background`        | `number`                    | `undefined` | CAD görünümünün arka plan rengi; 24 bit onaltılık RGB değeri olarak (ör. `0x000000`). Değiştirildiğinde dinamik olarak güncellenir.                       |
| `baseUrl`           | `string`                    | `undefined` | Yazı tipleri, şablonlar ve örnek dosyalar gibi harici kaynakları yüklemek için kullanılan temel URL. Varlıkları bir CDN'de barındırırken kullanışlıdır.      |
| `useMainThreadDraw` | `boolean`                   | `false`     | İşleme modunu kontrol eder. `false` Web Workers kullanır (büyük çizimler için önerilir). `true` işlemeyi ana iş parçacığında zorlar.                         |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | Görüntüleyicinin başlangıç teması. Koyu ve açık modlar arasında geçiş yapmak için dinamik olarak güncellenebilir.

### Bileşen Olayları

`MlCadViewer`, üst bileşenlerin görüntüleyicinin oluşturulmasına ve yok edilmesine bağlanabilmesi için yaşam döngüsü olayları yayar.

| Olay      | Yük     | Açıklama                                                                             |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | CAD görüntüleyici tamamen başlatıldıktan ve kullanıma hazır olduktan sonra yayılır.   |
| `destroy` | `void`  | CAD görüntüleyici yok edilmeden ve dahili kaynaklar serbest bırakılmadan hemen önce yayılır. |

### UI Ayarları

`MlCadViewer`, UI görünürlüğünü genel `AcApSettingManager` (`@mlightcad/cad-simple-viewer` tarafından sağlanır) üzerinden okur. UI'ı özelleştirmek için görüntüleyiciyi işlemeden önce bu bayrakları herhangi bir yerde yapılandırın.

| Ayar                     | Tür       | Varsayılan | Açıklama                                                                  |
| ------------------------ | --------- | ---------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`     | Ana araç çubuğunun görünürlüğünü kontrol eder                             |
| `isShowMainMenu`         | `boolean` | `true`     | Ana menünün görünürlüğünü kontrol eder                                    |
| `isShowCommandLine`      | `boolean` | `true`     | Komut satırı arayüzünün görünürlüğünü kontrol eder                        |
| `isShowCoordinate`       | `boolean` | `true`     | Koordinat göstergesinin görünürlüğünü kontrol eder                        |
| `isShowEntityInfo`       | `boolean` | `true`     | Varlık bilgisi kartının görünürlüğünü kontrol eder                        |
| `isShowFileName`         | `boolean` | `true`     | Açık dosyanın adının gösterilip gösterilmeyeceğini kontrol eder           |
| `isShowLanguageSelector` | `boolean` | `true`     | Dil seçicinin görünürlüğünü kontrol eder                                  |
| `isShowStats`            | `boolean` | `false`    | Performans istatistiklerinin (FPS, işleme süresi vb.) görünürlüğünü kontrol eder

#### Örnek (önerilen)
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### Notlar

- Ayarlar geneldir ve `MlCadViewer` tarafından anında yansıtılır.
- Aynı `AcApSettingManager.instance` referansını kullanarak bunları çalışma zamanında değiştirebilirsiniz.

### Temel URL Yapılandırması

`baseUrl` özelliği, CAD görüntüleyicinin yazı tiplerini, şablonları ve örnek dosyaları nereden yükleyeceğini özelleştirmenize olanak tanır. Bu özellikle şunlar için kullanışlıdır:

- **Kendinde barındırılan kaynaklar**: Kendi yazı tiplerinizi ve şablonlarınızı CDN'inizde veya sunucunuzda barındırın
- **Kurumsal ortamlar**: CAD kaynakları için dahili sunucular kullanın
- **Çevrimdışı dağıtımlar**: Kaynakları yerel dosya sistemlerinden sunun
- **Özel markalandırma**: Kendi şablonlarınızı ve yazı tiplerinizi kullanın

#### Varsayılan Davranış
`baseUrl` sağlanmazsa, görüntüleyici varsayılan URL'yi kullanır: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

#### Kaynak Yapısı
Özel bir `baseUrl` kullanırken sunucunuzun aşağıdaki yapıya sahip olduğundan emin olun:
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### Örnek: Özel Temel URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

Bu yapılandırma şunları yapar:
- Yazı tiplerini `https://my-company.com/cad-resources/fonts/` adresinden yükler
- Şablonları `https://my-company.com/cad-resources/templates/` adresinden yükler
- Tüm "Quick New" işlemleri için özel temel URL'yi kullanır

### Bileşen İşlevleri

`MlCadViewer` bileşeni şunları içerir:

- **Ana Menü** - Dosya işlemleri (yerel dosya açma dahil), görünüm kontrolleri ve ayarlar
- **Araç Çubukları** - Çizim araçları, yakınlaştırma kontrolleri ve seçim araçları
- **Katman Yöneticisi** - Katman görünürlüğü ve özellik yönetimi
- **Komut Satırı** - AutoCAD tarzı komut girdisi
- **Durum Çubuğu** - Geçerli konum, yakınlaştırma düzeyi ve sistem durumu
- **İletişim Kutusu Yöneticisi** - Çeşitli işlemler için kalıcı iletişim kutuları
- **Dosya Okuyucu** - Dosya iletişim kutusu ve sürükle-bırak desteğiyle yerel dosya yükleme
- **Varlık Bilgisi** - Seçili varlıklar hakkında ayrıntılı bilgi
- **Dil Seçici** - UI dili değiştirme
- **Tema Desteği** - Koyu/açık mod geçişi

### Olay İşleme

Bileşen çeşitli olayları otomatik olarak işler:

- **Dosya Yükleme** - Yerel dosya yüklemeyi (dosya iletişim kutusu aracılığıyla), sürükle-bırak ve URL tabanlı dosya yüklemeyi destekler
- **Hata Mesajları** - Başarısız işlemler için kullanıcı dostu hata mesajları gösterir
- **Yazı Tipi Yükleme** - Eksik yazı tiplerini uygun bildirimlerle işler
- **Sistem Mesajları** - Durum güncellemelerini ve işlem geri bildirimlerini gösterir

### İleri Düzey Kullanım

Aşağıdaki ileri düzey kullanımları öğrenmek için [CAD Viewer Bileşeni Entegrasyonu](./) sayfasına bakın.

- DWG biçimindeki çizimleri görüntülemek için DWG dönüştürücüsünü kaydetme
- Yazı tiplerini kendi sunucunuzdan yüklemek için kendi yazı tipi yükleyicinizi tanımlama
- Çizim oluşturma veya çizim değiştirme

## Kullanılabilir Dışa Aktarımlar

### Ana Bileşen

- `MlCADViewer` - Ana CAD görüntüleyici bileşeni

### Komutlar

- `AcApLayerStateCmd` - Katman durumu komutu
- `AcApLogCmd` - Günlük komutu
- `AcApMissedDataCmd` - Eksik veri komutu
- `AcApPointStyleCmd` - Nokta stili komutu

### Bileşenler

- `MlPointStyleDlg` - Nokta stili iletişim kutusu
- `MlReplacementDlg` - Değiştirme iletişim kutusu
- Çeşitli yerleşim ve UI bileşenleri

### Composable'lar

- `useCommands` - Komut yönetimi
- `useCurrentPos` - Geçerli konum izleme
- `useDark` - Koyu mod desteği
- `useDialogManager` - İletişim kutusu yönetimi
- `useFileTypes` - Dosya türü yardımcıları
- `useLayers` - Katman yönetimi
- `useLayouts` - Yerleşim yönetimi
- `useMissedData` - Eksik veri işleme
- `useSettings` - Ayar yönetimi
- `useSystemVars` - Sistem değişkenleri

### Yerel Ayarlar

- `i18n` - Uluslararasılaştırma örneği
- İngilizce ve Çince dil dosyaları

### Stiller

- Stil verme için CSS ve SCSS dosyaları
- Koyu mod desteği
- Element Plus entegrasyonu
