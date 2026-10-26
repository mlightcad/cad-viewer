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

Temel kullanım ve ileri düzey kullanım için [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) sayfasına bakın.

Entegrasyon iki adımdan oluşur: önce **uygulamayı başlatın** (`AcApDocManager` tekil örneğini bir kez oluşturun), sonra **bir çizim açın**.

### Uygulamayı Başlatma

`AcApDocManager`, `cad-simple-viewer`'ın giriş noktasıdır. Tekil (singleton) olarak çalışır: başlangıçta bir kez `AcApDocManager.createInstance(options)` çağırın, sonra `AcApDocManager.instance` üzerinden erişin. `createInstance` tekrar çağrılırsa yalnızca mevcut örnek döner ve yeni seçenekler uygulanmaz.

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

Tüm seçenekler isteğe bağlıdır ve `AcApDocManagerOptions` arayüzüyle tanımlanır.

#### Tuval ve Yerleşim

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | yeni öğe | Tuvali barındıran HTML kapsayıcı. Atlanırsa yeni bir öğe oluşturulur ve onu kendiniz DOM'a eklemeniz gerekir. |
| `width` | `number` | kapsayıcı genişliği | Piksel cinsinden tuval genişliği. |
| `height` | `number` | kapsayıcı yüksekliği | Piksel cinsinden tuval yüksekliği. |
| `autoResize` | `boolean` | `false` | `true` olduğunda tuval, kapsayıcı boyut değişikliklerini (pencere yeniden boyutlandırma, kenar çubuğu daraltma vb.) otomatik izler. |
| `busyIndicatorHost` | `HTMLElement` | `container` | Meşgul katmanının (ör. dışa aktarma çevirici) gösterileceği host öğe. Maske; şeridi, araç çubuklarını ve durum çubuğunu kaplayabilsin diye görüntüleyici kabuğunu ayarlayın. |

#### İşleme ve Yazı Tipleri

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | MTEXT varlıklarının nerede işleneceğini denetler. `true`: ana iş parçacığı — daha az tepe bellek ama ilk çizim daha yavaş. `false`: Web Worker — daha fazla bellek ama çizim daha hızlı görünür. |
| `preloadDefaultFonts` | `boolean` | `false` | `true` olduğunda varsayılan yedek yazı tipi zinciri başlatma sırasında önceden yüklenir. Varsayılan olarak yazı tipleri metin çizilirken talebe göre yüklenir. |

