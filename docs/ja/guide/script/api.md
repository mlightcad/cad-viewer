---
title: スクリプト API
---

# スクリプト API

スクリプトでは `cad` オブジェクトを通じて図面と対話します。`CAD_SCRIPT_API_TREE` で宣言されたメンバーのみアクセス可能で、それ以外のプロパティにアクセスすると `unknown_api` エラーが発生します。

## 実行環境とブラウザー API

スクリプトはブラウザーの strict モードのサンドボックス内で実行され、`cad` オブジェクトと ECMAScript 標準組み込みオブジェクトのみにアクセスできます。ページの DOM を操作したり、ネットワークリクエストを送信したりすることはできません。

### 利用可能な組み込みオブジェクト

すべての ECMAScript 標準組み込みオブジェクトが使用できます：

- 数学と数値：`Math`、`Number`、`BigInt`、`parseFloat`、`parseInt`、`isNaN`、`isFinite`
- データ構造：`Object`、`Array`、`Map`、`Set`、`WeakMap`、`WeakSet`、`Symbol`
- テキストとフォーマット：`String`、`JSON`、`RegExp`、`Intl`、`encodeURIComponent`、`decodeURIComponent`
- 時間：`Date`（`Date.now()` はスクリプト自体の処理時間の計測に使用できます）
- その他：`Boolean`、`Promise`、`Error` とそのサブクラス

情報の出力には `cad.log()` を使用してください。`console.log` に頼らないでください——結果パネルには `cad.log` の内容のみが表示されます。

### 禁止されているブラウザー API

以下の内容はスクリプトの検証段階で直接拒否され、`forbidden_identifier` / `forbidden_syntax` / `forbidden_member` エラーが発生します：

- ページと DOM：`window`、`document`、`globalThis`
- ネットワークと通信：`fetch`、`XMLHttpRequest`、`WebSocket`、`importScripts`
- デバイスと環境：`navigator`、`location`、`parent`、`top`、`self`、`frames`（実行時は `undefined` にマスクされます）
- ストレージ：`localStorage`、`sessionStorage`
- 動的実行：`eval`、`Function`
- その他のランタイム：`process`、`require`、`module`、`exports`、`Deno`、`Bun`
- 構文：`import` / `export` ステートメント、動的 `import()`、`this`、`with`、`import.meta`、`super`
- エスケープ経路：`constructor`、`prototype`、`__proto__`、`__defineGetter__`、`__defineSetter__`、`__lookupGetter__`、`__lookupSetter__`

::: warning
上記の禁止オブジェクト以外にも、その他のブラウザーグローバル変数（`alert`、`setTimeout`、`performance`、`console` など）は技術的には完全にはブロックされていない可能性がありますが、これらはサポート対象の API ではありません。スクリプトは `cad` オブジェクトと ECMAScript 標準組み込みオブジェクトのみに依存する必要があり、それ以外のアクセスは今後のバージョンでさらに制限される可能性があります。
:::

## cad.drawing

現在の図面の静的情報を返します。

| フィールド | 型 | 説明 |
|------|------|------|
| `title` | `string` | 図面タイトル |
| `currentLayer` | `string` | 現在のレイヤー名 |
| `units` | `number` | 挿入単位（INSUNITS） |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | すべてのレイヤーのリスト |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | モデル空間の範囲 |

```javascript
const info = cad.drawing
cad.log('当前图层:', info.currentLayer)
cad.log('图层总数:', info.layers.length)
```

## cad.entities

モデル空間内のエンティティをクエリするために使用します。

### `cad.entities.where(predicate)`

条件に基づいてエンティティスナップショットをフィルタリングし、一致するスナップショットの配列を返します。

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

エンティティ ID で単一のスナップショットを取得します。見つからない場合は `undefined` を返します。

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('类型:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

WCS 矩形ボックス内にあるすべてのエンティティスナップショットを返します。

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### エンティティスナップショット（EntitySnapshot）

| フィールド | 型 | 説明 |
|------|------|------|
| `id` | `string` | エンティティオブジェクト ID |
| `type` | `string` | エンティティタイプ。`AcDb` プレフィックスを含まない。例：`Circle`、`Line` |
| `layer` | `string` | 所属するレイヤー名 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | ワールド座標系での範囲 |
| `geometry` | `object \| undefined` | タイプに依存するジオメトリデータ |

サポートされている `geometry` タイプ：

| エンティティタイプ | `geometry` フィールド |
|----------|----------------|
| `Circle` | `{ center: {x,y,z}, radius }` |
| `Line` | `{ start: {x,y,z}, end: {x,y,z} }` |
| `Arc` | `{ center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Ellipse` | `{ center: {x,y,z}, majorRadius, minorRadius }` |
| `Polyline` | `{ points: Array<{x,y,z}>, closed }` |
| `Text` | `{ position: {x,y,z}, text, height }` |
| `MText` | `{ position: {x,y,z}, text, height }` |
| `Point` | `{ position: {x,y,z} }` |
| `Ray` / `Xline` | `{ basePoint: {x,y,z}, unitDir: {x,y,z} }` |
| `BlockReference`（Insert） | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

角度フィールド `startAngle` / `endAngle` はラジアン、`startAngleDeg` / `endAngleDeg` は度を使用します。

## cad.selection

エンティティのハイライトと選択に使用します。

### `cad.selection.ids()`

現在選択されているエンティティ ID の配列を返します。

```javascript
const ids = cad.selection.ids()
```

### `cad.selection.replace(ids)`

選択セットをクリアし、指定した ID リストに設定します。

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

指定した ID を現在の選択セットに追加します。

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

現在の選択セットから指定した ID を削除します。

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

選択セットをクリアします。

```javascript
cad.selection.clear()
```

## cad.view

ビューの制御に使用します。

### `cad.view.zoomExtents()`

ビューをモデル空間の範囲にズームします。

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

編集操作を実行し、すべての変更が 1 つのアンドゥグループになります。図面は編集可能な状態（読み取り専用モードでない）である必要があります。

```javascript
cad.edit.transaction('批量修改', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

トランザクション内で使用可能なメソッド：

### 描画メソッド

| メソッド | 引数 | 戻り値 |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | 新しいエンティティ ID |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | 新しいエンティティ ID |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | 新しいエンティティ ID |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | 新しいエンティティ ID |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 新しいエンティティ ID |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | 新しいエンティティ ID |

### 編集メソッド

| メソッド | 引数 | 戻り値 |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | 削除されたエンティティ数 |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | 移動されたエンティティ数 |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | 回転されたエンティティ数 |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

結果パネルにログ情報を出力します。

```javascript
cad.log('实体数量:', count)
cad.log({ layer: '0', count })
```

## 戻り値

スクリプトでは `return` を使用して、任意の JSON シリアライズ可能な値を返すことができます。戻り値は結果パネルに表示されます。

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

戻り値が 65536 文字を超える場合、切り詰められて `truncated` とマークされます。
