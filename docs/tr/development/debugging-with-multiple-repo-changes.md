---
title: "Birden Fazla Depo Değişikliğiyle Hata Ayıklama"
---

# Birden Fazla Depo Değişikliğiyle Hata Ayıklama

`cad-viewer` deposu, diğer MLight depolarındaki paketlere bağımlıdır, örneğin:

- Depo **`cad-viewer`**
  - paket: `@mlightcad/cad-simple-viewer`
- Depo **`realdwg-web`**
  - paketler: `@mlightcad/data-model`, `@mlightcad/libredwg-converter`
- Depo **`mtext-renderer`**
  - paketler: `@mlightcad/mtext-renderer`, `@mlightcad/mtext-input-box`, `@mlightcad/mtext-parser`

Örnek bağımlılık zinciri:

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

Geliştirme sırasında, `cad-viewer` içinde hemen düzeltilmesi ve test edilmesi gereken hatalar `realdwg-web` veya `mtext-renderer` içinde bulunabilir.

## `pnpm link` ile ilgili sorun

Birden fazla monorepo arasında `pnpm link` kullanmak birkaç soruna yol açar:

- Karmaşık kurulum ve kaldırma
- Bağlantı kaldırma adımlarını unutmak kolaydır
- `node_modules` durumu hakkında akıl yürütmek zorlaşır
- CI / yeniden üretilebilirliği bozar
- Yeni geliştiricilerin takip etmesi zordur

Yerel hata ayıklamayı basitleştirmek için pnpm overrides ile **yerel dizin bağımlılığı** yaklaşımını benimsiyoruz.

## Çözüm: pnpm overrides ile Yerel Dizin Bağımlılıklarını Kullanma

Paketleri yayımlamak veya bağlamak yerine, diğer depolardaki paketlerin yerel dosya sistemi yoluna doğrudan başvurmak için `pnpm-workspace.yaml` içindeki `overrides` ayarını geçici olarak değiştiriyoruz.

Merkezi sürüm yönetimi `pnpm-workspace.yaml` içinde yer alır:

- Yayımlanan semver aralıkları (örneğin `^1.8.3`) sürümler için doğruluk kaynağıdır
- `pnpm sync:versions` bu değerleri her `packages/*/package.json` içine yayar
- CI ve sürüm betiği, her şeyin uyumlu kalmasını sağlamak için `pnpm sync:versions:check` çalıştırır

Kısa vadeli hata ayıklama için bir semver override'ını `file:` yoluyla değiştirin. Bu yaklaşım:

✅ `pnpm` ile doğal olarak çalışır  
✅ Genel bağlantı gerektirmez  
✅ Açıktır ve geri alınması kolaydır  
✅ Kısa vadeli hata ayıklama için uygundur  
✅ Bağımlılık çözümlemesini öngörülebilir tutar  
✅ Monorepo içindeki tüm paketlere uygulanır

## Dizin Düzeni (Önerilir)

Depoları yan yana yerleştirin:

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ Bu düzen **zorunlu değildir**, ancak göreli yolların yönetimi daha kolay olacaktır.

## Adım Adım Kılavuz

### 1. `pnpm-workspace.yaml` içine yerel `file:` override'ları ekleyin

`cad-viewer/pnpm-workspace.yaml` içinde, hata ayıklamak istediğiniz semver girdilerini geçici olarak yerel yollarla değiştirin.

Normal (yayımlanmış) override'lar şöyle görünür:

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

Yerel hata ayıklama için yalnızca test etmeniz gereken paketleri değiştirin:

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> Dizin yapınız farklıysa göreli yolları ayarlayın.  
> Override'ları kök `package.json` içine **koymayın**; bunlar `pnpm-workspace.yaml` içine aittir.

### 2. Bağımlılıkları Yükleyin

**`cad-viewer` kökünden**:

```
pnpm install
```

pnpm şunları yapar:

- Override edilen paketleri yerel dizinlerden çözümler
- `node_modules` içinde sembolik bağlantılar oluşturur
- Bunları dosya tabanlı bağımlılıklar olarak izler

### 3. Bağımlılıkları derleyin (Gerekirse)

Üst kaynak paket bir derleme adımı gerektiriyorsa (TypeScript, paketleme vb.):

```
cd ../realdwg-web
pnpm install
pnpm build
```

Aktif geliştirme için şunları da çalıştırabilirsiniz:

```
pnpm dev
```

