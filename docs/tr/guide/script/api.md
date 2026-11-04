---
title: Betik API
---

# Betik API

Betik içinde `cad` nesnesi aracılığıyla teknik resimle etkileşim kurulur. Yalnızca `CAD_SCRIPT_API_TREE` içinde bildirilen üyelere erişilebilir; diğer özelliklere erişim `unknown_api` hatası tetikler.

## Yürütme Ortamı ve Tarayıcı API'leri

Betik, tarayıcıda katı mod (strict mode) sandbox ortamında çalışır; yalnızca `cad` nesnesine ve ECMAScript standart yerleşik nesnelerine erişebilir, sayfa DOM'unu yönetemez veya ağ isteği başlatamaz.

### Kullanılabilir Yerleşik Nesneler

Tüm ECMAScript standart yerleşik nesneleri kullanılabilir:

- Matematik ve sayılar: `Math`, `Number`, `BigInt`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`
- Veri yapıları: `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`
- Metin ve biçimlendirme: `String`, `JSON`, `RegExp`, `Intl`, `encodeURIComponent`, `decodeURIComponent`
- Zaman: `Date` (`Date.now()` betiğin kendi çalışma süresini ölçmek için kullanılabilir)
- Diğer: `Boolean`, `Promise`, `Error` ve alt sınıfları

Çıktı için `cad.log()` kullanın, `console.log`'a güvenmeyin — sonuç paneli yalnızca `cad.log` içeriğini gösterir.

### Yasaklanan Tarayıcı API'leri

Aşağıdaki içerikler betik doğrulama aşamasında doğrudan reddedilir ve `forbidden_identifier` / `forbidden_syntax` / `forbidden_member` hatalarını tetikler:

- Sayfa ve DOM: `window`, `document`, `globalThis`
- Ağ ve iletişim: `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`
- Cihaz ve ortam: `navigator`, `location`, `parent`, `top`, `self`, `frames` (çalışma zamanında `undefined` olarak gölgelenir)
- Depolama: `localStorage`, `sessionStorage`
- Dinamik yürütme: `eval`, `Function`
- Diğer çalışma zamanları: `process`, `require`, `module`, `exports`, `Deno`, `Bun`
- Sözdizimi: `import` / `export` ifadeleri, dinamik `import()`, `this`, `with`, `import.meta`, `super`
- Kaçış yolları: `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`

::: warning
Yukarıda yasaklananlar dışındaki tarayıcı global değişkenleri (örn. `alert`, `setTimeout`, `performance`, `console`) teknik olarak tamamen engellenmemiş olabilir, ancak bunlar desteklenen API'lere ait değildir. Betikler yalnızca `cad` nesnesine ve ECMAScript standart yerleşik nesnelerine dayanmalıdır; diğer erişimler sonraki sürümlerde daha fazla kısıtlanabilir.
:::

## cad.drawing

Mevcut teknik resmin statik bilgilerini döndürür.

| Alan           | Tür                                           | Açıklama                 |
| -------------- | --------------------------------------------- | ------------------------ |
| `title`        | `string`                                      | Teknik resim başlığı     |
| `currentLayer` | `string`                                      | Mevcut katman adı        |
| `units`        | `number`                                      | Ekleme birimi (INSUNITS) |
| `layers`       | `Array<{ name, isOn, isFrozen, isLocked }>`   | Tüm katmanların listesi  |
| `extents`      | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Model alanı sınırları    |

```javascript
const info = cad.drawing
cad.log('Mevcut katman:', info.currentLayer)
cad.log('Toplam katman sayısı:', info.layers.length)
```

## cad.entities

Veritabanındaki tüm varlıkları döndürür: model alanı, her kağıt alanı, her blok tanımı ve blok referanslarındaki öznitelikler. Bir özniteliğin `ownerId` değeri blok referansıdır; diğer varlıkların `ownerId` değeri ait oldukları blok tablosu kaydıdır.

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

| Alan            | Tür                                           | Açıklama                                                                    |
| --------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `id`            | `string`                                      | Varlık nesne ID'si                                                          |
| `ownerId`       | `string`                                      | Ait olunan blok tablosu kaydının ID'si; öznitelikte blok referansının ID'si |
| `type`          | `string`                                      | Varlık türü, `AcDb` öneki olmadan, örn. `Circle`, `Line`                    |
| `layer`         | `string`                                      | Bulunduğu katman adı                                                        |
| `color`         | `EntityColor`                                 | ByLayer / ByBlock çözülmemiş saklı renk                                     |
| `resolvedColor` | `EntityColor`                                 | ByLayer / ByBlock çözülmüş renk                                             |
| `lineType`      | `string`                                      | Çizgi türü adı (`ByLayer` / `ByBlock` saklandığı gibi)                      |
| `lineWeight`    | `number`                                      | `AcGiLineWeight` değeri; negatif değerler ByLayer / ByBlock                 |
| `linetypeScale` | `number`                                      | Çizgi türü ölçeği                                                           |
| `visibility`    | `boolean`                                     | Varlık gizliyse `false`                                                     |
| `transparency`  | `EntityTransparency`                          | Saydamlık yöntemi ve alpha                                                  |
| `thickness`     | `number \| undefined`                         | Ekstrüzyon kalınlığı (türde varsa)                                          |
| `normal`        | `{x,y,z} \| undefined`                        | Ekstrüzyon yönü / düzlem normali (türde varsa)                              |
| `extents`       | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Dünya koordinat sistemi sınırları                                           |
| `geometry`      | `object \| undefined`                         | Türüne bağlı geometrik veriler                                              |

`EntityColor` şudur: `{ red?, green?, blue?, hex?, colorIndex?, isByColor, isByACI, isByLayer, isByBlock, isForeground }`.
ByLayer / ByBlock renklerinde RGB yoktur; gerçek renk gerektiğinde `resolvedColor` okunur.
`EntityTransparency` şudur: `{ method, alpha, percentage?, isByAlpha, isByLayer, isByBlock }`.

`cad.entities.where(...)` yüklemi içinde bu görüntü özellikleri tembel okunur: yalnızca yüklemin dokunduğu alanlar çözülür ve yalnızca eşleşen varlıklar tam anlık görüntüye dönüştürülür.

Desteklenen `geometry` türleri:

| Varlık Türü                         | `geometry` Alanları                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Circle`                            | `{ center, radius, area, circumference, closed }`                                                                                                                                                                                                                                                        |
| `Line`                              | `{ start, end, length, midPoint, direction, closed }`                                                                                                                                                                                                                                                    |
| `Arc`                               | `{ center, radius, startAngle, endAngle, startAngleDeg, endAngleDeg, length, area, startPoint, endPoint, midPoint, closed }`                                                                                                                                                                             |
| `Ellipse`                           | `{ center, majorAxis, majorRadius, minorRadius, startAngle, endAngle, startAngleDeg, endAngleDeg, area, isCircular, closed }`                                                                                                                                                                            |
| `Polyline`                          | `{ points, vertices: [{ bulge, startWidth, endWidth }], bulges, hasBulges, hasWidths, closed, elevation, length, area }`                                                                                                                                                                                 |
| `2dPolyline`                        | `{ points, vertices, bulges, hasBulges, closed, polyType, elevation, length, area }`                                                                                                                                                                                                                     |
| `3dPolyline`                        | `{ points, closed, polyType, length }`                                                                                                                                                                                                                                                                   |
| `Spline`                            | `{ points, controlPoints, fitPoints, knots, weights, degree, length, area, isFitPointSpline, isControlPointSpline, startPoint, endPoint, closed, normal }`                                                                                                                                               |
| `Text`                              | `{ position, text, height, rotation, styleName, alignmentPoint, hasAlignmentPoint, oblique, obliqueDeg, horizontalMode, verticalMode, widthFactor, isBackward, isUpsideDown }`                                                                                                                           |
| `MText`                             | `{ position, text, plainText, height, width, extentsWidth, rotation, styleName, attachmentPoint, direction, lineSpacingFactor, lineSpacingStyle, backgroundFill, backgroundFillColor, backgroundScaleFactor, drawingDirection, columnType, columnCount, columnWidth, columnGutter, columnFlowReversed }` |
| `Attribute` / `AttributeDefinition` | Metin alanlarına ek olarak `{ tag, invisible }` vb.                                                                                                                                                                                                                                                      |
| `Point`                             | `{ position, ecsRotation }`                                                                                                                                                                                                                                                                              |
| `Ray` / `Xline`                     | `{ basePoint, unitDir }`                                                                                                                                                                                                                                                                                 |
| `BlockReference` (Insert)           | `{ name, effectiveName, isDynamicBlock, position, rotation, scale, columnCount, rowCount, columnSpacing, rowSpacing, blockTransform, attributes: [{ tag, text, position, invisible }] }`                                                                                                                 |
| `Table`                             | Blok referansı alanlarına ek olarak `{ rows, columns, attachmentPoint, rowHeights, columnWidths, tableWidth, tableHeight, cells }`                                                                                                                                                                       |
| `Hatch`                             | `{ patternName, hatchStyle, isSolidFill, isHatch, isGradient, area, loops: [{ closed, points, length }], gradient* }`                                                                                                                                                                                    |

