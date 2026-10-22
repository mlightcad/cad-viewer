---
title: "本地化"
---

# 本地化

本页介绍在创建一个依赖 **`@mlightcad/cad-simple-viewer`** 的新 npm 包时，**如何本地化字符串**，以及**如何为自定义命令添加本地化字符串**。

目标是：

-   保持 `@mlightcad/cad-simple-viewer` **与框架无关**（不依赖 Vue / React / i18n 运行时）
-   允许**宿主应用**（Vue + `vue-i18n` 或其他）**合并并复用相同的消息**
-   确保**命令、提示和描述**的本地化保持一致

## 设计理念

``@mlightcad/cad-simple-viewer` 通过 `AcApI18n` 提供一个**最小化的 i18n 注册表**：

-   不依赖 UI 框架
-   消息格式与 `vue-i18n` 兼容
-   支持来自多个包的**深度合并**
-   为核心/编辑器逻辑提供简单的 `t(key)` 辅助方法

可以把 `AcApI18n` 理解为**共享消息注册表**，而不是一个完整的翻译框架。

## 语言消息结构

消息是普通的嵌套对象：

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

键支持**点路径寻址**：

```
AcApI18n.t('command.ACAD.line')
```

### 推荐的键命名约定

| 类别        | 前缀      | 示例                          |
| ----------- | --------- | ----------------------------- |
| 命令        | `command` | `command.ACAD.line`           |
| Jig 提示    | `jig`     | `jig.ellipse.center`          |
| 对话框      | `dialog`  | `dialog.confirm.ok`           |
| 实体        | `entity`  | `entity.property.color`       |
| 应用 UI     | `main`    | `main.toolPalette.draw.title` |

## 在新包中创建本地化字符串

### 按语言定义消息

在你的包中创建语言文件：

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

上面的键名 `ACAD` 是命令组名。

### 使用 `AcApI18n` 注册消息

**只需注册一次**，通常在应用或插件初始化期间：

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

无论以下哪种情况都适用：

-   使用 Vue + `vue-i18n`
-   使用其他框架
-   仅依赖 `AcApI18n.t()`

## 与 Vue + vue-i18n 配合使用（宿主应用）

在 Vue 应用中，`AcApI18n` 充当消息的**单一事实来源**。

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

### 语言同步（推荐）

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

这确保了：

-   核心编辑器逻辑使用 `AcApI18n.t()`
-   UI 组件使用 `vue-i18n`
-   两者始终显示相同的语言


## 总结

-   `AcApI18n` 是一个轻量、与框架无关的 i18n 注册表

-   插件和应用的消息通过 `mergeLocaleMessage` 合并

-   Vue 应用通过 `vue-i18n` 复用相同的消息

这种方式使**库保持干净**、**应用保持灵活**、**本地化保持一致**。
