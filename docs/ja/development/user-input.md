---
title: "ユーザー入力"
---

# ユーザー入力

このページでは、AcEditor がユーザー入力を受け取る方法について説明します。利用可能な入力メソッド、共通のプロンプトオプションパターン（メッセージ、キーワード、Jig、ラバーバンド動作）、キーワードのマッチングルール、プロンプト結果の解釈方法を含みます。また、想定される使用方法も明確にします。入力はキャンバス上で手動のマウス/キーボードリスナーを使用するのではなく、AcEditor API を通じて取得する必要があります。

**目的**

AcEditor は、AutoCAD のエディタ入力 API の構造と意図を踏襲しています。動的なプロンプト、キーワード、プレビュー Jig を連携させながら、ユーザー入力を受け取るための高レベルで一貫した方法を提供します。入力処理は意図的に一元化されています。キーワードの解析とマウス操作は抽象化されており、AcEditor のメソッドを通じてアクセスする必要があります。技術的には `AcEdBaseView.canvas` でキーボードイベントやマウスイベントを直接リッスンできますが、それは不正確な使用方法と見なされ、エディタの入力ライフサイクル、キーワード処理、プロンプト結果の規約をバイパスします。

**入力メソッド**

| メソッド | オプションの型 | 結果の型 | 一般的な用途 |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | 点の取得 |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | 基点を任意で指定できる距離入力 |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | 基点を任意で指定できる角度入力 |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | 数値入力（浮動小数点） |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | 自由テキスト入力 |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | キーワードのみの入力（グローバルキーワードを返します） |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | 1 つのエンティティを選択 |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | 複数のエンティティを選択 |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | ボックスを定義する 2 つのコーナーを選択 |

**共通のプロンプトオプション**

すべてのプロンプトオプション型は `AcEdPromptOptions<T>` から派生し、次の機能を共有します：

- `message`：ユーザーに表示されるプロンプトテキスト。
- `keywords`：有効なキーワードを保持する `AcEdKeywordCollection`。
- `appendKeywordsToMessage`：true の場合、キーワードがメッセージに追加されて表示されます。
- `jig`：`AcEdPreviewJig<T>` をアタッチして、入力中のライブプレビューを有効にします。
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`：`"Pick point [Yes/No]"` のような結合されたメッセージを解析し、スペース区切りのリストからグローバルキーワードを割り当てます。

**ラバーバンドと基点の設定**

一部のプロンプトオプションは、ラバーバンドラインまたは基点の動作をサポートしています：

- `AcEdPromptPointOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`allowNone`。
- `AcEdPromptDistanceOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`only2d`。
- `AcEdPromptAngleOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`useAngleBase`。
- `AcEdPromptBoxOptions`：`useBasePoint`、`useDashedLine`、および個別の `firstCornerMessage` / `secondCornerMessage`。

`useBasePoint` が true の場合、エディタは基点からカーソルまでラバーバンドラインを描画します。`useDashedLine` はそのラインを破線にするかどうかを制御します。

**キーワードのルールと形式**

キーワードは `AcEdKeywordCollection` で定義され、大文字と小文字を区別せずにマッチングされます。解決される値は常にキーワードの**グローバル名**です。

- 各キーワードには、`displayName`（UI）、`globalName`（内部）、`localName`（ユーザー入力）があります。
- ユーザーは `localName`、`globalName`、表示テキスト、または派生エイリアスを入力でき、すべて大文字と小文字を区別せずにマッチングされます。
- エイリアスはグローバル名の大文字から派生します。たとえば、`Yes → Y`、`sAve → A`、`eXit → X` です。
- 入力の先頭に `_` を付けると、グローバルキーワードとのマッチングが強制されます。

キーワードは主に次の 2 つの方法で定義できます：

- API の使用法：`options.keywords.add(displayName, globalName, localName)`。
- ObjectARX スタイルの文字列リスト（`AcEdKeywordCollection` コンストラクター用）：ローカルセクションとグローバルセクションを `_` で区切り、任意でカンマによる省略形を指定し、大文字でエイリアスを定義します。

例：

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**プロンプト結果**

ほとんどの入力メソッドは、次の内容を含む `PromptResult` スタイルのオブジェクトを返します：

- `status`：`OK`、`Cancel`、`Keyword` などの `AcEdPromptStatus` コード。
- `stringResult`：`status === Keyword` の場合、マッチングされた**グローバルキーワード**を保持します。

タイプ固有の結果クラスは、`status === OK` の場合に型付きの `value` を提供します：

| 結果の型 | 値フィールド | 備考 |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | OK 時の点 |
| `AcEdPromptDoubleResult` | `value: number` | OK 時の double |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | 選択されたエンティティ ID |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | 選択セット |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | 境界ボックス |

注：`getKeywords` は `PromptResult` オブジェクトではなく、キーワード文字列を直接返します。

**例：キーワード付きの点入力**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```
