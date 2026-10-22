---
title: "Tescilli DWG Dönüştürücüsünü Kurma ve Kullanma"
---

# Tescilli DWG Dönüştürücüsünü Kurma ve Kullanma

Bu kılavuz, tescilli DWG ayrıştırıcı paketi **`@mlightcad/dwg-converter`**'ın cad-viewer veri modeliyle nasıl **kurulacağını** ve **kaydedileceğini** açıklar.

Lisanslama, deneme erişimi, fiyatlandırma ve GPL uyumluluğu için ana depodaki [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) dosyasına bakın.

> **Ön koşul:** GitHub hesabınızın özel pakete **okuma erişimi** zaten olmalıdır (deneme veya satın alma onayından sonra verilir).

## Genel Bakış

- `@mlightcad/dwg-converter` **GitHub Packages** üzerinde yayınlanır.
- Diğer `@mlightcad/*` paketleri (örneğin `@mlightcad/data-model`, `@mlightcad/cad-viewer`) genel **npm registry** üzerinde yayınlanır.
- npm ve pnpm yalnızca **kapsam düzeyinde** registry eşlemesini destekler — aynı kapsam içinde **resmi bir paket düzeyinde** registry eşlemesi **yoktur**.

Bu şu anlama gelir: yalnızca `@mlightcad/dwg-converter` paketini getirmek için şunu **kullanamazsınız**:

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

Bunu yapmak **tüm** `@mlightcad/*` paketlerini GitHub Packages'a yönlendirir ve genel paketlerin kurulumlarını bozar.

**Sürüm notu:** Aşağıdaki örneklerde `1.2.3` (ve varsa tarball karma değerini) **size teslim edilen tam sürümle** değiştirin.

## `read:packages` Yetkili bir `GITHUB_TOKEN` Oluşturma

GitHub Packages şu anda **kişisel erişim belirteci (classic)** ile kimlik doğrulaması yapar; npm registry için ince taneli belirteçler desteklenmez.

1. Paket erişimi olan hesapla GitHub'a giriş yapın.
2. **Settings → Developer settings → Personal access tokens → Tokens (classic)** bölümünü açın  
   (doğrudan bağlantı: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. **Generate new token → Generate new token (classic)** öğesine tıklayın.
4. Belirtece bir ad verin (örneğin `dwg-converter-install`) ve güvenlik politikanıza uygun bir son kullanma tarihi belirleyin.
5. **Select scopes** altında **`read:packages`** yetkisini etkinleştirin. Yalnızca kurulum için `write:packages` veya `delete:packages` gerekmez.
6. **Generate token** öğesine tıklayın ve belirteci hemen kopyalayın (yalnızca bir kez gösterilir).
7. Bunu `GITHUB_TOKEN` olarak dışa aktarın:

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. **İstemci** doğrudan GitHub Packages ile konuştuğunda (aşağıdaki Seçenek 2), `.npmrc` dosyasına **ana makine düzeyinde** bir kimlik doğrulama girdisi ekleyin:

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   Bu, kimlik bilgilerini yalnızca `npm.pkg.github.com` için iliştirir. `@mlightcad` kapsamını **yeniden eşlemez**. `@mlightcad:registry=https://npm.pkg.github.com` eklemeyin.

   `pnpm install` bu dosyayı okur. `npm view`, bir çalışma alanı paketinden çalıştırdığınızda bunu okumaz: npm 8.5'ten itibaren CLI o paketin `.npmrc` dosyasını yok sayar (`ignoring workspace config`) ve `GITHUB_TOKEN` ayarlanmış olsa bile istek belirteç olmadan gönderilir (`401 Unauthorized - authentication token not provided`). Belirteci doğrudan `npm view` komutunda geçin — bkz. Seçenek 2.

   Bir monorepo'da bu dosyayı **çalışma alanı köküne** koyun. Yalnızca bir üye paket içinde bulunan `.npmrc`, npm'in atladığı dosyadır.

   Seçenek 1'i (özel bir registry proxy'si) kullanıyorsanız, istemcilerin genellikle bu satıra ihtiyacı **yoktur** — belirteci bunun yerine proxy'ye koyun.

**Güvenlik notları**

- Belirteci bir parola gibi ele alın. Git'e **göndermeyin** veya herkese açık sorunlara yapıştırmayın.
- Belirteci `.npmrc` içinde sabit kodlamak yerine ortam değişkenlerini (veya CI gizli deponuzu) tercih edin.
- GitHub Actions'te, kurulum işi için bir depo sırrını (örneğin `GH_PACKAGES_TOKEN`) `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` olarak eşleyin.

## Kurulum Seçenekleri

Aşağıdaki yaklaşımlardan **birini** seçin.

