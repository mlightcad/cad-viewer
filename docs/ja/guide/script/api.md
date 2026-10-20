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

データベース内のすべてのエンティティを返します。モデル空間、各ペーパー空間、各ブロック定義、およびブロック参照に付く属性が含まれます。属性の `ownerId` はブロック参照、それ以外の `ownerId` は所属するブロック表レコードです。

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
| `ownerId` | `string` | 所属ブロック表レコードの ID。属性の場合はブロック参照の ID |
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

`Hatch`、`Spline`、`Leader`、`MLeader`、`MLine`、各種 `Dimension`、`RasterImage`、`Viewport`、`3dSolid`、`ProxyEntity` など、data-model の具体エンティティにも `geometry` があります。ACIS、OLE、プロキシ図形のバイナリは含まれません。

## cad.tables

`AcDbDatabase.tables` と同じく、すべてのシンボルテーブルを読み取ります。各テーブルは `{ id, records }` です。レコードには少なくとも `id` と `name` があります。

| プロパティ | 内容 |
|----------|------|
| `appIdTable` | 登録アプリケーション名 |
| `blockTable` | ブロック定義。図形は `cad.blocks` |
| `dimStyleTable` | 寸法スタイル（`dimtxt`、`dimscale` など） |
| `linetypeTable` | 線種 |
| `textStyleTable` | 文字スタイル |
| `ucsTable` | 名前付き UCS |
| `viewTable` | 名前付きビュー |
| `layerTable` | 画層。`color`、`linetype`、`lineWeight`、`isOff`、`isFrozen`、`isLocked`、`isPlottable` |
| `viewportTable` | モデル空間の VPORT レコード。ペーパー空間の `Viewport` 図形ではありません |

## cad.blocks

DXF の BLOCKS セクションに相当する、すべてのブロック定義です。`*Model_Space` と `*Paper_Space` も含みます。

| フィールド | 説明 |
|------|------|
| `id` | ブロック表レコード ID。ブロック内図形の `ownerId` |
| `name` | ブロック名 |
| `origin` | 基点 `{ x, y, z }` |
| `isModelSpace` / `isPaperSpace` | モデル空間 / ペーパー空間 |
| `flags` | BLOCK グループコード 70 |
| `pathName` / `isXref` | 外部参照のパスとフラグ |
| `entities` | そのブロックに直接入っている図形のスナップショット |

## cad.selection

エンティティのハイライトと選択に使用します。

### `cad.selection.ids`

現在選択されているエンティティ ID の配列です。メソッドではなくプロパティです。

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

選択セット内の各エンティティのスナップショットです。存在しない ID は除きます。各スナップショットのフィールドは `cad.entities.byId` と同じです。

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
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

### `cad.view.capturePreview({ longSide? })`

図面範囲の PNG スクリーンショットをキューします。キャプチャはスクリプト本体の終了後に実行されます。戻り値は `{ queued: true, index }` です。Agent チャットでは、画像はツール結果に添付されてモデルへ送られます（JSON の data URL としては返りません）。

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
```


## cad.measure

Numeric helpers for self-check after drawing. Prefer these over hand-rolled `Math.hypot` / `atan2`. Points are `{ x, y }` in WCS.

| Method | Returns |
|--------|---------|
| `cad.measure.distance(a, b)` | Distance between two points |
| `cad.measure.angleDeg(a, b)` | Bearing of a→b from +X, degrees in (-180, 180] |
| `cad.measure.angleDeg(a, b, c)` | Interior angle at b (a–b–c), degrees in [0, 180] |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)` | Smallest absolute bearing difference in [0, 180] |
| `cad.measure.center(id)` | Circle/arc/ellipse center, or point/text position; else `undefined` |
| `cad.measure.radius(id)` | Circle/arc radius or ellipse majorRadius; else `undefined` |
| `cad.measure.length(id)` | Line length or polyline/spline path length; else `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }` (default tolerance `1e-3`) |
| `cad.measure.report(checks)` | `{ ok, checks }` — `ok` is true iff every check passed |

Recommended return shape after a non-trivial draw:

```javascript
const origin = { x: 0, y: 0 }
let circleId = ''
cad.edit.transaction('draw', tx => {
  circleId = tx.drawCircle({ center: { x: 30, y: 40 }, radius: 10 })
})
const center = cad.measure.center(circleId)
return {
  ...cad.measure.report([
    cad.measure.check('r', 10, cad.measure.radius(circleId)),
    cad.measure.check('pcd', 50, cad.measure.distance(origin, center), 0.01)
  ]),
  entityIds: [circleId]
}
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
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}` | 新しいエンティティ ID |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })` | `boundary: Array<{x,y}>` (min 3) | 新しいエンティティ ID |
| `tx.drawPoint({ position, layer? })` | `position: {x,y}` | 新しいエンティティ ID |
| `tx.drawRay({ start, through, layer? })` | `start/through: {x,y}` | 新しいエンティティ ID |
| `tx.drawXline({ start, through, layer? })` | `start/through: {x,y}` | 新しいエンティティ ID |
| `tx.drawSpline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 新しいエンティティ ID |
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