#### Worker'lar ve Kaynaklar

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | Yazı tipleri ve çizim şablonları gibi çalışma zamanı kaynaklarının alınacağı kök adres. Çevrimdışı veya kendi sunucunuzda barındırma için kendi kaynak kopyanızı gösterin. |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | Worker paket URL'leri: `mtextRender` (MTEXT düzen/glyph Worker) ve `dwgParser` (isteğe bağlı DWG ayrıştırma Worker'ı, hazır olma denetimi için kullanılır). Paketleyiciye özgü tuzaklar için [Worker URL'lerini Yapılandırma](./configure-worker-urls) sayfasına bakın. |
| `checkWorkersOnInit` | `boolean` | `false` | `true` olduğunda yapılandırılan Worker betik URL'leri başlatma sonrası HEAD istekleriyle doğrulanır; sonuç `AcApDocManager.instance.workersReady` ve `workersReady` olayıyla dışa açılır. |

#### Arayüz ve Ürün Anahtarları

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | `false` olduğunda yerleşik OPEN komutunun dosya seçici kurulmaz (kendi açma arayüzünüz varsa kullanışlıdır). |
| `disableExport` | `boolean` | `false` | `true` olduğunda çizim dışa aktarma komutları ve ilgili arayüz girişleri kaydedilmez (`cdxf`, `pngout`, `jpgout`, `bmpout` ve HTML/PDF/SVG dışa aktarma). Bu bir ürün/UX anahtarıdır, DRM değildir — çizim verisi hâlâ bellekte bulunur. |
| `docsBaseUrl` | `string` | MLightCAD belge sitesi | Uygulama içi yardım bağlantılarının kullandığı yerelleştirilmiş kullanıcı kılavuzu kök URL'si. |
| `commandAliases` | `Record<string, string \| string[]>` | yerleşik takma adlar | Komut genel adına göre takma adları geçersiz kılar; örneğin `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`. Listelenmeyen komutlar yerleşik takma adlarını korur. |

#### Eklentiler ve Açma Varsayılanları

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | Başlatma sırasında eklentileri otomatik yükler. `fromConfig` eklenti örneklerini veya fabrika işlevlerini kabul eder; `fromFolder` bir klasörden eklenti dosyaları yükler (`folderPath`, `pluginList`, `continueOnError`). Bkz. [Eklenti Sistemi](./plugin-system). |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` veya `() => AcApOpenDatabaseOptions \| Promise<...>` | – | Yerleşik OPEN iletişim kutusuyla açılan dosyalara uygulanan varsayılan seçenekler. Statik nesne veya senkron/asenkron fabrika olabilir. Sonradan `AcApDocManager.instance.setOpenDocumentDefaults(...)` ile güncellenebilir. |

#### DWG Dönüştürücü Kaydı

`cad-simple-viewer` varsayılan olarak DWG dönüştürücü **kaydetmez** (LibreDWG GPL lisanslıdır). DWG dosyalarını açmak için açmadan önce `@mlightcad/libredwg-converter` gibi bir dönüştürücü kaydedin:

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### Çizim Açma

Belge yöneticisi çizim açmak için iki yol sunar. Her ikisi de dosya başarıyla açıldığında `true` olarak çözülen bir `Promise<boolean>` döndürür:

```typescript
// 1. URL'den açma (dosyayı görüntüleyici indirir)
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. Elinizdeki dosya içeriğinden açma (ör. dosya girişi)
const success = await docManager.openDocument(
  'plan.dwg',               // dosya adının uzantısı DWG mi DXF mi olduğuna karar verir
  await file.arrayBuffer(), // ArrayBuffer biçiminde dosya içeriği
  options
)
```

Her iki yöntem de aynı `AcApOpenDatabaseOptions` nesnesini kabul eder. Atlandığında yönetici `drawNoPlotLayers: false` ve `progressiveRendering: false` uygular. Bu tür, görüntüleyici düzeyi seçenekleri `@mlightcad/data-model` paketindeki temel `AcDbOpenDatabaseOptions` ile birleştirir.

#### Görüntüleyici Seçenekleri

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | Erişim modu: `Read` (0, yalnızca görüntüleme), `Review` (4, inceleme, Read ile uyumlu), `Write` (8, tam okuma/yazma, diğerleriyle uyumlu). Yüksek modlar düşük modlarla uyumludur. Ayrıca varsayılan `openViewMode`'u belirler (aşağıda). |
| `progressiveRendering` | `boolean` | `false` | Çizim hâlâ dönüştürülürken geometrinin çizilip çizilmeyeceğini denetler. `false`: tüm varlıklar dönüştürülene kadar tuval yeniden çizilmez ve açma katmanı, ertelenmiş metin/INSERT glyph işleri bitene kadar ekranda kalır. `true`: varlık dönüşümü olay döngüsü boyunca adım adım yapılır ve geometri parçalar geldikçe boyanır; ayrıştırma ve dönüşüm ilerlemesi bittiğinde kaydırma/yakınlaştırma kullanılabilir olur, kalan geometri arka planda dönüştürülmeye devam eder. Büyük dosyaların etkileşimli görüntülenmesi için `true`, ekran görüntüleri veya belirleyici ilk kare için `false` kullanın. |
| `openViewMode` | `AcApOpenViewMode` | Read/Review için `Extents`, Write için `Saved` | Kullanıcının henüz üzerinde işlem yapmadığı her yerleşimin nasıl çerçeveleneceği. `Extents` (`'extents'`) dönüştürülmüş geometriye yakınlaştırır. `Saved` (`'saved'`) AutoCAD'in kaydettiği görünümü geri yükler (model uzayı VPORT `*ACTIVE` kullanır; kağıt uzayı gerçek viewport'lar varsa yerleşim sınırlarını, yoksa viewport kutusunu kullanır). |
| `sysVars` | `AcApOpenSysVars` | – | Veritabanı açılırken geçersiz kılınacak sistem değişkenleri. Anahtarlar sistem değişkeni adlarıdır (büyük/küçük harf duyarsız); değerler `number`, `boolean`, `string` veya `AcCmColor` olabilir. Sık örnekler: çizgi kalınlıklarını gizlemek için `lwdisplay: false`, kağıt uzayı arka plan rengi için `paperbkcolor`. |
| `convertInvisibleLayers` | `boolean` | `false` | `true` olduğunda kapalı/dondurulmuş katmanlardaki varlıklar açma sırasında dönüştürülür; böylece çevrimdışı HTML/PDF dışa aktarma için ikinci bir geçiş gerekmez. Etkileşimli görüntüleme için `false` bırakın (katman açıldığında dönüştürülürler). |
| `convertAllLayouts` | `boolean` | `false` | `true` olduğunda tüm kağıt uzayı yerleşimleri açma sırasında/hemen ardından kaydedilir ve dönüştürülür; dışa aktarma kullanıcının her yerleşim sekmesini ziyaret etmesini beklemez. |
| `skipSpatialIndex` | `boolean` | `false` | `true` olduğunda varlık dönüşümü sırasında hiyerarşik uzamsal dizin oluşturma atlanır. Bu dizin etkileşimli seçim ve akıllı kapsam için kullanılır; başsız (headless) HTML/JPEG dışa aktarma yalnızca sahne parçalarına ihtiyaç duyar, böylece zaman ve bellek tasarrufu sağlanır. |
| `cooperativeYield` | `boolean` | `true` | `false` olduğunda varlık dönüşümü sırasında işbirlikçi `setTimeout` verimleri devre dışı bırakılır ve açılış ortası WebGL çizimleri atlanır. Başsız betikler duyarlı bir arayüze ihtiyaç duymaz; verimleri kapatmak açma süresini kısaltır. |

#### Veritabanı Seçenekleri (`@mlightcad/data-model`'den devralınır)

| Seçenek | Tür | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | İşleme parçası başına en az varlık sayısı. Daha büyük parçalar zamanlama yükünü azaltır; resmi örnek `1000` kullanır. Üst sınır toplam varlık sayısıdır. |
| `timeout` | `number` | dönüştürücü varsayılanı | Web Worker ayrıştırma zaman aşımı (milisaniye). Yalnızca seçilen dönüştürücü Worker'da ayrıştırıyorsa geçerlidir. |
| `encoding` | `string` | otomatik algılama | Katman adları, notlar, metinler ve öznitelikler için metin kodlaması geçersiz kılması (örneğin `'gbk'` veya `'euc-kr'`). Atlandığında DXF `$DWGCODEPAGE`'i, DWG başlıktaki kod sayfasını okur. Açıkça verilen değer otomatik algılamayı geçersiz kılar; kod sayfası bildirimi eksik veya yanlış olan dosyalarda yararlıdır. |
| `drawNoPlotLayers` | `boolean` | `false` | Yazdırılamayan katmanlarda (Defpoints, `*-NPLT` vb.) bulunan varlıkların çizilip çizilmeyeceği. `true` = masaüstü AutoCAD davranışı (ekranda görünür); `false` = web/yayın görüntüleyici davranışı (gizli). `AcApDocManager` bunu varsayılan olarak `false` yapar. |
| `circleSides` | `number` | `50` (taslak) | Bir tam dairenin eğrilikle gösterilmesinde kullanılan en fazla parça sayısı. Düşük değerler GPU belleğinden tasarruf ettirir ve HTML dışa aktarmayı küçültür; yüksek değerler daha pürüzsüz görünüm sağlar. DXF VPORT aralığına sabitlenir. Kısa yaylar yine daha az parça kullanır. |
| `fileName` | `string` | – | Uzantı dahil çizim dosya adı. Açılan veritabanının salt okunur `DWGNAME` sistem değişkenini günceller. |

#### Kullanımdan Kaldırılan Seçenekler

| Seçenek | Durum |
| --- | --- |
| `waitForTextGeometry` | Yok sayılır. Aşamalı işlemenin her iki aşaması artık `progressiveRendering` tarafından denetlenir; geçirmek bir uyarı günlüğe yazdırır. |
| `fontLoader`, `failOnFontLoadError` | Kaldırıldı. Yazı tipleri metin işleyici tarafından çizim sırasında geç yüklenir; geçirmek bir uyarı günlüğe yazdırır. |

#### Örnek

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('Çizim açılamadı')
}
```

Açma yaşam döngüsünü izlemek için `AcApDocManager.instance.events` üzerindeki olaylara abone olun: `documentToBeOpened`, `documentCreated`, `documentToBeActivated`, `documentActivated`, `documentToBeDestroyed` ve `documentDestroyed`.

### Çizimleri Gerçek Zamanlıda Değiştirme

`cad-simple-viewer` çizimleri DWG/DXF dosyalarına kaydetmeyi desteklemezken, **çizimleri gerçek zamanlı olarak değiştirme** konusunda kapsamlı destek sunar. Çizim içindeki varlıkları ekleyebilir, düzenleyebilir ve silebilirsiniz; görüntüleyici bu değişiklikleri yansıtmak için otomatik olarak güncellenir.

Varlıkları değiştirdiğinizde, doğrudan altta yatan çizim veritabanıyla çalışırsınız. Görüntüleyici bu değişiklikleri otomatik olarak algılar ve görünümü buna göre günceller. Bu gerçek zamanlı senkronizasyon şunları sağlar:

- Tüm değişiklikler anında görünür
- Komut yığını, geri al/yinele işlemleri için değişiklikleri düzgün biçimde izler. Bu yakında uygulanacaktır.

Bu yetenek, `cad-simple-viewer`'ı yalnızca CAD dosyalarını görüntülemekle kalmayıp aynı zamanda kullanıcıların çizim içeriğiyle etkileşim kurmasına ve onu değiştirmesine olanak tanıyan uygulamalar için uygun hale getirir.

**Önemli Not**: `cad-simple-viewer` içindeki kullanım kalıpları **AutoCAD RealDWG'ye çok benzer**. AutoCAD RealDWG geliştirmesine aşinaysanız, API yapısını ve iş akışını neredeyse aynı bulacaksınız. Temel fark, yerel RealDWG kitaplıkları yerine [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) kullanmamızdır.

[cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) projesinde [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) ile nasıl çizim oluşturulacağı gösterilmektedir.

## MLightCAD İçindeki Rolü

Bu paket, ön uç UI'ı işleme motorlarına bağlayan ve belgeyle ilgili tüm işlemleri yöneten temel mantık katmanı olarak işlev görür.