### Seçenek 1: npm ve GitHub Packages'a proxy'lik yapan birleşik özel registry

Özel bir npm registry işletiyorsanız (veya zaten kullanıyorsanız) — Verdaccio, JFrog Artifactory, Sonatype Nexus veya bir bulut sağlayıcısı npm registry'si — istemcileri bu registry'ye yönlendirin ve paket başına üst kaynağa kendisinin karar vermesine izin verin:

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

İstemci `.npmrc`:

```ini
registry=https://npm.example.com/
```

Özel registry'yi şu şekilde yapılandırın:

| Paket | Üst kaynak |
|---------|----------|
| `@mlightcad/foo` (genel paketler) | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

Ardından normal şekilde kurun:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

Halihazırda özel bir registry işletiyorsanız bu, uzun vadeli en temiz kurulumdur. Yalnızca bir veya iki GitHub Packages paketine ihtiyaç duyan küçük bir proje için Seçenek 2 genellikle daha hafiftir.

### Seçenek 2: `@mlightcad/dwg-converter` paketini bir GitHub Packages tarball URL'sine sabitleme

Paketi `package.json` içinde **tarball URL'sine** sabitleyin, böylece paket yöneticisi `@mlightcad` kapsam registry'si üzerinden çözümlemek yerine o URL'yi doğrudan indirir.

1. GitHub Packages'a kimlik doğrulaması yapın (bir tarball URL'si kimlik doğrulamayı **atlamaz**):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. İhtiyacınız olan sürümün tarball URL'sini çözümleyin.

   Bu komut için proje `.npmrc` dosyasına güvenmeyin. `npm view`, bir çalışma alanı paketinin `.npmrc` dosyasını yok sayar, bu nedenle o dosyadaki `${GITHUB_TOKEN}` hiçbir zaman uygulanmaz. Belirteci komut satırında geçin:

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   1. adımdaki `.npmrc` girdisi hâlâ gereklidir: `pnpm install` tarball'ı indirirken onu kullanır.

   Örnek çıktı:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Bu URL'yi `package.json` dosyasına koyun (**kendi** sürümünüzü ve tarball URL'nizi kullanın):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. Kurun:

   ```bash
   pnpm install
   ```

**Uyarılar**

- Yükseltmeler yeni bir tarball URL'si getirmeyi ve `package.json` / kilit dosyasını güncellemeyi gerektirir.
- CI ve yerel kurulumlar hâlâ okuma erişimine sahip geçerli bir GitHub belirteci gerektirir.
- GitHub Packages kimlik doğrulama girdisini `.npmrc` içinde tutun.

Seçenek 2, değerlendirme ve küçük ekipler için iyi çalışır. Sık yükseltmeler veya çok sayıda özel paket bekliyorsanız Seçenek 1'i (veya GitHub Packages'a eşlenmiş `@mlightcad-private/*` gibi ayrı bir özel kapsamı) tercih edin.

## Dönüştürücüyü Kaydetme

Tescilli ayrıştırıcı, açık kaynak yığınıyla aynı işlem hattına bağlanan **kaydedilebilir bir dönüştürücüdür**.

- Çıktı, MIT lisanslı **`@mlightcad/data-model`** ile uyumludur: `AcDbDatabase`, `AcDb*` varlıkları, katman tabloları, bloklar ve ilgili yapılar.
- Bunu, `AcDbLibreDwgConverter` tarafından kullanılan aynı mekanizma olan **`AcDbDatabaseConverterManager`** aracılığıyla kaydedin.
- Ayrıştırmadan sonra mevcut MIT işleme, katman, seçim ve etkileşim işlem hattı (`cad-simple-viewer`, `cad-viewer`, eklentiler vb.) değişmeden çalışır.

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

Paket bağımsız bir "DWG ayrıştır" API'si **sunmaz**. Açık kaynak [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) gibi **`AcDbDatabaseConverter`** arayüzünü uygular. Dönüştürmeden sonra ortaya çıkan çizimle `@mlightcad/data-model` üzerinden çalışın.

Uyumluluk için tescilli ayrıştırıcıya güveniyorsanız GPL tabanlı `libredwg-converter` paketini **ayrıca kaydetmeyin**.

Tam çalışan bir örnek (kimlik doğrulama, worker varlıkları, kayıt ve veritabanına göz atma) için [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example) sayfasına bakın.

## İlgili sayfalar

- [Worker URL'lerini Yapılandırma](./configure-worker-urls) — DWG/DXF ayrıştırıcıları için worker URL kurulumu
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — ticari lisans, deneme ve GPL notları
- [Geliştirme Kılavuzu](./) — geliştirici konularının dizini
