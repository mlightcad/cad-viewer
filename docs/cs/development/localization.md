---
title: "Lokalizace"
---

# Lokalizace

Tato stránka vysvětluje, **jak lokalizovat řetězce**, když vytváříte nový balíček npm, který závisí na **`@mlightcad/cad-simple-viewer`**, a **jak přidat lokalizované řetězce pro vlastní příkazy**.

Cílem je:

-   Zachovat **`@mlightcad/cad-simple-viewer` nezávislý na frameworku** (bez běhové závislosti na Vue / React / i18n)
-   Umožnit **hostitelským aplikacím** (Vue + `vue-i18n` nebo jiným) **sloučit a znovu používat stejné zprávy**
-   Zajistit, aby **příkazy, výzvy a popisy** byly lokalizovány konzistentně

## Filozofie návrhu

``@mlightcad/cad-simple-viewer` poskytuje **minimální registr i18n** prostřednictvím `AcApI18n`:

-   Žádná závislost na UI frameworku
-   Formát zpráv kompatibilní s `vue-i18n`
-   Podpora **hlubokého slučování** z více balíčků
-   Jednoduchý pomocník `t(key)` pro logiku jádra/editoru

Chápejte `AcApI18n` jako **sdílený registr zpráv**, nikoli jako plnohodnotný překladový framework.

## Struktura zpráv pro locale

Zprávy jsou obyčejné vnořené objekty:

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

Klíče jsou **adresovatelné pomocí tečkové cesty**:

```
AcApI18n.t('command.ACAD.line')
```

### Doporučená konvence pojmenování klíčů

| Kategorie    | Předpona  | Příklad                       |
| ------------ | --------- | ----------------------------- |
| Příkazy      | `command` | `command.ACAD.line`           |
| Výzvy Jig    | `jig`     | `jig.ellipse.center`          |
| Dialogy      | `dialog`  | `dialog.confirm.ok`           |
| Entity       | `entity`  | `entity.property.color`       |
| UI aplikace  | `main`    | `main.toolPalette.draw.title` |

## Vytváření lokalizovaných řetězců v novém balíčku

### Definujte zprávy pro každé locale

Uvnitř svého balíčku vytvořte soubory s lokalizacemi:

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

Název klíče `ACAD` výše je název skupiny příkazů. 

### Registrace zpráv pomocí `AcApI18n`

Zprávy zaregistrujte **jednou**, obvykle během inicializace aplikace nebo pluginu:

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

Toto funguje, ať už:

-   Používáte Vue + `vue-i18n`
-   Používáte jiný framework
-   Spoléháte pouze na `AcApI18n.t()`

## Použití s Vue + vue-i18n (hostitelská aplikace)

Ve Vue aplikaci funguje `AcApI18n` jako **jediný zdroj pravdy** pro zprávy.

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

### Synchronizace locale (doporučeno)

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

To zajišťuje:

-   Logika jádra editoru používá `AcApI18n.t()`
-   Komponenty uživatelského rozhraní používají `vue-i18n`
-   Oba vždy zobrazují stejný jazyk


## Shrnutí

-   `AcApI18n` je lehký registr i18n nezávislý na frameworku

-   Zprávy pluginů a aplikací se slučují pomocí `mergeLocaleMessage`

-   Vue aplikace znovu používají stejné zprávy prostřednictvím `vue-i18n`

Tento přístup udržuje **knihovny čisté**, **aplikace flexibilní** a **lokalizaci konzistentní**.
