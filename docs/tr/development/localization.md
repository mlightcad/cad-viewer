---
title: "Yerelleştirme"
---

# Yerelleştirme

Bu sayfa, **`@mlightcad/cad-simple-viewer`** paketine bağımlı yeni bir npm paketi oluşturduğunuzda **metinleri nasıl yerelleştireceğinizi** ve **özel komutlar için yerelleştirilmiş metinleri nasıl ekleyeceğinizi** açıklar.

Amaç şudur:

-   `@mlightcad/cad-simple-viewer` paketini **çerçeveden bağımsız** tutmak (Vue / React / i18n çalışma zamanı bağımlılığı yok)
-   **Ana uygulamaların** (Vue + `vue-i18n` veya diğerleri) **aynı mesajları birleştirmesine ve yeniden kullanmasına** izin vermek
-   **Komutların, istemlerin ve açıklamaların** tutarlı şekilde yerelleştirilmesini sağlamak

## Tasarım Felsefesi

`@mlightcad/cad-simple-viewer`, `AcApI18n` aracılığıyla **minimal bir i18n kayıt defteri** sağlar:

-   Arayüz çerçevesi bağımlılığı yok
-   `vue-i18n` ile uyumlu mesaj biçimi
-   Birden fazla paketten **derin birleştirmeyi** destekler
-   Çekirdek/düzenleyici mantığı için basit bir `t(key)` yardımcısı sunar

`AcApI18n`'i tam bir çeviri çerçevesi değil, **paylaşılan bir mesaj kayıt defteri** olarak düşünün.

## Yerel Ayarlı Mesaj Yapısı

Mesajlar düz iç içe nesnelerdir:

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

Anahtarlar **nokta yoluyla adreslenebilir**:

```
AcApI18n.t('command.ACAD.line')
```

### Önerilen Anahtar Adlandırma Kuralı

| Kategori    | Önek    | Örnek                       |
| ----------- | --------- | ---------------------------- |
| Komutlar    | `command` | `command.ACAD.line`           |
| Jig istemleri | `jig`     | `jig.ellipse.center`          |
| İletişim kutuları     | `dialog`  | `dialog.confirm.ok`           |
| Varlıklar    | `entity`  | `entity.property.color`       |
| Uygulama arayüzü      | `main`    | `main.toolPalette.draw.title` |

## Yeni Bir Pakette Yerelleştirilmiş Metinler Oluşturma

### Her Yerel Ayar için Mesajları Tanımlayın

Paketinizin içinde yerel ayar dosyaları oluşturun:

```
my-plugin/
 └─ i18n/
    ├─ en.ts
    └─ zh.ts
```

**`en.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: 'Create something'
      }
    }
  },
  jig: {
    mycmd: {
      start: 'Specify start point:',
      end: 'Specify end point:'
    }
  }
}
```

**`zh.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: '创建对象'
      }
    }
  },
  jig: {
    mycmd: {
      start: '指定起点：',
      end: '指定终点：'
    }
  }
}
```

Yukarıdaki `ACAD` anahtar adı, komut grubu adıdır. 

### Mesajları `AcApI18n` ile Kaydedin

Mesajları **bir kez**, genellikle uygulama veya eklenti başlatılırken kaydedin:

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

Bu, şu durumlarda çalışır:

-   Vue + `vue-i18n` kullanıyorsanız
-   Başka bir çerçeve kullanıyorsanız
-   Yalnızca `AcApI18n.t()` metoduna güveniyorsanız

## Vue + vue-i18n ile Kullanma (Ana Uygulama)

Bir Vue uygulamasında `AcApI18n`, mesajlar için **tek doğruluk kaynağı** olarak işlev görür.

```
import { createI18n } from 'vue-i18n'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: AcApI18n.messages,
  globalInjection: true
})
```

### Yerel Ayar Senkronizasyonu (Önerilir)

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

Bu şunları sağlar:

-   Çekirdek düzenleyici mantığı `AcApI18n.t()` kullanır
-   Arayüz bileşenleri `vue-i18n` kullanır
-   Her ikisi de her zaman aynı dili gösterir


## Özet

-   `AcApI18n` hafif ve çerçeveden bağımsız bir i18n kayıt defteridir

-   Eklenti ve uygulama mesajları `mergeLocaleMessage` aracılığıyla birleştirilir

-   Vue uygulamaları aynı mesajları `vue-i18n` üzerinden yeniden kullanır

Bu yaklaşım **kütüphaneleri temiz**, **uygulamaları esnek** ve **yerelleştirmeyi tutarlı** tutar.
