---
title: Betik API
---

# Betik API

Betik içinde `cad` nesnesi aracılığıyla teknik resimle etkileşim kurulur. Yalnızca `CAD_SCRIPT_API_TREE` içinde bildirilen üyelere erişilebilir; diğer özelliklere erişim `unknown_api` hatası tetikler.

## cad.drawing

Mevcut teknik resmin statik bilgilerini döndürür.

| Alan | Tür | Açıklama |
|------|------|------|
| `title` | `string` | Teknik resim başlığı |
| `currentLayer` | `string` | Mevcut katman adı |
| `units` | `number` | Ekleme birimi (INSUNITS) |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | Tüm katmanların listesi |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Model alanı sınırları |

```javascript
const info = cad.drawing
cad.log('Mevcut katman:', info.currentLayer)
cad.log('Toplam katman sayısı:', info.layers.length)
```

## cad.entities

Model alanındaki varlıkları sorgulamak için kullanılır.

### `cad.entities.where(predicate)`

Koşula uyan varlık anlık görüntülerini (snapshot) filtreler ve eşleşen anlık görüntü dizisini döndürür.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

Belirtilen varlık ID'sine göre tek bir anlık görüntü döndürür; bulunamazsa `undefined` döner.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('Tür:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

WCS (World Coordinate System) dikdörtgen kutusu içindeki tüm varlık anlık görüntülerini döndürür.

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### Varlık Anlık Görüntüsü (EntitySnapshot)

| Alan | Tür | Açıklama |
|------|------|------|
| `id` | `string` | Varlık nesne ID'si |
| `type` | `string` | Varlık türü, `AcDb` öneki olmadan, örn. `Circle`, `Line` |
| `layer` | `string` | Bulunduğu katman adı |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Dünya koordinat sistemi sınırları |
| `geometry` | `object \| undefined` | Türüne bağlı geometrik veriler |

Desteklenen `geometry` türleri:

| Varlık Türü | `geometry` Alanları |
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
| `BlockReference` (Insert) | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

Açı alanları `startAngle` / `endAngle` radyan cinsindendir, `startAngleDeg` / `endAngleDeg` derece cinsindendir.

## cad.selection

Varlıkları vurgulamak ve seçmek için kullanılır.

### `cad.selection.ids()`

Şu anda seçili olan varlık ID'lerini dizisi olarak döndürür.

```javascript
const ids = cad.selection.ids()
```

### `cad.selection.replace(ids)`

Seçim kümesini temizler ve belirtilen ID listesiyle değiştirir.

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

Belirtilen ID'leri mevcut seçim kümesine ekler.

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

Belirtilen ID'leri mevcut seçim kümesinden çıkarır.

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

Seçim kümesini temizler.

```javascript
cad.selection.clear()
```

## cad.view

Görünümü kontrol etmek için kullanılır.

### `cad.view.zoomExtents()`

Görünümü model alanı sınırlarına sığdırır.

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

Düzenleme işlemlerini gerçekleştirir; tüm değişiklikler tek bir geri alma grubu olarak ele alınır. Teknik resim düzenlenebilir durumda olmalıdır (salt okunur mod değil).

```javascript
cad.edit.transaction('Toplu değişiklik', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

İşlem içinde kullanılabilen yöntemler:

### Çizim Yöntemleri

| Yöntem | Parametreler | Dönüş Değeri |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | Yeni varlık ID'si |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | Yeni varlık ID'si |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | Yeni varlık ID'si |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | Yeni varlık ID'si |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | Yeni varlık ID'si |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | Yeni varlık ID'si |

### Düzenleme Yöntemleri

| Yöntem | Parametreler | Dönüş Değeri |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | Silinen varlık sayısı |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | Taşınan varlık sayısı |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | Döndürülen varlık sayısı |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

Sonuç paneline günlük bilgisi çıktılar.

```javascript
cad.log('Varlık sayısı:', count)
cad.log({ layer: '0', count })
```

## Dönüş Değeri

Betik içinde `return` kullanarak herhangi bir JSON ile serileştirilebilir değer döndürülebilir. Dönüş değeri sonuç panelinde gösterilir.

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

Dönüş değeri 65536 karakteri aşarsa, kısaltılır ve `truncated` olarak işaretlenir.
