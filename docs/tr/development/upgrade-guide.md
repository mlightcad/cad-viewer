---
title: "cad-simple-viewer ve cad-editor Yükseltme"
---

# cad-simple-viewer ve cad-editor Yükseltme

Bu kılavuz, `@mlightcad/cad-simple-viewer` ve `@mlightcad/cad-editor` paketlerinin güvenli şekilde nasıl yükseltileceğini açıklar — neden tek başlarına yükseltilemeyeceklerini, hangi ilgili paketlerin birlikte hareket etmesi gerektiğini ve belirli bir sürüm için doğru uyumlu sürüm kümesini belirlemenin iki güvenilir yolunu.

::: info Hafif dosya açma giriş ekranı girişi
**1.8.0** sürümünden itibaren `@mlightcad/cad-simple-viewer`, açılış sayfaları için DocManager’sız bir alt yol sunar. **`acuiCreateFileOpenSession`** (tembel `createDocManager` + otomatik açma / `attachSourcesTo`) tercih edin. Çizimleri kendiniz açtığınızda (ör. Vue `MlCadViewer`) `AcUiFileOpenLanding` kullanın:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

Ana sayfa / dosya seçicide kullanın; tam görüntüleyici bir çizim açılana kadar tembel kalsın. Vue düzenleyici karşılığı, `MlCadViewer` mount etmeden i18n için `@mlightcad/cad-editor/locale` yoludur.

Tam anlatım: [Dosya Açma Paneli](./file-open-panel). Bulut kaynağı sözleşmeleri: [Veri Kaynağı Eklentisi](./data-source-plugin).
:::

::: warning Paket adı değişti: `@mlightcad/cad-viewer` → `@mlightcad/cad-editor`
**1.8.0** sürümünden itibaren, adının gerçek işlevini yansıtması için `@mlightcad/cad-viewer` paketinin adı `@mlightcad/cad-editor` olarak değiştirildi.

- **Eski paket artık güncellenmiyor.** `@mlightcad/cad-viewer` 1.7.x'te kalır ve registry'de bundan sonra yeni sürümü yayınlanmaz; bu nedenle `pnpm add @mlightcad/cad-viewer@1.8.0` 404 hatası verir. Bu, projenin durdurulduğu anlamına gelmez — yalnızca yeni adı kullanın.
- **API'de hiçbir değişiklik yok.** Yalnızca paket adı ve üretilen dosya adları değişti; `MlCadViewer`, `i18n` ve diğer dışa aktarımlar ile kullanımları aynıdır.
- **Adı, diğer paketlerle aynı sürüme geçerken bir defada değiştirin:**

```diff
  {
    "dependencies": {
-     "@mlightcad/cad-viewer": "1.7.8",
+     "@mlightcad/cad-editor": "1.8.0",
      "@mlightcad/cad-simple-viewer": "1.8.0"
    }
  }
```

```diff
- import { MlCadViewer, i18n } from '@mlightcad/cad-viewer'
+ import { MlCadViewer, i18n } from '@mlightcad/cad-editor'
```

CDN dosyalarını sürüme göre sabitliyorsanız (jsDelivr, unpkg, …) dosya adlarını da güncelleyin:

```diff
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.js
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.css
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.js
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.css
```