veya destekleniyorsa bir izleme modu. O depodaki paketlerde hata ayıklarken aynı adımları `mtext-renderer` içinde tekrarlayın.

### 4. Normal Şekilde Hata Ayıklayın

Artık şunları yapabilirsiniz:

- Üst kaynak depo içindeki kodu değiştirin (örneğin `realdwg-web/packages/data-model`)
- Yeniden derleyin (veya izleme modunun yeniden derlemesine izin verin)
- Değişiklikleri `cad-viewer` içinde anında test edin

Bağlama, yayımlama veya yeniden yükleme gerekmez.

## Yayımlanmış Paketlere Geri Dönme

Hata ayıklama tamamlandıktan sonra:

1. `cad-viewer/pnpm-workspace.yaml` içindeki semver override'larını geri yükleyin (tüm `file:` yollarını kaldırın).
2. Bağımlılık sürümlerini çalışma alanı paketlerine senkronize edin:

```
pnpm sync:versions
```

3. Bağımlılıkları yeniden yükleyin:

```
pnpm install
```

4. `pnpm sync:versions` tarafından üretilen tüm `package.json` değişikliklerini geri yüklenen `pnpm-workspace.yaml` ile birlikte işleyin.

Bu şunları sağlar:

- CI tutarlılığı
- Temiz bağımlılık grafiği
- Yanlışlıkla yerel yolların işlenmemesi

## Sürüm veya PR Öncesinde Sürüm Senkronizasyonu

Bir PR açmadan veya sürüm çalıştırmadan önce bağımlılık sürümlerinin uyumlu olduğundan emin olun:

```
pnpm sync:versions
```

Bu, `pnpm-workspace.yaml` içindeki `overrides` ayarını okur ve her `packages/*/package.json` içindeki eşleşen girdileri günceller.

Dosya yazmadan doğrulamak için:

```
pnpm sync:versions:check
```

Sürüm betiği (`pnpm release`) ve CI, kontrolü otomatik olarak çalıştırır. Sürümler senkron değilse `pnpm sync:versions` ile düzeltin, işleyin ve yeniden deneyin.

Harici bir bağımlılığı yükseltirken tipik iş akışı:

1. `pnpm-workspace.yaml` `overrides` içindeki semver'i güncelleyin
2. `pnpm sync:versions` çalıştırın
3. `pnpm install` çalıştırın
4. Test edin, işleyin ve bir PR açın

## ⚠️ Önemli Notlar

### Yerel Yolları İşlemeyin

Yerel `file:` override'ları **yalnızca geliştirici içindir**.

İşlemeden önce:

- `pnpm-workspace.yaml` dosyasının `file:` yolları **içermediğinden** emin olun
- Her `package.json` dosyasının yayımlanmış semver override'larıyla eşleşmesi için `pnpm sync:versions` çalıştırın
- PR'lar ve sürümler için yayımlanmış sürümleri kullanın

### Bu Yaklaşım Ne Zaman Kullanılmalı

✅ Depolar arası hataları düzeltirken  
✅ Entegrasyon sorunlarında hata ayıklarken  
✅ Yayımlamadan hızlı yineleme yaparken  
❌ Uzun vadeli bağımlılık yönetimi için  
❌ CI / üretim derlemeleri için

## Karşılaştırma: `pnpm link` ile pnpm overrides kullanan Yerel Yol

| Yön               | pnpm link | pnpm overrides ile yerel yol |
| ---------------- | --------- | ------------------------------- |
| Kurulum karmaşıklığı | Yüksek     | Düşük                           |
| Açıklık          | Örtük     | Açık                            |
| Geri alınması kolay   | ❌         | ✅                               |
| CI'ya uygun       | ❌         | ❌ (yalnızca geliştirme)          |
| Ekip dostu       | ❌         | ✅                               |

## Özet

**`cad-viewer`** ile **`realdwg-web`** veya **`mtext-renderer`** gibi üst kaynak depoları kapsayan sorunlarda hata ayıklamak için geçici olarak **`pnpm-workspace.yaml` içindeki `file:` override'larını** kullanın.

Bu yaklaşım:

- Basittir
- Şeffaftır
- Öğretmesi kolaydır
- Geri alması kolaydır
- Monorepo içindeki tüm paketlere uygulanır

Hata ayıklamayı bitirdiğinizde — veya herhangi bir sürümden önce — semver override'larını geri yükleyin, **`pnpm sync:versions`** çalıştırın ve senkronize edilmiş `package.json` dosyalarını işleyin.