Açı alanları `startAngle` / `endAngle` radyan cinsindendir, `startAngleDeg` / `endAngleDeg` derece cinsindendir.
`plainText` içinden MTEXT denetim kodları (`\P`, `\fSimSun|b0|i0;`, süslü parantezler) çıkarılmıştır; doğrudan aranabilir.
Ölçünün `measurement` değeri, varlıkta saklı değer yoksa tanım noktalarından hesaplanır.

Açı alanları `startAngle` / `endAngle` radyan cinsindendir, `startAngleDeg` / `endAngleDeg` derece cinsindendir.

data-model içindeki her somut varlık türünün `geometry` alanı vardır: `Hatch`, `Spline`, `Leader`, `MLeader`, `MLine`, ölçü türleri, `RasterImage`, `Viewport`, `3dSolid`, `ProxyEntity`. ACIS, OLE ve proxy grafik ikili verisi kopyalanmaz.

## cad.tables

`AcDbDatabase.tables` ile aynı şekilde tüm sembol tablolarını salt okunur verir. Her tablo `{ id, records }` biçimindedir. Kayıtta en az `id` ve `name` vardır.

| Özellik          | İçerik                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `appIdTable`     | Kayıtlı uygulama adları                                                                      |
| `blockTable`     | Blok tanımları. Varlıklar `cad.blocks` üzerindedir                                           |
| `dimStyleTable`  | Ölçü stilleri                                                                                |
| `linetypeTable`  | Çizgi tipleri                                                                                |
| `textStyleTable` | Yazı stilleri                                                                                |
| `ucsTable`       | Adlandırılmış UCS kayıtları                                                                  |
| `viewTable`      | Adlandırılmış görünümler                                                                     |
| `layerTable`     | Katmanlar: `color`, `linetype`, `lineWeight`, `isOff`, `isFrozen`, `isLocked`, `isPlottable` |
| `viewportTable`  | Model alanı VPORT kayıtları; kağıt alanındaki `Viewport` varlıkları değildir                 |

