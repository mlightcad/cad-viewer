---
title: Betik Örnekleri
---

# Betik Örnekleri

Aşağıdaki örnekler yaygın betik kullanımlarını göstermektedir. Betik paneline kopyalayarak doğrudan çalıştırabilirsiniz.

## Varlık Sayısını İstatistikleme

Teknik resimdeki her türden varlıkların sayısını istatistikler.

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

## Katmana Göre Daire İstatistiği ve Vurgulama

En çok daire içeren katmanı bulur ve o katmandaki tüm varlıkları vurgular.

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

## Büyük Yarıçaplı Daireleri Bulma

Yarıçapı 100'den büyük olan daireleri filtreler ve merkez koordinatlarını çıktılar.

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

## Belirtilen Alana Dikdörtgen Çizme

Belirtilen WCS koordinatlarında bir dikdörtgen çizer.

```javascript
cad.edit.transaction('Dikdörtgen çiz', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## Katmandaki Tüm Varlıkları Taşıma

"Ölçü" katmanındaki tüm varlıkları sağa doğru 1000 birim taşır.

```javascript
const targetLayer = 'Ölçü'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('Ölçü katmanını taşı', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## Toplu Metin Oluşturma

Belirtilen konumlarda birden fazla metin nesnesi oluşturur.

```javascript
const texts = [
  { x: 0, y: 0, content: 'Başlangıç' },
  { x: 50, y: 50, content: 'Bitiş' }
]
cad.edit.transaction('Toplu metin oluştur', tx => {
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

## Polilinelerin Toplam Uzunluğunu Hesaplama

Tüm polilinelerin toplam uzunluğunu hesaplar.

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

## Belirtilen Alanı Vurgulama ve Seçme

Belirtilen dikdörtgen aralığındaki tüm varlıkları seçim kümesine ekler ve görünümü bu aralığa sığdırır.

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```

## Blok başına varlık sayısı

Model alanı ve kağıt alanı da bloktur.

```javascript
return cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  count: block.entities.length
}))
```

## Model alanı dışındaki daireler

`ownerId`, varlığın ait olduğu bloktur.

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

## Katman tablosunu okuma

Sembol tablosu kayıtlarında renk, çizgi tipi ve çizdirilebilirlik vardır.

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

## Çizimi DXF olarak kaydetme

Betik başarılı olduktan sonra çalışır. Uygulama içi ajan dosyayı indirir; `cad-mcp-server` dosyayı verilen yola yazar.

```javascript
cad.file.saveDxf('./plan-out.dxf')
return { saved: true }
```