::: tip Depo adı değişmedi
GitHub deposu hâlâ [`mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer); belge sitesi ve canlı demolar da mevcut yollarını koruyor. Yalnızca **npm paket adı** değişti, bu yüzden bu kılavuzdaki tüm depo ve issue bağlantıları geçerliliğini korur.
:::
:::

::: warning HTML dışa aktarma genel API’si yeniden adlandırıldı (`AcExHtml` / `acexHtml`)
**1.8.0** sürümünden itibaren `@mlightcad/cad-html-core` (`@mlightcad/cad-html-plugin` tarafından yeniden dışa aktarılır) genel türleri ve işlevleri, monorepodaki diğer katmanlarla aynı adlandırma kuralına uyarak `AcExHtml*` (türler) ve `acexHtml*` (işlevler) katman öneklerini kullanır.

Davranış değişmez; yalnızca sembol adları değişir. 1.7.x’ten yükseltirken import’ları güncelleyin:

```diff
  import {
-   type AcExSnapshot,
-   buildAcExPackage,
-   zipAcExPackageFiles,
-   unzipAcExPackageFiles,
-   packHtml,
-   packHtmlPackage
+   type AcExHtmlSnapshot,
+   acexHtmlBuildPackage,
+   acexHtmlZipPackageFiles,
+   acexHtmlUnzipPackageFiles,
+   acexHtmlPackHtml,
+   acexHtmlPackHtmlPackage
  } from '@mlightcad/cad-html-plugin'
```

Diğer HTML-core yardımcıları da aynı şekilde yeniden adlandırıldı (örneğin `captureAcExSavedViewExtents` → `acexHtmlCaptureSavedViewExtents`, `buildOsnapCatalog` → `acexHtmlBuildOsnapCatalog`). `AcApHtmlConvertor` ile `chtml` / `-chtml` gibi komut düzeyindeki API’ler etkilenmez. Geliştirme kılavuzlarındaki yeni adlar **1.8.0+** içindir; 1.7.x’te eski sembolleri kullanmaya devam edin.
:::

::: info PDF dışa aktarma paylaşılan çekirdeğe ayrıldı (tarayıcı + Node)
**1.8.0** sürümünden itibaren PDF dışa aktarma, HTML dışa aktarma ile aynı katmanlamayı kullanır. Paylaşılan mantık `@mlightcad/cad-pdf-core` içindedir (seçenek modeli ve database → PDF hattı; `cad-simple-viewer` / DOM’a **bağımlı değildir**). Bunu iki ön uç kullanır:

| Paket | Rol |
| --- | --- |
| `@mlightcad/cad-pdf-plugin` | Tarayıcıda `cpdf` / `-cpdf` / `ipdf` (ve Vue dışa aktarma iletişim kutusu) |
| `@mlightcad/cad-pdf-exporter` | Node’da başsız DXF/DWG → PDF — **tarayıcı gerekmez** |

**Tarayıcı entegratörleri — büyük ölçüde aynı.** `cpdf` / `-cpdf` / `ipdf`, `AcApPdfConvertor`, `AcApPdfExportOptions` ve `resolveAcApPdfExportOptions` kullanmaya devam edin. Yeni peer `@mlightcad/cad-pdf-core`’u eklentiyle aynı sürümde ekleyin.

**Kullanıcıyı etkileyen API / davranış farkları:**

- Yeni seçenek `colorMode: 'color' | 'monochrome'` (varsayılan `'color'`). `cpdf` iletişim kutusunda, `-cpdf`’nin **son** isteminde (`Color` / `Monochrome`) ve `AcApPdfExportOptions` üzerinde kullanılabilir. Mevcut `-cpdf` betikleri, metin modu yanıtından sonra bu istemi yanıtlamalıdır (veya varsayılan için boş satır).
- Tarayıcısız sunucu / CI: Playwright ile `cpdf` çalıştırmak yerine `@mlightcad/cad-pdf-exporter` (`exportFileToPdf`, `convertDatabaseToPdf`) kullanın.

```ts
// Tarayıcı (adlar değişmedi)
import {
  AcApPdfConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({ colorMode: 'monochrome' })
)

// Node, tarayıcı yok
import { exportFileToPdf } from '@mlightcad/cad-pdf-exporter'

await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome'
})
```

Paylaşılan hattı doğrudan çağıran ileri düzey kullanım için `@mlightcad/cad-pdf-core` içindeki `acexPdfExportDatabase` / `acexPdfResolveExportOptions`’a bakın. Yazı tipleri, yerleşimler ve metin modu ayrıntıları paket README’lerindedir.
:::

## Genel Bakış

`@mlightcad/cad-simple-viewer` ve `@mlightcad/cad-editor` **bağımsız paketler değildir**. Ortak bir kod tabanını ve sürüm döngüsünü paylaşan sıkı entegre bir ekosistemin parçasıdırlar. Her sürüm, eklentiler, işleyiciler, veri modeli paketleri, metin işleme kütüphaneleri ve üçüncü taraf arayüz çerçeveleri genelinde koordineli bir güncelleme kümesini bir arada sunar.

**Yalnızca `cad-simple-viewer` veya `cad-editor` paketini tek başına yükseltmek ince çalışma zamanı hatalarına yol açabilir**, bunlar dahil:

- Eklenti arayüzlerinin, daha yeni (veya daha eski) çekirdek sürümlerde değişen API imzalarını beklemesi
- Çekirdeğin beklediği veri modeli yapısı ile daha eski bir ayrıştırıcı/işleyicinin ürettiği yapı arasındaki uyuşmazlıklar
- libredwg-converter yükseltmesinden sonra WebAssembly veya Worker uyumsuzluğu
- `mtext-renderer` / `mtext-parser` sürümleri kaydığında metin işleme aksaklıkları
- İşleyici katmanında karşılanmayan Three.js kırıcı veya davranışsal değişiklikler

Her zaman **ilgili paketlerin tüm kümesini birlikte** yükseltin. Doğru sürümleri belirlemenin iki güvenilir yolu aşağıda açıklanmıştır.

---

## Ekosisteme Bir Bakış

Yükseltmeden önce hangi paketlerin koordineli sürüme ait olduğunu ve hangilerinin üçüncü taraf olduğunu bilmek faydalıdır. Aşağıdaki kategoriler aynı cad-editor sürümüne senkronize edilir:

### Temel görüntüleyici paketleri

| Paket | Rol |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | Çerçeveden bağımsız çekirdek (belge yönetimi, komut yığını, işleme yapıştırıcısı) |
| `@mlightcad/cad-editor` | cad-simple-viewer üzerine kurulu Vue 3 + Element Plus arayüz sarmalayıcısı |

### Eklentiler — **cad-simple-viewer sürümüyle tam olarak eşleşmelidir**

| Paket | Amaç |
| --- | --- |
| `@mlightcad/cad-html-plugin` | Tek tıkla kendi kendine yeten HTML dışa aktarma |
| `@mlightcad/cad-pdf-plugin` | Tarayıcıda PDF dışa aktarma ve PDF→CAD içe aktarma |
| `@mlightcad/cad-svg-plugin` | SVG dışa aktarma |
| `@mlightcad/cad-simple-ui-plugin` | Düz DOM araç çubuğu, katman yöneticisi, dock paneli |
| `@mlightcad/cad-agent-plugin` | Yapay zeka ajanı destekli etkileşim |
| `@mlightcad/cad-onedrive-plugin` | OneDrive entegrasyonu |
| `@mlightcad/cad-google-drive-plugin` | Google Drive entegrasyonu |

> **Genel kural:** yukarıdaki listedeki her eklenti, yükselttiğiniz `cad-simple-viewer` sürümüyle **tam olarak aynı sürüm numarasına** sabitlenmelidir (örneğin `1.7.5`).

### Paylaşılan dışa aktarma çekirdekleri ve başsız dışa aktarıcılar (çekirdekle aynı sürüm)

| Paket | Amaç |
| --- | --- |
| `@mlightcad/cad-html-core` | Paylaşılan HTML anlık görüntü / paketleme hattı (görüntüleyici / DOM yok) |
| `@mlightcad/cad-html-exporter` | Node başsız HTML dışa aktarma |
| `@mlightcad/cad-pdf-core` | Paylaşılan PDF seçenek modeli ve database → PDF hattı (görüntüleyici / DOM yok) |
| `@mlightcad/cad-pdf-exporter` | Node başsız DXF/DWG → PDF (tarayıcı yok) |

### Dahili işleyici katmanı (çekirdekle aynı sürüm, ayrı yayımlanır)

| Paket | Amaç |
| --- | --- |
| `@mlightcad/three-renderer` | THREE.js tabanlı 2D/3D işleme motoru |
| `@mlightcad/pdf-renderer` | `cad-pdf-core` tarafından kullanılan PDF içerik arka ucu |

Bunlar eklentiler ve cad-simple-viewer tarafından dahili olarak tüketilir. Genellikle bunları doğrudan **kurmanız gerekmez**, ancak sürümleri kurduğunuz eklentilerle uyumlu olmalıdır.

### Düşük seviyeli veri ve metin katmanı — **sürümdeki sürümlerle eşleşmelidir**

| Paket | Notlar |
| --- | --- |
| `@mlightcad/data-model` | Temel varlık/veritabanı tipleri; her sürüm bunu görüntüleyiciyle birlikte yükseltir |
| `@mlightcad/libredwg-converter` | DWG ayrıştırma WebAssembly sarmalayıcısı — DWG desteği buna bağlıdır |
| `@mlightcad/mtext-parser` | MTEXT içerik ayrıştırıcısı |
| `@mlightcad/mtext-renderer` | MTEXT → THREE geometri işleyicisi |
| `@mlightcad/mtext-input-box` | Tuval içi MTEXT düzenleyici bileşeni |

### Yalnızca cad-editor'a özel Vue arayüz bağımlılıkları

Bunlar `pnpm-workspace.yaml` override'larında görünür ancak yalnızca `@mlightcad/cad-editor` (tam Vue 3 arayüzü) kullanılırken gereklidir. Cad-simple-viewer entegrasyonları bunları doğrudan kurmaz.

| Paket | Amaç |
| --- | --- |
| `@mlightcad/ribbon` | Şerit arayüz bileşeni |
| `@mlightcad/ui-components` | Paylaşılan Vue arayüz temelleri |

### Üçüncü taraf eş bağımlılıklar (sürümleri sürümde sabitlendiği gibi tutun)

| Paket |
| --- |
| `three` |
| `vue` (yalnızca cad-editor için) |
| `element-plus` (yalnızca cad-editor için) |
| `vue-i18n` (yalnızca cad-editor için) |
| `lodash-es` |

---

## Yöntem 1 — Hedef Sürümdeki `pnpm-workspace.yaml` Dosyasını Okuyun

Her sürüm için kanonik doğruluk kaynağı, ilgili Git etiketindeki monorepo'nun `pnpm-workspace.yaml` dosyasının `overrides` bölümüdür. Sürümün test edildiği her `@mlightcad/*` paketinin ve üçüncü taraf eş bağımlılığın **tam sürümlerini** listeler.

### Adımlar

1. Yükseltmek istediğiniz sürümün etiketini bulun. Etiketler `vX.Y.Z` desenini izler (örneğin `v1.7.5`). Tüm etiketler ana depodadır:

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. O etiketteki `pnpm-workspace.yaml` dosyasını açın. URL şablonu şöyledir:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   `vX.Y.Z` yerine gerçek sürüm etiketini koyun, örneğin:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. `overrides:` bloğunu kendi projenizin `pnpm-workspace.yaml` dosyasına kopyalayın. Şuna benzer (kısaltılmış örnek):

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. Kullandığınız her `@mlightcad/cad-*-plugin` paketini `cad-simple-viewer` / `cad-editor` ile **aynı sürüme** güncelleyin:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-editor": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. `pnpm install` (veya `npm install`) çalıştırın ve uygulamanın eş bağımlılık uyarıları olmadan yüklendiğini doğrulayın.

> Projeniz düz bir `npm` veya `yarn` çalışma alanıysa aynı `overrides` ayarını sırasıyla `pnpm.overrides` / `resolutions` bloğuna kopyalayın — önemli olan dosya biçimi değil, sürüm değerleridir.

---

## Yöntem 2 — `cad-simple-viewer-demo` Yükseltme Commit'lerini Takip Edin

[cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) deposu, `cad-simple-viewer` için resmi minimal ana uygulamadır. Çekirdek her sürümlendiğinde örnek proje, **tüm ilgili bağımlılıkları birlikte** güncelleyen `feat: upgrade to cad-simple-viewer vX.Y.Z` başlıklı bir commit alır. Bu commit, o sürüm için bakımcıların tam olarak hangi sürümleri kullandığını gösteren pratik ve somut bir başvurudur.

### Adımlar

1. package.json dosyasının commit geçmişini açın:

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. Hedef sürümünüz için mesajı `feat: upgrade to cad-simple-viewer vX.Y.Z` olan commit'i bulun.

3. Farkı görüntülemek için commit'e tıklayın. Fark, şunlar genelinde koordineli bir yükseltmeyi gösterecektir:
   - Tüm eklentiler (`cad-simple-viewer` ile aynı sürüme)
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - ve değişen tüm üçüncü taraf paketler

4. Farktaki sürümleri kendi `package.json` dosyanıza aktarın.

### Somut Örnek — v1.7.3 → v1.7.4 Yükseltmesi

Aşağıdaki gerçek fark, örnek depodaki [commit `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff) commit'inden alınmıştır. **Her bir `@mlightcad/*` paketinin nasıl kilit adımda hareket ettiğine** dikkat edin:

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> Bu tam olarak kendi projenizde yapmanız gereken türde koordineli bir güncellemedir. `mtext-parser` sürümünün `^1.5.3` olarak kaldığını (değişiklik gerekmediğini), `mtext-renderer` sürümünün ise `0.13.1`'den `0.13.2`'ye geçtiğini unutmayın. Bu kararlar sürüm başına alınır; tahmin etmek yerine bunları takip etmelisiniz.

---

## Yükseltmeden Sonra — Hızlı Sağlık Kontrolleri

1. **Kurulum** — eski `node_modules` kalıntılarının araya girmemesini sağlamak için temiz bir kurulum çalıştırın:

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **Bir çizim açın** — hem DXF hem de DWG dosyalarının yüklendiğini, kaydırma/yakınlaştırmanın çalıştığını ve konsol hatası görünmediğini doğrulayın.

3. **Dışa aktarma** — dışa aktarma eklentileri kullanıyorsanız örnek bir çizimde HTML, PDF ve SVG dışa aktarmayı test edin.

4. **Eş bağımlılık uyarılarını kontrol edin** — `pnpm`, karşılanmayan `peerDependencies` varsa uyarır. Bunları mutlaka düzeltilmesi gereken sorunlar olarak görün; genellikle bir eklentinin sürümünün çekirdekten uzaklaşmasından kaynaklanırlar.

5. **Uygulamanızı derleyin** — tam bir `vite build` (veya eşdeğeri), görüntüleyici tipleri ile kendi entegrasyon kodunuz arasındaki tip uyuşmazlıklarını yakalamanın en hızlı yoludur.

---

## SSS

**S: `cad-simple-viewer@1.7.5` sürümünü `cad-html-plugin@1.7.3` ile karıştırabilir miyim?**

C: Genellikle hayır. Eklentiler çekirdekle birlikte yayımlanır ve sıklıkla küçük sürümler arasında değişen dahili API'lere bağımlıdır. TypeScript derlense bile çalışma zamanı hatalarıyla karşılaşabilirsiniz (ör. dışa aktarmanın sessizce boş çıktı üretmesi veya eklenti kaydının yanıltıcı bir hatayla başarısız olması).

**S: Yalnızca `cad-simple-viewer` kullanıp hiç eklenti kullanmazsam ne olur?**

C: Yine de `data-model` ve (DWG dosyaları yüklüyorsanız) `libredwg-converter` paketlerini uyumlu sürümlerde kullanmanız gerekir. Hedef etiketinizdeki `pnpm-workspace.yaml` yine geçerlidir.

**S: Anlamsal sürümlendirme beni korur mu?**

C: Semver aralıkları (`^`, `~`) bir sürüm serisi *içinde* yama düzeyinde yükseltme için sorunsuz çalışır (örneğin `^1.7.0` otomatik olarak `1.7.5` sürümünü alır), ancak **koordineli eklenti/data-model/libredwg-converter sürümleri** yalnızca semver'den keşfedilemez — bunlar sürüm bakımcıları tarafından belirlenir. Belirli bir küçük sürüm yükseltmesi için hangi sürümlerin birlikte gittiğini bilmek için yine de yukarıdaki iki yöntemden birine ihtiyacınız vardır.

**S: pnpm yerine npm/yarn kullanıyorum. Bu yine de geçerli mi?**

C: Evet. Paket yöneticisinden bağımsız olarak sürüm koordinasyonu aynıdır. `pnpm-workspace.yaml` içindeki değerlerle `overrides` (pnpm), `resolutions` (yarn) veya `overrides` (npm) kullanın ya da `cad-simple-viewer-demo` farkındaki sürümleri doğrudan `package.json` dosyanıza sabitleyin.
