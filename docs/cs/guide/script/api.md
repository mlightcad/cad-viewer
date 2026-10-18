---
title: API skriptů
---

# API skriptů

Ve skriptu komunikujete s výkresem prostřednictvím objektu `cad`. Přístupné jsou pouze členy deklarované v `CAD_SCRIPT_API_TREE`, ostatní vlastnosti vyvolají chybu `unknown_api`.

## cad.drawing

Vrací statické informace o aktuálním výkresu.

| Pole | Typ | Popis |
|------|------|------|
| `title` | `string` | Název výkresu |
| `currentLayer` | `string` | Název aktuální hladiny |
| `units` | `number` | Vkládací jednotky (INSUNITS) |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | Seznam všech hladin |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Rozsah modelového prostoru |

```javascript
const info = cad.drawing
cad.log('Aktuální hladina:', info.currentLayer)
cad.log('Celkový počet hladin:', info.layers.length)
```

## cad.entities

Slouží k dotazování na entity v modelovém prostoru.

### `cad.entities.where(predicate)`

Filtruje snímky entit podle podmínky a vrací pole odpovídajících snímků.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

Získá jediný snímek podle ID entity, pokud není nalezeno, vrátí `undefined`.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('Typ:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

Vrací všechny snímky entit nacházející se v obdélníku WCS.

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### Snímek entity (EntitySnapshot)

| Pole | Typ | Popis |
|------|------|------|
| `id` | `string` | ID objektu entity |
| `type` | `string` | Typ entity bez předpony `AcDb`, např. `Circle`, `Line` |
| `layer` | `string` | Název hladiny, ve které se nachází |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Rozsah ve světovém souřadnicovém systému |
| `geometry` | `object \| undefined` | Geometrická data specifická pro typ |

Podporované typy `geometry`:

| Typ entity | Pole `geometry` |
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

Pole úhlů `startAngle` / `endAngle` používají radiány, `startAngleDeg` / `endAngleDeg` používají stupně.

## cad.selection

Slouží k zvýraznění a výběru entit.

### `cad.selection.ids()`

Vrací pole ID aktuálně vybraných entit.

```javascript
const ids = cad.selection.ids()
```

### `cad.selection.replace(ids)`

Vymaže výběr a nastaví jej na zadaný seznam ID.

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

Přidá zadaná ID do aktuálního výběru.

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

Odebere zadaná ID z aktuálního výběru.

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

Vymaže výběr.

```javascript
cad.selection.clear()
```

## cad.view

Slouží k ovládání pohledu.

### `cad.view.zoomExtents()`

Přiblíží pohled na rozsah modelového prostoru.

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

Provede editační operace, všechny změny budou tvořit jednu skupinu pro vrácení zpět. Výkres musí být v editovatelném stavu (ne v režimu pouze pro čtení).

```javascript
cad.edit.transaction('Hromadná úprava', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

Metody dostupné v transakci:

### Metody kreslení

| Metoda | Parametry | Návratová hodnota |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | ID nové entity |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | ID nové entity |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | ID nové entity |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | ID nové entity |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | ID nové entity |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | ID nové entity |

### Metody úprav

| Metoda | Parametry | Návratová hodnota |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | Počet smazaných entit |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | Počet přesunutých entit |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | Počet otočených entit |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

Vypíše log do panelu výsledků.

```javascript
cad.log('Počet entit:', count)
cad.log({ layer: '0', count })
```

## Návratová hodnota

Ve skriptu lze pomocí `return` vrátit libovolnou hodnotu serializovatelnou do JSON. Návratová hodnota se zobrazí v panelu výsledků.

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

Pokud návratová hodnota překročí 65 536 znaků, bude zkrácena a označena jako `truncated`.
