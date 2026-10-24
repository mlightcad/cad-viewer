---
title: "Kendinde Barındırılan Yazı Tipleri ve Şablonlar"
---

# Kendinde Barındırılan Yazı Tipleri ve Şablonlar

Bu kılavuz, yazı tiplerini ve DWG/DXF şablonlarını kendi sunucunuzda nasıl dağıtacağınızı açıklar.

## Genel Bakış

**cad viewer**, yazı tiplerini ve şablonları yüklemek için belirli bir dizin yapısı bekler. Bu yapıyı izleyerek, [GitHub'daki varsayılan sunucuyu](https://github.com/mlightcad/cad-data/) kullanmak yerine kendi yazı tiplerinizi ve şablonlarınızı barındırabilirsiniz.

Yazı tiplerini ve şablonları [cad-data](https://github.com/mlightcad/cad-data) paketinin yerel bir kopyasından (git alt modülü) sunan ve hem canlı görüntüleyicide hem de başsız CLI'da `baseUrl` ayarlayan çalışan bir Next.js örneği için [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) sayfasına bakın.

## Dizin Yapısı

Sunucunuz [mlightcad/cad-data deposuyla](https://github.com/mlightcad/cad-data) aynı yapıyı izlemelidir:

```
your-base-url/
├── fonts/                    # Font files directory
│   ├── arial.ttf
│   ├── simkai.ttf
│   ├── custom-font.shx
│   └── ...
├── templates/                # DWG/DXF template files directory
│   ├── acadiso.dxf
│   ├── custom-template.dwg
│   └── ...
└── fonts.json               # Font metadata configuration file
```

## Yapılandırma

### Temel URL'yi Ayarlama

Uygulamanızda `baseUrl` özelliğini sunucunuza işaret edecek şekilde yapılandırın:

#### Vue Bileşeninde
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### TypeScript/JavaScript İçinde
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### cad-simple-viewer-cli (başsız CLI) İçinde

> **`@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2 sürümünden itibaren kullanılabilir.**

Başsız CLI'ı kendinde barındırılan bir yazı tipi/şablon sunucusuna karşı çalıştırdığınızda temel URL'nizi geçirmeniz gerekir. Aksi halde CLI varsayılan CDN `cad-data` URL'sini kullanmaya devam eder ve yazı tiplerini veya şablonları sunucunuzdan yüklemez.

**Komut satırı** (`--base-url`):

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**Programatik API** (`runHeadless`):

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

Yazı tipleri `<base-url>/fonts/` konumundan yüklenir (örneğin `https://your-server.com/cad-data/fonts/`). URL `http` veya `https` olmalıdır.

### Varsayılan Davranış

`baseUrl` sağlanmazsa, görüntüleyici varsayılan URL'yi kullanır: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

## Yazı Tipi Yönetimi

### Yazı Tipleri Dizini

Tüm yazı tipi dosyalarını `fonts/` dizinine yerleştirin. Desteklenen yazı tipi biçimleri şunlardır:
- **TTF** (TrueType Font) - `.ttf` dosyaları
- **SHX** (AutoCAD Shape Font) - `.shx` dosyaları
- **OTF** (OpenType Font) - `.otf` dosyaları

### Fonts.json Yapılandırması

`fonts.json` dosyası, mevcut her yazı tipi için meta veriler içeren bir JSON dizisidir. Bu dosya, temel URL'nizin kökünde bulunmalıdır.

#### Dosya Yapısı

```json
[
  {
    "name": ["Arial"],
    "file": "arial.ttf",
    "type": "mesh",
    "description": "Standard Arial font for text rendering"
  },
  {
    "name": ["SimKai"],
    "file": "simkai.ttf", 
    "type": "mesh",
    "description": "Chinese Kai font for CJK text support"
  },
  {
    "name": ["Custom SHX Font"],
    "file": "custom.shx",
    "type": "shx",
    "description": "Custom AutoCAD shape font",
    "encoding": "gbk"
  }
]
```

#### Alan Açıklamaları

| Alan | Tür | Zorunlu | Açıklama |
|-------|------|----------|-------------|
| `name` | string dizisi | Evet | DWG/DXF dosyalarında kullanılan yazı tipi adı. Bir yazı tipinin birden çok adı olabilir. |
| `file` | string | Evet | `fonts/` dizininde bulunan yazı tipi dosyasının adı. Tam olarak eşleşmelidir. |
| `type` | string | Evet | Yazı tipi türü/biçimi. Yaygın değerler: `"mesh"` ve `"shx"`. `"mesh"`, `"ttf"`, `"otf"` ve `"woff"` yazı tiplerini ifade eder. |
| `description` | string | Hayır | Yazı tipinin amacı veya özellikleri hakkında isteğe bağlı açıklama. |
| `encoding` | string | Hayır | Yazı tipinin kodlaması hakkında isteğe bağlı açıklama; [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding) içinde bulunan değerlerden biri olabilir. Bu özellik yalnızca yazı tipi [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) veya [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D) ise gereklidir. |

### Yeni Yazı Tipleri Ekleme

Sunucunuza yeni bir yazı tipi eklemek için:

1. **Yazı tipi dosyasını yükleyin** `fonts/` dizinine
2. **`fonts.json` dosyasını güncelleyin** yeni bir girdi ekleyerek:

```json
[
  // ... existing fonts ...
  {
    "name": "My Custom Font",
    "file": "my-custom-font.ttf",
    "type": "mesh",
    "description": "Custom font for specific project needs"
  }
]
```

3. **Yazı tipi yüklemesini test edin** uygulamanızda:

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## Şablon Yönetimi

### Şablonlar Dizini

DWG ve DXF şablon dosyalarını `templates/` dizinine yerleştirin. Bu şablonlar yeni belgeler oluşturulurken kullanılır.

### Varsayılan Şablon

Kitaplık, `templates/` dizininde `acadiso.dxf` adlı bir varsayılan şablon bekler. Bu şablon "Quick New" komutu (`AcApQNewCmd`) tarafından kullanılır.

### Özel Şablonlar Ekleme

1. **Şablon dosyalarını yükleyin** `templates/` dizinine
2. **Şablonlara başvurun** uygulamanızda:

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## Sunucu Gereksinimleri

### CORS Yapılandırması

Sunucunuzun MLightCAD'ın kaynakları yüklemesi için çapraz kaynak isteklerine izin verdiğinden emin olun:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME Türleri

Sunucunuzu yazı tipi dosyalarını doğru MIME türleriyle sunacak şekilde yapılandırın:

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Örnek Nginx Yapılandırması

```nginx
location /cad-data/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    location ~* \.(ttf|otf|shx)$ {
        add_header Content-Type font/ttf;
    }
    
    location ~* \.(dwg|dxf)$ {
        add_header Content-Type application/octet-stream;
    }
}
```

## Hata İşleme

Kitaplık, yazı tipi yükleme sorunları için olay işleyicileri sağlar:

```typescript
import { eventBus } from '@mlightcad/cad-simple-viewer'

// Handle fonts that cannot be found
eventBus.on('fonts-not-found', (params) => {
  console.warn('Fonts not found:', params.fonts)
  // Implement fallback logic or user notification
})

// Handle fonts that fail to load
eventBus.on('fonts-not-loaded', (params) => {
  console.error('Fonts failed to load:', params.fonts)
  // Implement error handling or user notification
})
```

## En İyi Uygulamalar

1. **Sürüm Kontrolü**: Yazı tipi eklemelerini ve değişikliklerini izlemek için `fonts.json` dosyanızı sürüm kontrolünde tutun
2. **Yazı Tipi Optimizasyonu**: Yükleme sürelerini azaltmak için mümkün olduğunda sıkıştırılmış yazı tipi biçimlerini (`woff`) kullanın
3. **Test Etme**: Uyumluluğu sağlamak için yazı tipi yüklemeyi farklı CAD dosyalarıyla test edin
4. **Belgelendirme**: Ekip üyeleri için özel yazı tiplerinizi ve şablonlarınızı belgeleyin

## Sorun Giderme

### Yaygın Sorunlar

1. **Yazı tipleri yüklenmiyor**: `fonts.json` dosyasının `{baseUrl}/fonts.json` adresinde erişilebilir olduğunu kontrol edin
2. **CORS hataları**: Sunucunuzun çapraz kaynak isteklerine izin verdiğinden emin olun
3. **404 hataları**: `fonts.json` içindeki dosya yollarının gerçek dosya adlarıyla eşleştiğini doğrulayın
4. **MIME türü sorunları**: Sunucunuzu yazı tiplerini doğru MIME türleriyle sunacak şekilde yapılandırın

### Hata Ayıklama

Ağ isteklerini izlemek ve şunları kontrol etmek için tarayıcı geliştirici araçlarını etkinleştirin:
- `fonts.json` dosyasının başarıyla yüklenmesi
- Yazı tipi dosyası indirmeleri
- CORS başlıkları
- HTTP durum kodları

## Örnek Uygulama

Aşağıda özel bir yazı tipi ve şablon sunucusu kurmanın tam bir örneği verilmiştir:

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

Bu kurulum, beklenen yapıyla uyumluluğu korurken uygulamanızın kullanabileceği yazı tiplerini ve şablonları tamamen özelleştirmenize olanak tanır.
