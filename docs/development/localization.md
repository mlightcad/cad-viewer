---
title: "Localization"
---

# Localization

This page explains **how to localize strings** when you create a new npm package that depends on **`@mlightcad/cad-simple-viewer`**, and how to **add localized strings for custom commands**.

The goal is:

-   Keep `@mlightcad/cad-simple-viewer` **framework-agnostic** (no Vue / React / i18n runtime dependency)
-   Allow **host applications** (Vue + `vue-i18n`, or others) to **merge and reuse the same messages**
-   Ensure **commands, prompts, and descriptions** are localized consistently

## Design Philosophy

``@mlightcad/cad-simple-viewer` provides a **minimal i18n registry** via `AcApI18n`:

-   No UI framework dependency
-   Message format compatible with `vue-i18n`
-   Supports **deep merging** from multiple packages
-   Provides a simple `t(key)` helper for core/editor logic

Think of `AcApI18n` as a **shared message registry**, not a full translation framework.

## Locale Message Structure

Messages are plain nested objects:

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

Keys are **dot-path addressable**:

```
AcApI18n.t('command.ACAD.line')
```

### Recommended Key Naming Convention

| Category    | Prefix    | Example                       |
| ----------- | --------- | ----------------------------- |
| Commands    | `command` | `command.ACAD.line`           |
| Jig prompts | `jig`     | `jig.ellipse.center`          |
| Dialogs     | `dialog`  | `dialog.confirm.ok`           |
| Entities    | `entity`  | `entity.property.color`       |
| App UI      | `main`    | `main.toolPalette.draw.title` |

## Creating Localized Strings in a New Package

### Define Messages Per Locale

Inside your package, create locale files:

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

Key name `ACAD` above is the command group name. 

### Register Messages with `AcApI18n`

Register messages **once**, usually during app or plugin initialization:

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

This works whether:

-   You use Vue + `vue-i18n`
-   You use another framework
-   You only rely on `AcApI18n.t()`

## Using with Vue + vue-i18n (Host Application)

In a Vue application, `AcApI18n` acts as the **single source of truth** for messages.

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

### Locale Synchronization (Recommended)

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

This ensures:

-   Core editor logic uses `AcApI18n.t()`
-   UI components use `vue-i18n`
-   Both always show the same language


## Summary

-   `AcApI18n` is a lightweight, framework-agnostic i18n registry

-   Plugin and app messages are merged via `mergeLocaleMessage`

-   Vue apps reuse the same messages through `vue-i18n`

This approach keeps **libraries clean**, **apps flexible**, and **localization consistent**.

