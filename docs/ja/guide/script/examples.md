---
title: スクリプト例
---

# スクリプト例

以下の例は、一般的なスクリプトの使い方を示しています。スクリプトパネルにコピーして実行できます。

## エンティティ数をカウント

図面内の各タイプのエンティティ数をカウントします。

```javascript
const counts = {}
for (const entity of cad.entities.where(() => true)) {
  counts[entity.type] = (counts[entity.type] || 0) + 1
}
return {
  title: cad.drawing.title,
  currentLayer: cad.drawing.currentLayer,
  counts
}
```

## レイヤーごとに円をカウントしてハイライト

最も多くの円を含むレイヤーを見つけ、そのレイヤー上のすべてのエンティティをハイライトします。

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
const counts = {}
for (const c of circles) {
  counts[c.layer] = (counts[c.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
```

## 大きな半径の円を検索

半径が 100 より大きい円をフィルタリングし、それらの中心座標を出力します。

```javascript
const bigCircles = cad.entities
  .where(e => e.type === 'Circle' && e.geometry.radius > 100)
  .map(e => ({
    id: e.id,
    layer: e.layer,
    center: e.geometry.center,
    radius: e.geometry.radius
  }))
return bigCircles
```

## 指定した領域に矩形を描画

指定した WCS 座標に矩形を 1 つ描画します。

```javascript
cad.edit.transaction('画矩形', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## レイヤー上のすべてのエンティティを移動

「标注」レイヤー上のすべてのエンティティを右に 1000 単位移動します。

```javascript
const targetLayer = '标注'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('移动标注图层', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## テキストの一括作成

指定した位置に複数のテキストオブジェクトを作成します。

```javascript
const texts = [
  { x: 0, y: 0, content: '起点' },
  { x: 50, y: 50, content: '终点' }
]
cad.edit.transaction('批量创建文字', tx => {
  for (const t of texts) {
    tx.drawText({
      position: { x: t.x, y: t.y },
      text: t.content,
      height: 20
    })
  }
})
return { created: texts.length }
```

## ポリラインの総延長を計算

すべてのポリラインの総延長を集計します。

```javascript
let total = 0
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    total += Math.sqrt(dx * dx + dy * dy)
  }
}
return { totalLength: total.toFixed(2) }
```

## 指定領域をハイライトして範囲選択

指定した矩形範囲内のすべてのエンティティを選択セットに追加し、その範囲にズームします。

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```

## ブロックごとの図形数

モデル空間とペーパー空間もブロックです。

```javascript
return cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  count: block.entities.length
}))
```

## モデル空間の外にある円

`ownerId` は図形が属するブロックです。

```javascript
const model = cad.blocks.find(block => block.isModelSpace)
const circles = cad.entities
  .where(entity => entity.type === 'Circle' && entity.ownerId !== model.id)
  .map(entity => ({
    id: entity.id,
    ownerId: entity.ownerId,
    layer: entity.layer,
    radius: entity.geometry.radius
  }))
return circles
```

## 画層テーブルを読む

シンボルテーブルには色、線種、印刷可否があります。

```javascript
const layers = cad.tables.layerTable.records.map(record => ({
  name: record.name,
  isOff: record.isOff,
  isFrozen: record.isFrozen,
  isLocked: record.isLocked,
  isPlottable: record.isPlottable,
  linetype: record.linetype,
  color: record.color
}))
const styles = cad.tables.textStyleTable.records.map(record => ({
  name: record.name,
  fileName: record.fileName,
  textSize: record.textSize
}))
return { layers, styles }
```

## 図面を DXF として保存

スクリプト成功後に実行されます。アプリ内エージェントはファイルをダウンロードし、`cad-mcp-server` は指定パスへ書き込みます。

```javascript
cad.file.saveDxf('./plan-out.dxf')
return { saved: true }
```
