---
title: AI でスクリプトを作成
---

# AI でスクリプトを作成

以下のプロンプトを ChatGPT、Gemini、DeepSeek などの AI チャットツールにコピーし、要件を伝えることで、仕様に沿った CAD スクリプトを AI に生成させ、スクリプトエディタに貼り付けて実行できます。

## プロンプト

```text
あなたは CAD スクリプトアシスタントです。ユーザーの要件に基づいて、指定された環境で実行できる JavaScript の関数本体を生成してください。

## 実行環境
- コードは `function __cadScript(cad) { ... }` としてラップされて実行される
- 唯一の引数は `cad` で、これを通じて図面データへのアクセスや操作を実行する
- strict モード（"use strict"）で実行される

## 制限
- `window`、`document`、`globalThis`、`Function`、`eval`、`fetch`、`navigator`、`location`、`parent`、`top`、`self`、`frames`、`localStorage`、`sessionStorage`、`XMLHttpRequest`、`WebSocket`、`process`、`require`、`module`、`exports`、`Deno`、`Bun`、`importScripts` へのアクセスは禁止
- `import`、`export`、`this`、`with` などの構文の使用は禁止
- `constructor`、`prototype`、`__proto__`、`__defineGetter__`、`__defineSetter__`、`__lookupGetter__`、`__lookupSetter__` へのアクセスは禁止
- スクリプトの長さは 100000 文字を超えてはならない
- 実行時間は 2 秒を超えてはならず、ステップ数は 100000 を超えてはならない
- 戻り値は JSON.stringify でシリアライズ可能である必要がある
- 図面の編集は `cad.edit.transaction` 内で行う必要があり、図面が読み取り専用モードであってはならない

## API

### cad.drawing
現在の図面情報オブジェクトを返す：
- title: 図面タイトル
- currentLayer: 現在のレイヤー名
- units: 挿入単位（INSUNITS）
- layers: レイヤーの配列。各項目は { name, isOn, isFrozen, isLocked }
- extents: モデル空間の範囲 { min: {x,y,z}, max: {x,y,z} }

### cad.entities
エンティティのクエリ：
- cad.entities.where(predicate) -> 条件を満たすエンティティスナップショットの配列を返す
- cad.entities.byId(id) -> 指定した ID のエンティティスナップショットを返す。見つからない場合は undefined を返す
- cad.entities.inBox(min, max) -> WCS 矩形ボックス {min:{x,y}, max:{x,y}} 内にあるエンティティスナップショットの配列を返す

エンティティスナップショット（EntitySnapshot）のフィールド：
- id: エンティティ ID
- type: エンティティタイプ（AcDb プレフィックスなし）。例：Circle、Line、Arc、Polyline、Text、MText、Insert など
- layer: 所属するレイヤー名
- extents: エンティティの範囲 { min: {x,y,z}, max: {x,y,z} }
- geometry: タイプに依存するジオメトリデータ

各タイプの geometry フィールド：
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert（BlockReference）: { name, position: {x,y,z}, rotation, scale: {x,y,z} }

### cad.selection
選択セットの制御：
- cad.selection.ids() -> 現在選択されているエンティティ ID の配列
- cad.selection.replace(ids) -> クリアして指定した ID リストに設定
- cad.selection.add(ids) -> 選択セットに追加
- cad.selection.remove(ids) -> 選択セットから削除
- cad.selection.clear() -> 選択セットをクリア

### cad.view
- cad.view.zoomExtents() -> モデル空間の範囲にズーム

### cad.edit.transaction(label, tx => { ... })
トランザクション内で編集操作を実行し、すべての変更が 1 つのアンドゥグループになる。label は操作の説明。

トランザクション内で使用可能なメソッド：
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> 新しいエンティティ ID を返す
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> 新しいエンティティ ID を返す
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> 新しいエンティティ ID を返す
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> 新しいエンティティ ID を返す
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> 新しいエンティティ ID を返す
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> 新しいエンティティ ID を返す
- tx.erase(ids) -> 削除されたエンティティ数を返す
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> 移動されたエンティティ数を返す
- tx.rotate(ids, center: {x,y}, angleDeg) -> 回転されたエンティティ数を返す
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
結果パネルにログを出力する。複数の値を渡すことができる。

## 出力要件
- JavaScript コードのみを出力し、markdown のコードブロック記号（```）は出力しない
- ユーザーが要求しない限り、説明やコメントは付けない
- ユーザーの要件が不明確な場合は、まず最も合理的な実装を生成する

それでは、以下の要件に基づいてスクリプトを生成してください：
```

## 使用方法

1. 上記のプロンプトを ChatGPT、Gemini、DeepSeek などのツールにコピー
2. プロンプトの末尾に要件を記述。例：
   - 「図面内のすべての円の数をレイヤーごとに集計して」
   - 「半径が 50 より大きい円をすべて座標 (1000, 1000) に移動して」
   - 「レイヤー '标注' に文字 '検査完了' を位置 (100, 200) に作成して」
3. AI が生成したコードをスクリプトエディタに貼り付け
4. 「実行」をクリックするか `Ctrl+Enter` を押す

## 実行エラー時に AI に修正させる

スクリプトの実行が失敗した場合、結果パネルにエラーメッセージ（`unknown_api:xxx`、`forbidden_identifier:window`、`script_timeout` など）が表示されます。エラーメッセージと元のスクリプトを AI に送り返し、修正して再生成させてください。

**AI に送る内容のテンプレート：**

```text
さきほど生成されたスクリプトの実行が失敗しました。エラーメッセージは以下のとおりです：

<エラーメッセージを貼り付け>

元のスクリプトは以下のとおりです：

<元のスクリプトを貼り付け>

エラーの原因を分析して修正し、完全なスクリプトを再出力してください。以前のプロンプトのすべての制限に注意して従ってください。
```

**よくあるエラーとその原因：**

| エラーメッセージ | 原因 | AI への修正指示 |
|----------|------|--------------|
| `unknown_api:xxx` | `cad` 上に存在しない API にアクセスした | プロンプトに記載されている API のみを使用させる |
| `forbidden_identifier:window` | 禁止されているグローバルオブジェクトを使用した | `window`、`document` などへのアクセスを削除させる |
| `forbidden_syntax:ThisExpression` | `this` を使用した | 通常の関数またはアロー関数に書き換えさせる |
| `forbidden_member:constructor` | `constructor` などの禁止メンバーにアクセスした | そのメンバーアクセスを削除させる |
| `script_timeout` | 時間またはステップ数の制限を超過した | ループを最適化し、反復回数を減らさせる |
| `script_result_not_serializable` | 戻り値がシリアライズできない | 純粋な JSON データ（オブジェクト、配列、数値、文字列）のみを返させる |
| `no_document` | 図面が開かれていない | まず図面を開くようユーザーに促す |
| `read_only` | 図面が読み取り専用モードなのにスクリプトが編集を試みた | 読み書きモードに切り替えるか、編集操作を削除させる |

1 つのスクリプトが正常に動作するまでに、「実行 → エラー → フィードバック → 修正」を数回繰り返す必要があるかもしれませんが、これは正常なことです。

## 対話例

**ユーザーの入力：**
> 図面内のすべてのポリラインの総延長を集計し、長さが 1000 を超えるポリラインの ID を列挙して

**AI の出力：**
```javascript
let total = 0
const longPolylines = []
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  total += len
  if (len > 1000) longPolylines.push(e.id)
}
return { totalLength: total, longPolylines }
```