## cad.blocks

DXF BLOCKS bölümüne karşılık gelen tüm blok tanımları. `*Model_Space` ve `*Paper_Space` dahildir.

| Alan                            | Açıklama                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| `id`                            | Blok tablosu kaydı ID'si ve bloktaki varlıkların `ownerId` değeri |
| `name`                          | Blok adı                                                          |
| `origin`                        | Taban nokta `{ x, y, z }`                                         |
| `isModelSpace` / `isPaperSpace` | Model alanı / kağıt alanı                                         |
| `flags`                         | BLOCK grup kodu 70                                                |
| `pathName` / `isXref`           | Dış referans yolu ve bayrağı                                      |
| `entities`                      | Blokta doğrudan duran varlık anlık görüntüleri                    |

## cad.selection

Varlıkları vurgulamak ve seçmek için kullanılır.

### `cad.selection.ids`

Şu anda seçili varlık ID'lerinin dizisi. Bu bir metot değil, özelliktir.

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

Seçim kümesindeki her varlığın anlık görüntüsü. Artık var olmayan ID'ler atlanır. Anlık görüntü alanları `cad.entities.byId` ile aynıdır.

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
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

### `cad.view.capturePreview({ longSide? })`

Çizim sınırlarının PNG ekran görüntüsünü kuyruğa alır. Yakalama, komut dosyası gövdesi bittikten sonra çalışır. `{ queued: true, index }` döner. Agent sohbetinde görüntüler model için araç sonucuna eklenir (JSON data URL olarak dönmez).

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
```

## cad.file

Geçerli çizimi dışa aktarır. DXF metni betiğin dönüş değerine girmez.

### `cad.file.saveDxf(path?)`

Betik başarılı olduktan sonra bir DXF dışa aktarmayı kuyruğa alır. Yol dizesi veya `{ path?, fileName? }` verin. Uzantı yoksa `.dxf` eklenir. `{ queued: true, index, fileName }` döner.

- Uygulama içi ajan ve betik panelinde tarayıcı indirmesi başlar.
- `cad-mcp-server` içinde sunucu dosyayı `path` konumuna yazar. Göreli yollar sunucu işleminin çalışma dizinine göredir. Araç sonucu `savedFiles` içinde mutlak yol ve bayt boyutunu listeler.

```javascript
cad.file.saveDxf('./plan-out.dxf')
// or: cad.file.saveDxf({ path: './plan-out.dxf' })
```

### `cad.file.savePdf(path?)`

Queues a PDF export after the script succeeds. Pass a path string or `{ path?, fileName?, exportLayouts?, colorMode?, textMode?, modelSpaceFit? }`. `.pdf` is appended when missing. Returns `{ queued: true, index, fileName }`.

```javascript
cad.file.savePdf('./plan.pdf')
```

### `cad.file.saveHtml(path?)`

Queues offline HTML (or a multi-file `.zip`) after success. Pass a path string or `{ path?, fileName?, exportFormat?, exportLayouts?, background? }`. Requires a viewer host (`exportHtml`). Headless sessions skip with a log note.

```javascript
cad.file.saveHtml('./plan.html')
cad.file.saveHtml({ path: './plan.zip', exportFormat: 'multi' })
```

## cad.measure

Numeric helpers for self-check after drawing. Prefer these over hand-rolled `Math.hypot` / `atan2`. Points are `{ x, y }` in WCS.

| Method                                                  | Returns                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cad.measure.distance(a, b)`                            | Distance between two points                                                           |
| `cad.measure.angleDeg(a, b)`                            | Bearing of a→b from +X, degrees in (-180, 180]                                        |
| `cad.measure.angleDeg(a, b, c)`                         | Interior angle at b (a–b–c), degrees in [0, 180]                                      |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)`             | Smallest absolute bearing difference in [0, 180]                                      |
| `cad.measure.center(id)`                                | Circle/arc/ellipse center, or point/text position; else `undefined`                   |
| `cad.measure.radius(id)`                                | Circle/arc radius or ellipse majorRadius; else `undefined`                            |
| `cad.measure.length(id)`                                | Line length, or polyline/spline/2dPolyline/3dPolyline path length; else `undefined`   |
| `cad.measure.area(id)`                                  | Area reported by the entity, or polygon area of its boundary points; else `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }` (default tolerance `1e-3`)                         |
| `cad.measure.report(checks)`                            | `{ ok, checks }` — `ok` is true iff every check passed                                |

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

Düzenleme işlemlerini gerçekleştirir; tüm değişiklikler tek bir geri alma grubu olarak ele alınır. Teknik resim düzenlenebilir durumda olmalıdır (salt okunur mod değil).

```javascript
cad.edit.transaction('Toplu değişiklik', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

İşlem içinde kullanılabilen yöntemler:

### Çizim Yöntemleri

| Yöntem                                                                                                     | Parametreler                     | Dönüş Değeri      |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- |
| `tx.drawLine({ start, end, layer? })`                                                                      | `start/end: {x,y}`               | Yeni varlık ID'si |
| `tx.drawCircle({ center, radius, layer? })`                                                                | `center: {x,y}`                  | Yeni varlık ID'si |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })`                                       | `center: {x,y}`                  | Yeni varlık ID'si |
| `tx.drawRectangle({ corner1, corner2, layer? })`                                                           | `corner1/corner2: {x,y}`         | Yeni varlık ID'si |
| `tx.drawPolyline({ points, closed?, layer? })`                                                             | `points: Array<{x,y}>`           | Yeni varlık ID'si |
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}`                  | Yeni varlık ID'si |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })`                        | `boundary: Array<{x,y}>` (min 3) | Yeni varlık ID'si |
| `tx.drawPoint({ position, layer? })`                                                                       | `position: {x,y}`                | Yeni varlık ID'si |
| `tx.drawRay({ start, through, layer? })`                                                                   | `start/through: {x,y}`           | Yeni varlık ID'si |
| `tx.drawXline({ start, through, layer? })`                                                                 | `start/through: {x,y}`           | Yeni varlık ID'si |
| `tx.drawSpline({ points, closed?, layer? })`                                                               | `points: Array<{x,y}>`           | Yeni varlık ID'si |
| `tx.drawText({ position, text, height?, layer? })`                                                         | `position: {x,y}`                | Yeni varlık ID'si |

### Düzenleme Yöntemleri

| Yöntem                             | Parametreler               | Dönüş Değeri             |
| ---------------------------------- | -------------------------- | ------------------------ |
| `tx.erase(ids)`                    | `string[]`                 | Silinen varlık sayısı    |
| `tx.setLayer(ids, layer)`          | `string[], string`         | —                        |
| `tx.move(ids, dx, dy)`             | `string[], number, number` | Taşınan varlık sayısı    |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number`  | Döndürülen varlık sayısı |
| `tx.createLayer(name)`             | `string`                   | —                        |
| `tx.setCurrentLayer(name)`         | `string`                   | —                        |

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
