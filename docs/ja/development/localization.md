---
title: "ローカリゼーション"
---

# ローカリゼーション

このページでは、**`@mlightcad/cad-simple-viewer`** に依存する新しい npm パッケージを作成する際の**文字列のローカライズ方法**と、**カスタムコマンド用のローカライズ文字列の追加方法**を説明します。

目標は次のとおりです。

-   `@mlightcad/cad-simple-viewer` を**フレームワーク非依存**に保つ（Vue / React / i18n ランタイムへの依存なし）
-   **ホストアプリケーション**（Vue + `vue-i18n` など）が**同じメッセージをマージして再利用**できるようにする
-   **コマンド、プロンプト、説明**が一貫してローカライズされるようにする

## 設計思想

``@mlightcad/cad-simple-viewer` は、`AcApI18n` を通じて**最小限の i18n レジストリ**を提供します。

-   UI フレームワークへの依存なし
-   `vue-i18n` と互換性のあるメッセージ形式
-   複数のパッケージからの**ディープマージ**をサポート
-   コア/エディタロジック向けのシンプルな `t(key)` ヘルパーを提供

`AcApI18n` は、完全な翻訳フレームワークではなく、**共有メッセージレジストリ**と考えてください。

## ロケールメッセージの構造

メッセージはプレーンなネストされたオブジェクトです。

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

キーは**ドットパスで指定**できます。

```
AcApI18n.t('command.ACAD.line')
```

### 推奨されるキー命名規則

| カテゴリ    | プレフィックス | 例                            |
| ----------- | --------- | ----------------------------- |
| コマンド    | `command` | `command.ACAD.line`           |
| Jig プロンプト | `jig`     | `jig.ellipse.center`          |
| ダイアログ     | `dialog`  | `dialog.confirm.ok`           |
| エンティティ    | `entity`  | `entity.property.color`       |
| アプリ UI      | `main`    | `main.toolPalette.draw.title` |

## 新しいパッケージでのローカライズ文字列の作成

### ロケールごとにメッセージを定義する

パッケージ内にロケールファイルを作成します。

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

上記のキー名 `ACAD` はコマンドグループ名です。 

### `AcApI18n` でメッセージを登録する

メッセージは、通常はアプリまたはプラグインの初期化時に**1 度だけ**登録します。

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

これは次のいずれの場合でも機能します。

-   Vue + `vue-i18n` を使用する場合
-   別のフレームワークを使用する場合
-   `AcApI18n.t()` のみに依存する場合

## Vue + vue-i18n（ホストアプリケーション）での使用

Vue アプリケーションでは、`AcApI18n` がメッセージの**単一の信頼できる情報源**として機能します。

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

### ロケールの同期（推奨）

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

これにより、次のことが保証されます。

-   コアエディタロジックが `AcApI18n.t()` を使用する
-   UI コンポーネントが `vue-i18n` を使用する
-   両方が常に同じ言語を表示する


## まとめ

-   `AcApI18n` は軽量でフレームワーク非依存の i18n レジストリです

-   プラグインとアプリのメッセージは `mergeLocaleMessage` を介してマージされます

-   Vue アプリは `vue-i18n` を通じて同じメッセージを再利用します

このアプローチにより、**ライブラリはクリーン**に、**アプリは柔軟**に、**ローカリゼーションは一貫**した状態に保たれます。
