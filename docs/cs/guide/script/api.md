---
title: API skriptů
---

# API skriptů

Ve skriptu komunikujete s výkresem prostřednictvím objektu `cad`. Přístupné jsou pouze členy deklarované v `CAD_SCRIPT_API_TREE`, ostatní vlastnosti vyvolají chybu `unknown_api`.

## Prostředí spouštění a API prohlížeče

Skript běží v sandboxu prohlížeče v přísném režimu a má přístup pouze k objektu `cad` a standardním vestavěným objektům ECMAScript — nemůže manipulovat s DOM stránky ani odesílat síťové požadavky.

### Dostupné vestavěné objekty

K dispozici jsou všechny standardní vestavěné objekty ECMAScript:

- Matematika a čísla: `Math`, `Number`, `BigInt`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`
- Datové struktury: `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`
- Text a formátování: `String`, `JSON`, `RegExp`, `Intl`, `encodeURIComponent`, `decodeURIComponent`
- Čas: `Date` (`Date.now()` lze použít pro měření doby běhu samotného skriptu)
- Ostatní: `Boolean`, `Promise`, `Error` a jejich podtřídy

Pro výpis informací použijte `cad.log()` a nespoléhejte na `console.log` — panel výsledků zobrazuje pouze obsah vypsaný přes `cad.log`.

### Zakázaná API prohlížeče

Následující prvky jsou přímo odmítnuty již při validaci skriptu a vyvolají chybu `forbidden_identifier` / `forbidden_syntax` / `forbidden_member`:

- Stránka a DOM: `window`, `document`, `globalThis`
- Síť a komunikace: `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`
- Zařízení a prostředí: `navigator`, `location`, `parent`, `top`, `self`, `frames` (za běhu zastíněny hodnotou `undefined`)
- Úložiště: `localStorage`, `sessionStorage`
- Dynamické vykonávání: `eval`, `Function`
- Ostatní běhová prostředí: `process`, `require`, `module`, `exports`, `Deno`, `Bun`
- Syntaxe: příkazy `import` / `export`, dynamické `import()`, `this`, `with`, `import.meta`, `super`
- Únikové cesty: `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`

::: warning
Kromě výše uvedených zakázaných objektů mohou být další globální proměnné prohlížeče (jako `alert`, `setTimeout`, `performance`, `console`) technicky stále dostupné, ale nepatří mezi podporovaná API. Skripty by se měly spoléhat pouze na objekt `cad` a standardní vestavěné objekty ECMAScript; ostatní přístupy mohou být v budoucích verzích dále omezeny.
:::

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

Vrací všechny entity v databázi: modelový prostor, každý výkresový prostor, každou definici bloku a atributy na referencích bloků. `ownerId` atributu je reference bloku, u ostatních entit je to záznam tabulky bloků.

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
| `ownerId` | `string` | ID záznamu tabulky bloků, u atributu ID reference bloku |
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

`geometry` je vyplněna pro každý konkrétní typ entity v data-model, včetně `Hatch`, `Spline`, `Leader`, `MLeader`, `MLine`, kót, `RasterImage`, `Viewport`, `3dSolid` a `ProxyEntity`. Binární data ACIS, OLE a proxy grafiky se nekopírují.

## cad.tables

Jen pro čtení, všechny tabulky symbolů jako `AcDbDatabase.tables`. Každá tabulka je `{ id, records }`. Záznam má alespoň `id` a `name`.

| Vlastnost | Obsah |
|------|------|
| `appIdTable` | Registrované názvy aplikací |
| `blockTable` | Definice bloků. Entity jsou v `cad.blocks` |
| `dimStyleTable` | Kótovací styly |
| `linetypeTable` | Typy čar |
| `textStyleTable` | Styly textu |
| `ucsTable` | Pojmenované USS |
| `viewTable` | Pojmenované pohledy |
| `layerTable` | Hladiny: `color`, `linetype`, `lineWeight`, `isOff`, `isFrozen`, `isLocked`, `isPlottable` |
| `viewportTable` | Záznamy VPORT modelového prostoru, ne entity `Viewport` ve výkresovém prostoru |

## cad.blocks

Všechny definice bloků, obdobně jako sekce BLOCKS v DXF, včetně `*Model_Space` a `*Paper_Space`.

| Pole | Popis |
|------|------|
| `id` | ID záznamu tabulky bloků a `ownerId` entit v bloku |
| `name` | Název bloku |
| `origin` | Vztažný bod `{ x, y, z }` |
| `isModelSpace` / `isPaperSpace` | Modelový / výkresový prostor |
| `flags` | Skupinový kód 70 objektu BLOCK |
| `pathName` / `isXref` | Cesta a příznak externí reference |
| `entities` | Snímky entit uložených přímo v bloku |

## cad.selection

Slouží k zvýraznění a výběru entit.

### `cad.selection.ids`

Pole ID aktuálně vybraných entit. Je to vlastnost, ne metoda.

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

Snímky každé entity ve výběru. ID, která už neexistují, se vynechají. Pole snímku jsou stejná jako u `cad.entities.byId`.

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
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

### `cad.view.capturePreview({ longSide? })`

Zařadí PNG snímek rozsahu výkresu. Snímek se pořídí až po dokončení těla skriptu. Vrací `{ queued: true, index }`. V Agent chatu se obrázky připojí k výsledku nástroje pro model (nevracejí se jako JSON data URL).

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
```

## cad.file

Exportuje aktuální výkres. Text DXF se do návratové hodnoty skriptu nedostane.

### `cad.file.saveDxf(path?)`

Po úspěšném skriptu zařadí export DXF. Předá se cesta jako řetězec, nebo `{ path?, fileName? }`. Chybí-li přípona, doplní se `.dxf`. Vrací `{ queued: true, index, fileName }`.

- V agentovi v aplikaci a ve skript panelu se spustí stažení v prohlížeči.
- V `cad-mcp-server` server zapíše soubor na `path`. Relativní cesty se počítají od pracovního adresáře procesu serveru. Výsledek nástroje obsahuje `savedFiles` s absolutní cestou a velikostí v bajtech.

```javascript
cad.file.saveDxf('./plan-out.dxf')
// or: cad.file.saveDxf({ path: './plan-out.dxf' })
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
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}` | ID nové entity |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })` | `boundary: Array<{x,y}>` (min 3) | ID nové entity |
| `tx.drawPoint({ position, layer? })` | `position: {x,y}` | ID nové entity |
| `tx.drawRay({ start, through, layer? })` | `start/through: {x,y}` | ID nové entity |
| `tx.drawXline({ start, through, layer? })` | `start/through: {x,y}` | ID nové entity |
| `tx.drawSpline({ points, closed?, layer? })` | `points: Array<{x,y}>` | ID nové entity |
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
