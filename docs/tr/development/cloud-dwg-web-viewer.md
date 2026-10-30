---
title: "Bulut DWG Web Görüntüleyici Oluşturma"
---

# `cad-html-plugin` ile Bulut DWG Web Görüntüleyici Oluşturma: Ön İşleme + Statik Barındırma

Bu makale, DWG/DXF çizimlerini sunucu tarafında (veya derleme sırasında) doğrudan barındırılabilir statik kaynaklara dönüştürmek için `@mlightcad/cad-html-plugin` paketinin **çok dosyalı ACEX paketi** dışa aktarma yeteneğinin nasıl kullanılacağını tanıtır. Kullanıcılar daha sonra çizimi tarayıcıda ayrıştırmak veya geometriyi üçgenleştirmek zorunda kalmadan bir web sayfası açıp çizimi görüntüleyebilir.

Biçimin kendisi hakkında ayrıntılar (manifest alanları, ACEC/ACEO ikili kodlaması vb.) için [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md) dosyasına bakın. Bu makale yalnızca **bu biçimi kullanarak bulut tabanlı bir çizim görüntüleyicinin nasıl oluşturulacağına** odaklanır.

---

## 1. Arka Plan: İki Web Çizim Görüntüleyici Mimarisi

**Mimari A: Tarayıcıda gerçek zamanlı ayrıştırma (`cad-viewer`'ın DWG/DXF dosyalarını açtığı varsayılan yol)**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

Ayrıştırma ve "varlıklar → işleme verisi" dönüştürmesinin tüm maliyeti **kullanıcının cihazında** gerçekleşir: büyük çizimlerde ilk işleme yavaştır, düşük donanımlı mobil cihazlar yavaşlayabilir ve bellek baskısı önemli olabilir.

**Mimari B: Ön işleme + statik barındırma (Haochen Viewer Web ve Autodesk Web Viewer gibi bulut tabanlı çizim görüntüleyicilerinin kullandığı yaygın yaklaşım)**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

`cad-html-plugin` tarafından dışa aktarılan **multi paket**, Mimari B'nin ürünüdür: çıkarıldıktan sonra saf bir statik dizin haline gelen bir `.zip` dosyası. Herhangi bir web sunucusu (nginx, nesne depolama, CDN) tarafından barındırılabilir ve **herhangi bir arka uç çalışma zamanı gerektirmez**.

### Mimari B Ne Zaman Seçilmeli

* Çizimler esas olarak **yayımlama / paylaşma / arşiv görüntüleme** için kullanılıyorsa ve birçok kullanıcı aynı çizimi tekrar tekrar görüntülüyorsa (yüksek CDN önbellek isabet oranı);
* Kullanıcıların cihazlarının ayrıştırma ve üçgenleştirme yapmasını gerektirmeden hızlı ilk işleme ve iyi bir mobil deneyim istiyorsanız;
* Orijinal DWG/DXF dosyasını görüntüleyenlere dağıtmak istemiyorsanız (paket yalnızca **görüntüleme düzeyinde veri** içerir; düzenlenebilir varlık kayıtları yoktur, bu da çizim varlıkları için bir ölçüde koruma sağlar);
* Sunucu tarafı maliyetlerin sıfıra yaklaşmasını istiyorsanız (saf statik trafik).

### Maliyetler ve Ön Koşullar

* **Ağ yeterince hızlı olmalıdır.** Ön işlenmiş veri düzleştirilmiş görüntüleme geometrisidir ve orijinal DWG/DXF'ten daha büyük olabilir (gzip sıkıştırmadan sonra genellikle çok küçük olsa da: yaklaşık 2 MiB'lik sıkıştırılmamış bir blok gzip sonrası tipik olarak 200 KiB'den azdır). Bu verileri indirmenin ağ maliyeti, yerel olarak ayrıştırma + üçgenleştirme maliyetinden zaten büyükse bu yaklaşımın avantajı yoktur. Zayıf ağ ortamları veya küçük bir çizimin yalnızca bir kez görüntülendiği senaryolar için tek dosyalı HTML doğrudan sunmak veya çizimi çevrimiçi ayrıştırmak daha uygun olabilir.
* **Çizimler güncellendikten sonra yeniden dışa aktarılıp yeniden yayımlanmalıdır.** Bu yaklaşım "yayımlandıktan sonra salt okunur" senaryolar için uygundur, ancak çevrimiçi işbirlikçi düzenleme için uygun değildir.
* Parola ve son kullanma koruması şu anda yalnızca **tek dosyalı HTML** dışa aktarımları için mevcuttur. Çok dosyalı paketler için erişim kontrolü barındırma katmanı tarafından ele alınmalıdır (imzalı URL'ler, kimlik doğrulamalı ters proxy'ler vb.).

> **Tek dosya ile çok dosyalı arasında nasıl seçim yapmalısınız?**
>
> Birine doğrudan göndermek veya çift tıklayarak çevrimdışı açmak için → `single` (kendi kendine yeten `.html`) kullanın.
>
> Birçok kullanıcının erişimi için bir Web sunucusunda/CDN'de barındırmak için → `multi` (bu makalede açıklanan yaklaşım) kullanın: geometri küçük parçalara bölünür ve **aşamalı olarak yüklenir**. İlk görünüm için yalnızca mevcut yerleşimin ilk birkaç parçasının indirilmesi yeterlidir; diğer yerleşimler ve nesne yakalama verileri talep üzerine tembel yüklenir.

---

## Çevrimiçi Demo

DWG Web görüntülemede bu **ön işleme + statik barındırma** yaklaşımını uygulamalı olarak hissetmek isterseniz aşağıdaki çevrimiçi demoyu doğrudan açabilirsiniz:

👉 [**DWG Web Görüntüleyiciyi Çevrimiçi Deneyin**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

Bu demo, bu makalede açıklanan ön işleme yaklaşımını kullanır. DWG çizimi yayımlanmadan önce zaten ayrıştırılmış ve geometrisi üçgenleştirilmiştir. Kullanıcılar web sayfasını açtığında orijinal DWG dosyasını tekrar ayrıştırmaya gerek yoktur; görüntüleyici doğrudan önceden oluşturulmuş görüntüleme verilerini yükler.

Çizim kaynakları tarayıcı tarafından önbelleğe alındığından, **sayfayı ilk açtığınızda kaynakların indirilmesini beklemeniz gerekebilir; önbellek oluşturulduktan sonra aynı sayfayı tekrar açmak çok hızlı olacaktır**. Bu, **ön işleme + statik barındırma** yaklaşımının çizimleri yayımlama, paylaşma ve tekrar tekrar görüntüleme için özellikle uygun olmasının nedenlerinden biridir.

Önce demoyu deneyebilir, ardından aşağıdaki mimari ve uygulama ayrıntılarını okumaya devam edebilirsiniz.

---

## 2. Çıktı: Çıkarıldıktan Sonra Kullanıma Hazır Statik Dizin

Multi dışa aktarma bir `.zip` dosyası üretir, ancak **zip yalnızca dağıtım için kullanılır**. Görüntüleyici dosyayı tarayıcıda açmaz. Bunun yerine manifesti ve tek tek parça dosyalarını sırayla getirir. **Paket barındırmadan önce çıkarılmalıdır:**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

Kullanıcı `viewer.html` dosyasına eriştikten sonraki yükleme sırası şöyledir:

1. Sayfaya gömülü `#mlcad-package` yapılandırmasını okuyun ve manifest URL'sini alın (varsayılan: `./{name}.acex.json`);
2. Manifesti (küçük JSON) indirin ve katman, yerleşim, sınırlar ve diğer arayüz bileşenlerini başlatın;
3. **Geçerli yerleşimin** geometri parçalarını tek tek indirin → gunzip → çöz → işle; her parçayı hazır olduğunda gösterin;
4. Çizim artık kaydırılıp yakınlaştırılabildiğinde `*.osnap.gz` nesne yakalama verilerini indirin (ölçüm/nesne yakalama için kullanılır);
5. Diğer yerleşimler yalnızca kullanıcı onlara geçtiğinde yüklenir.

Görüntüleyici çalışma zamanı zaten `viewer.html` içine gömülüdür, bu nedenle dizin **ek JavaScript bağımlılığı içermez**. Özellikler şunlardır: seçim / kaydırma / yakınlaştırma (sınırlar, pencere, özgün görünüm), katman paneli, yerleşim değiştirme, ölçüm, işaretleme (Design Review işaretlemesi), nesne yakalama ve Çince / İngilizce / Çekçe / Türkçe dahil yerleşik çok dilli arayüzler.

---

## 3. Multi Paket Oluşturmanın Üç Yolu

### Yöntem 1: cad-viewer Web Uygulamasından Elle Dışa Aktarma (Ara Sıra Yapılan Dışa Aktarımlar için Uygun)

* [cad-viewer](https://mlightcad.com/cad-viewer/) içinde çizimi açın, dışa aktarma iletişim kutusunu açmak için `chtml` komutunu çalıştırın ve dışa aktarma biçimi olarak **"Multi-file Package (ZIP)"** seçin;
* Veya komut satırından `-chtml` çalıştırıp istemleri yanıtlayın ve biçim için **Multi** seçin:

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

Tarayıcı bir `.zip` dosyası indirir.

### Yöntem 2: Sunucuda / CI'da Toplu Dönüştürme (Bulut Mimarileri için Önerilir)

Başsız CLI paketi [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli), tam ayrıştırma + üçgenleştirme + dışa aktarma hattını başsız Chromium'da çalıştırmak için Playwright kullanır. Bir dönüştürme hizmetine veya CI hattına entegrasyon için idealdir.

Kurulum (Node.js 20+ gerektirir):

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

Dışa aktarma, `-chtml` istemlerini satır satır yanıtlayan bir `.scr` betiği gerektirir (`Single/Multi`, `Yes/No`, `Black/White/Space`, `Extents/Current`, `Measure/View`). CLI paketi kullanıma hazır bir `examples/export-html-multi.scr` dosyası içerir (npm kurulumundan sonra `node_modules/@mlightcad/cad-simple-viewer-cli/examples/` konumunda bulunur; depoda ise [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr) konumundadır):

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / hidden layers / layouts / background /
; initial view / viewer mode / chunk size MiB / compress chunks
-chtml
Multi
Yes
Yes
Black
Extents
Measure
2
Yes
quit
```

Tek bir çizimi dışa aktarma:

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

Toplu dizin dönüştürme, zip çıkarma ve yayımlama için eksiksiz bir otomasyon çözümü için Bölüm 6'ya bakın.

Programlama API'sini kullanarak kendi dönüştürme hizmetinize de entegre edebilirsiniz:

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### Yöntem 3: Kendi Web Uygulamanızda Programatik Dışa Aktarma

Uygulamanız zaten `cad-simple-viewer` gömüyorsa (kullanıcılar çizimleri doğrudan web uygulamanızda görüntülüyorsa), dönüştürme API'sini doğrudan çağırabilir ve "barındırma paketini dışa aktar" işlemini ürününüzde bir düğmeye dönüştürebilirsiniz:

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

Daha düşük seviyeli API'ler (paketi kendiniz oluşturun ve diske yazacağınıza veya yükleyeceğinize karar verin):

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **Not:** DWG/DXF ayrıştırma ve sahne oluşturma, `cad-simple-viewer` tarayıcı çalışma zamanı ortamına bağlıdır, bu nedenle **sunucu tarafı dönüştürme Yöntem 2'yi (CLI) kullanmalıdır**. Yöntem 3, dışa aktarma işlevini kendi web tabanlı ürününüze entegre etmek için uygundur.

---

## 4. Web Sunucusuna Dağıtma

### 4.1 Çıkarma ve Yayımlama

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

Yayımladıktan sonra kullanıcılara `https://your-domain/cad-packages/floor-plan/viewer.html` URL'sini vermeniz yeterlidir. Dizinleri **çizim kimliği / sürüm numarası** ile düzenlemeniz önerilir (örneğin `/cad-packages/{drawingId}/{version}/`). Bir çizim güncellendiğinde yeni bir sürüm dizini yayımlayın. Eski sürüm doğal olarak kullanımdan kaldırılabilir ve bu yapı önbelleğe almayı da kolaylaştırır.

### 4.2 Sunucu Gereksinimleri

Statik dosya sunabilen her hizmet çalışır: nginx, Apache, IIS, `npx serve`, Python `-m http.server` ve Alibaba Cloud OSS / AWS S3 + CloudFront gibi nesne depolama statik web sitesi barındırma. Yalnızca birkaç gereksinim vardır:

1. **HTTP(S) üzerinden erişilmelidir.** Görüntüleyici, manifesti ve parça dosyalarını yüklemek için `fetch()` kullanır. `file://` protokolüyle çalışmaz, bu nedenle `viewer.html` dosyasına çift tıklayıp onu yerel dosya olarak kullanamazsınız.
2. **Tüm paket aynı kökende barındırılmalıdır.** Güvenlik nedenleriyle yükleyici, `manifestUrl`'nin sayfayla aynı kökende olduğunu ve parça dosyalarının manifestle aynı kökende olup paket dizini içinde bulunduğunu doğrular (mutlak URL'ler ve dizinler arası geçen `..` yolları reddedilir). Bu nedenle `viewer.html`, manifesti ve `chunks/` dizinini **aynı site / aynı CDN etki alanı** altına koyun. Parça dosyalarını başka bir etki alanına ayırmayın. Hem sayfayı hem de parçaları bir CDN etki alanında barındırmak tamamen sorunsuzdur.
3. **`.gz` dosyaları özgün baytlarıyla döndürülmeli ve `Content-Encoding: gzip` yanıt başlığı içermemelidir.**

   `.acex.gz` / `.osnap.gz` zaten gzip ile sıkıştırılmış baytlardır ve görüntüleyici gunzip işlemini JavaScript içinde kendisi yapar. Web sunucusu (tipik olarak Apache'nin `mod_mime` modülü, `.gz` uzantıları için varsayılan olarak `AddEncoding gzip gz` ayarlayabilir veya bazı CDN'ler/nesne depolama hizmetleri tarafından yapılandırılan üst veriler) `Content-Encoding: gzip` eklerse, tarayıcı dosyayı bir kez otomatik olarak açacak ve görüntüleyici tekrar açmaya çalışarak hata verecektir. Bu dosyaların opak ikili veri olarak döndürüldüğünden emin olun (`Content-Type: application/octet-stream` yeterlidir; görüntüleyici bunları `arrayBuffer` kullanarak okur ve MIME türüne bağlı değildir). `.acex.json` manifesti `application/json` kullanmalıdır.
4. **Önbelleğe alma stratejisi.** Parça dosyası içerikleri değişmezdir (aynı sürüm dizini içinde değişmezler), bu nedenle `chunks/` dizinine uzun önbellek ömrü vermek güvenlidir (`Cache-Control: public, max-age=31536000, immutable`). Manifest dosyaları kısa bir önbellek ömrü veya `no-cache` kullanmalıdır; böylece paket aynı dizine yeniden dışa aktarıldığında istemciler güncellemeleri hızlıca keşfedebilir. Paketler sürümlenmiş dizinlerde yayımlanıyorsa tüm dizin uzun vadeli önbelleğe alma kullanabilir.

nginx örneği (varsayılan yapılandırma, `.gz` dosyaları doğrudan istendiğinde bunları sıkıştırmaz/açmaz; burada CDN veya özel yapılandırmadan etkilenmemek için açıkça belirtilmiştir):

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

Apache kullanıcıları, `.gz` uzantısı için `AddEncoding gzip .gz` ayarının etkin olmadığından emin olmalıdır (bu, varsayılan MIME yapılandırmasında yaygındır). Gerekirse paket dizininin `.htaccess` dosyasında kaldırın:

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 Yerel Doğrulama

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

Çizim doğru görüntüleniyorsa ve yerleşimler arasında geçiş yapıp ölçüm yapabiliyorsanız barındırma yapılandırması doğrudur.

---

## 5. Dışa Aktarma Seçenekleri Nasıl Seçilir

| Seçenek                  | Açıklama                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | Bu makalede açıklanan yaklaşım. `'single'` kendi kendine yeten tek dosyalı bir HTML'dir                                                                                                              |
| `viewerMode`            | `'measure'` (varsayılan): ölçüm, işaretleme ve nesne yakalamayı içerir, `*.osnap.gz` verileriyle; `'view'`: yalnızca görüntüleme (kaydırma/yakınlaştırma/katmanlar), daha küçük paket ve daha hızlı ilk işleme sağlar |
| `exportLayouts`         | `true` (varsayılan) kağıt alanı yerleşimlerini dışa aktarır; `false` yalnızca model alanını dışa aktarır ve araç çubuğu yerleşim değiştirmeyi göstermez                                                                    |
| `exportInvisibleLayers` | `true` (varsayılan) kapalı/dondurulmuş katmanları da dışa aktarır; `false` yalnızca görünür katmanları dışa aktarır ve daha küçük bir paket oluşturur                                                                                 |
| `initialView`           | `'fit'` (varsayılan, açıldığında çizimi tam görünüme sığdırır) veya `'current'` (dışa aktarma anındaki görünüm konumunu korur)                                                                           |
| Parola / son kullanma   | Yalnızca `single` modunda desteklenir; çok dosyalı paketler için barındırma katmanında kimlik doğrulama kullanın (imzalı URL'ler, erişim belirteçleriyle ters proxy vb.)                                                   |

---

## 6. Uçtan Uca Hat Örneği

"dönüştür → çıkar → yayımla" için minimal bir Node betiği (bir çizim yüklemesinden sonra bir webhook'a veya bir CI hattına bağlanabilir):

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

Üretim ortamında ayrıca şu özellikleri ekleyebilirsiniz: yinelenen dönüştürmenin atlanıp atlanamayacağını belirlemek için çizim içeriğinin bir karmasını kullanmak, başarısız dönüştürmeleri yeniden denemek veya zip oluşturmaya bile gerek kalmaması için Yöntem 3'teki `buildAcExPackage` kullanarak `pkg.files` dosyalarını doğrudan `PutObject` ile nesne depolamaya yüklemek.

---

## 7. SSS

**S: Zip dosyasını sunucuya koyup ona bir bağlantı verebilir miyim?**

Hayır. Zip yalnızca indirme ve dağıtım için bir paketleme biçimidir. Çalışma zamanında görüntüleyici, çıkarılmış `viewer.html` / `*.acex.json` / `chunks/*.gz` dosyalarını getirir. Ya sunucuda çıkarıp ortaya çıkan dosyaları barındırmalısınız ya da ön uçta çıkarmak için kendi uygulamanızda `unzipAcExPackageFiles` kullanmalısınız (aynı köken ve bellek sorunlarına dikkat edin; büyük çizimler için önerilmez).

**S: Parça dosyaları 404 döndürüyor / sayfa açıldıktan sonra yüklenemiyor.**

Sayfaya HTTP(S) üzerinden erişilip erişilmediğini; `chunks/` dizininin `viewer.html` ve manifestle birlikte dağıtılıp dağıtılmadığını ve parça dosyalarının yeniden adlandırılıp taşınmadığını kontrol edin (manifestteki `href` değerleri göreli yollardır, bu nedenle dizin yapısı korunmalıdır).

**S: Parça dosyaları başarıyla indiriliyor ancak ayrıştırılamıyor.**

Büyük olasılıkla sunucu `.gz` dosyalarına `Content-Encoding: gzip` eklemiştir (tarayıcı bunları bir kez otomatik olarak açmıştır). Bölüm 4.2'deki 3. maddeye göre yanıt başlıklarını kontrol edin.

**S: Sayfayı kendi etki alanımda tutarken parça dosyalarını bir CDN'e koyabilir miyim?**

Mevcut yükleyici, sayfa, manifest ve parça dosyalarının aynı kökende olmasını gerektirir. **Tüm paket dizinini** bir CDN etki alanına yayımlayın ve CDN hızlandırmasından yararlanmak için kullanıcıların `viewer.html` dosyasına doğrudan CDN'den erişmesini sağlayın.

**S: Dışa aktarılan dosya adı neden `floor-plan-2.zip` oldu?**

Hedef dosya zaten varsa, dışa aktarma işlemi üzerine yazmayı önlemek için otomatik olarak bir sıra numarası ekler. Tekrar dışa aktarmadan önce çıktı dizinini silin veya boşaltın; böylece sonraki çalıştırma eski bir zip'i almasın.

**S: Çizim değiştirildiğinde ne olur?**

Dönüştürmeyi tekrar çalıştırın ve yeni bir dizine yayımlayın (veya aynı dizinin üzerine yazın ve manifest önbelleğini geçersiz kılın). Paket, görüntüleme verilerinin bir anlık görüntüsüdür ve kaynak dosyadaki güncellemeleri otomatik olarak takip etmez.

**S: Orijinal çizim açığa çıkar mı?**

Paket yalnızca **görüntüleme düzeyinde** veriler içerir: çizgi/ağ grupları, katman adları, yerleşim adları, sınırlar ve birimler. DWG/DXF baytları veya düzenlenebilir varlık kayıtları içermez. Ancak yine de çizim geometrisinin tam bir temsilidir. Güçlü erişim kontrolü gerekiyorsa barındırma katmanında kimlik doğrulama uygulayın veya parola ve son kullanma korumasını destekleyen tek dosyalı HTML kullanın.
