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

Následující prvky jsou přímo odmítnuty již při validaci skriptu a vyvolají chybu `forbidden_identifier` / `forbidden_syntax` / `forbidden_member`. Klíče objektů jako `{ window: count }` jsou povoleny; volné identifikátory jako `window.foo` ne.

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

| Pole           | Typ                                           | Popis                        |
| -------------- | --------------------------------------------- | ---------------------------- |
| `title`        | `string`                                      | Název výkresu                |
| `currentLayer` | `string`                                      | Název aktuální hladiny       |
| `units`        | `number`                                      | Vkládací jednotky (INSUNITS) |
| `layers`       | `Array<{ name, isOn, isFrozen, isLocked }>`   | Seznam všech hladin          |
| `extents`      | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Rozsah modelového prostoru   |

```javascript
const info = cad.drawing
cad.log('Aktuální hladina:', info.currentLayer)
cad.log('Celkový počet hladin:', info.layers.length)
```

## cad.entities

`where` / `count` / `inBox` procházejí **jen modelový a výkresový prostor** (definice bloků přes `inBlock(id)`). `ownerId` atributu je reference bloku, u ostatních záznam tabulky bloků. Typ reference bloku je `BlockReference`.

### `cad.entities.count(predicate)`

Počítá shody bez sestavování snímků. Pro součty preferujte toto — `where(pred).length` stále vytváří snímky.

```javascript
const n = cad.entities.count(e => e.type === 'Circle')
```

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

### `cad.entities.inBlock(blockId)`

Snímkuje entity uložené přímo v jedné definici bloku (nebo modelovém/výkresovém prostoru).

```javascript
const widget = cad.blocks.find(block => block.name === 'Widget')
const ents = widget ? cad.entities.inBlock(widget.id) : []
```

### `cad.entities.inBox(min, max)`

Vrací snímky z layout prostorů, jejichž extents protínají obdélník (jen model/výkres).

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### Snímek entity (EntitySnapshot)

| Pole            | Typ                                           | Popis                                                                 |
| --------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `id`            | `string`                                      | ID objektu entity                                                     |
| `ownerId`       | `string`                                      | ID záznamu tabulky bloků, u atributu ID reference bloku               |
| `type`          | `string`                                      | Typ entity bez předpony `AcDb`, např. `Circle`, `Line`                |
| `layer`         | `string`                                      | Název hladiny, ve které se nachází                                    |
| `color`         | `EntityColor`                                 | Uložená barva před rozlišením ByLayer / ByBlock                       |
| `resolvedColor` | `EntityColor`                                 | Barva po rozlišení ByLayer / ByBlock                                  |
| `lineType`      | `string`                                      | Název typu čáry (`ByLayer` / `ByBlock` zůstávají jako uložené)        |
| `lineWeight`    | `number`                                      | Hodnota `AcGiLineWeight`; záporné hodnoty znamenají ByLayer / ByBlock |
| `linetypeScale` | `number`                                      | Měřítko typu čáry                                                     |
| `visibility`    | `boolean`                                     | `false`, když je entita skrytá                                        |
| `transparency`  | `EntityTransparency`                          | Metoda průhlednosti a alpha                                           |
| `thickness`     | `number \| undefined`                         | Tloušťka vytažení, pokud ji typ má                                    |
| `normal`        | `{x,y,z} \| undefined`                        | Směr vytažení / normála roviny, pokud ji typ má                       |
| `extents`       | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | Rozsah ve světovém souřadnicovém systému                              |
| `geometry`      | `object \| undefined`                         | Geometrická data specifická pro typ                                   |

`EntityColor` je `{ red?, green?, blue?, hex?, colorIndex?, isByColor, isByACI, isByLayer, isByBlock, isForeground }`.
Barvy ByLayer / ByBlock nemají RGB; potřebujete-li skutečnou barvu, čtěte `resolvedColor`.
`EntityTransparency` je `{ method, alpha, percentage?, isByAlpha, isByLayer, isByBlock }`.

V predikátu `cad.entities.where(...)` se tyto zobrazovací vlastnosti čtou líně: rozliší se jen pole, kterých se predikát dotkne, a na plný snapshot se převedou jen odpovídající entity.

Podporované typy `geometry`:

| Typ entity                          | Pole `geometry`                                                                                                                                                                                                                                                                                          |
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
| `Attribute` / `AttributeDefinition` | Textová pole navíc `{ tag, invisible }` apod.                                                                                                                                                                                                                                                            |
| `Point`                             | `{ position, ecsRotation }`                                                                                                                                                                                                                                                                              |
| `Ray` / `Xline`                     | `{ basePoint, unitDir }`                                                                                                                                                                                                                                                                                 |
| `BlockReference`（Insert）          | `{ name, effectiveName, isDynamicBlock, position, rotation, scale, columnCount, rowCount, columnSpacing, rowSpacing, blockTransform, attributes: [{ tag, text, position, invisible }] }`                                                                                                                 |
| `Table`                             | Pole reference bloku navíc `{ rows, columns, attachmentPoint, rowHeights, columnWidths, tableWidth, tableHeight, cells }`                                                                                                                                                                                |
| `Hatch`                             | `{ patternName, hatchStyle, isSolidFill, isHatch, isGradient, area, loops: [{ closed, points, length }], gradient* }`                                                                                                                                                                                    |

Pole úhlů `startAngle` / `endAngle` používají radiány, `startAngleDeg` / `endAngleDeg` používají stupně.
`plainText` má odstraněné řídicí kódy MTEXT (`\P`, `\fSimSun|b0|i0;`, složené závorky), takže je přímo prohledávatelné.
`measurement` kóty se vypočte z definičních bodů, když entita neuchovává hodnotu.

`geometry` je vyplněna pro každý konkrétní typ entity v data-model, včetně `Hatch`, `Spline`, `Leader`, `MLeader`, `MLine`, kót, `RasterImage`, `Viewport`, `3dSolid` a `ProxyEntity`. Binární data ACIS, OLE a proxy grafiky se nekopírují.

## cad.tables

Jen pro čtení, všechny tabulky symbolů jako `AcDbDatabase.tables`. Každá tabulka je `{ id, records }`. Záznam má alespoň `id` a `name`.

| Vlastnost        | Obsah                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `appIdTable`     | Registrované názvy aplikací                                                                |
| `blockTable`     | Definice bloků. Entity jsou v `cad.blocks`                                                 |
| `dimStyleTable`  | Kótovací styly                                                                             |
| `linetypeTable`  | Typy čar                                                                                   |
| `textStyleTable` | Styly textu                                                                                |
| `ucsTable`       | Pojmenované USS                                                                            |
| `viewTable`      | Pojmenované pohledy                                                                        |
| `layerTable`     | Hladiny: `color`, `linetype`, `lineWeight`, `isOff`, `isFrozen`, `isLocked`, `isPlottable` |
| `viewportTable`  | Záznamy VPORT modelového prostoru, ne entity `Viewport` ve výkresovém prostoru             |

## cad.blocks

**Pouze metadata** definic bloků (jako sekce BLOCKS v DXF, včetně `*Model_Space` a `*Paper_Space`). Bez pole entit — použijte `cad.entities.inBlock(id)`.

| Pole                            | Popis                                              |
| ------------------------------- | -------------------------------------------------- |
| `id`                            | ID záznamu tabulky bloků a `ownerId` entit v bloku |
| `name`                          | Název bloku                                        |
| `origin`                        | Vztažný bod `{ x, y, z }`                          |
| `isModelSpace` / `isPaperSpace` | Modelový / výkresový prostor                       |
| `flags`                         | Skupinový kód 70 objektu BLOCK                     |
| `pathName` / `isXref`           | Cesta a příznak externí reference                  |
| `entityCount`                   | Počet entit (bez snapshotů)                                    |
| `typeCounts`                    | Počty podle typu (bez snapshotů)                               |

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

### `cad.view.capturePreview({ longSide?, selection?, layers? })`

Zařadí PNG snímek rozsahu výkresu. Snímek se pořídí až po dokončení těla skriptu. Vrací `{ queued: true, index }`. V Agent chatu se obrázky připojí k výsledku nástroje pro model (nevracejí se jako JSON data URL).

Po `cad.selection.replace(ids)` předáte `selection: true` pro zachycení jen aktuálního výběru.

Předáním `layers` (název hladiny nebo pole názvů, bez ohledu na velikost písmen) se vykreslí jen geometrie modelového prostoru na těchto hladinách a snímek se ořízne na společný rozsah těchto hladin místo celého výkresu, takže nevznikají velké prázdné okraje. Stav zapnutí/vypnutí hladin se ignoruje; neznámé názvy hladin vyhodí chybu; `layers` nelze kombinovat se `selection`.

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
// optional: cad.view.capturePreview({ selection: true })
// optional: cad.view.capturePreview({ layers: ['WALL', 'DOOR'] })
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

### `cad.file.savePdf(path?)`

Queues a PDF export after the script succeeds. Pass a path string or `{ path?, fileName?, exportLayouts?, exportEmptyLayouts?, colorMode?, textMode?, modelSpaceFit? }`. `.pdf` is appended when missing. Returns `{ queued: true, index, fileName }`.

```javascript
cad.file.savePdf('./plan.pdf')
```

### `cad.file.saveHtml(path?)`

Queues offline HTML (or a multi-file `.zip`) after success. Pass a path string or `{ path?, fileName?, exportFormat?, exportLayouts?, exportEmptyLayouts?, background? }`. Requires a viewer host (`exportHtml`). Headless sessions skip with a log note.

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

## cad.redraw

Rekonstrukce výkresu z referenčního obrázku (sken, fotografie, snímek obrazovky) se sledováním důkazů. Skript sestaví prostý objekt spec; `cad.redraw` jej ověří, vykreslí v jedné skupině zpět do standardních hladin (OBJECT, HIDDEN, CENTER, DIM, TEXT, TABLE, BORDER, CONSTRUCTION, ASSUMPTION) a zkontroluje výsledek. Úplný popis spec je exportován jako `CAD_REDRAW_SPEC_SUMMARY` a vložen do promptu agenta.

| Metoda | Popis |
| --- | --- |
| `cad.redraw.validate(spec, { profile? }?)` | Bez kreslení ověří pole, ID, jednotky, kalibraci a vazby → `{ status, errors, warnings, evidence, calibrations }` |
| `cad.redraw.draw(spec, { profile?, omit?, offset?, allowBlocked? }?)` | Vykreslí spec → `{ status, drawn, idMap, entityCount, skipped, checks, dimensionChecks, errors, warnings }` |
| `cad.redraw.inspect(spec, idMap, { profile? }?)` | Znovu spustí kontroly a porovná odečtené hodnoty kót `value` s tím, co nakreslené kóty měří |
| `cad.redraw.compare(spec, { referenceIndex?, calibration?, viewId?, tolerancePx?, maxSide?, images? }?)` | Porovnání po pixelech s připojeným referenčním obrázkem: zarovná vykreslený výkres podle kalibrace ze spec a vrátí `redrawCompare` (verdikt, pokrytí, přesnost, vzdálenosti, `suggestedMove`, problémová místa) a obrázky překryvu a rozdílu |

- Profily: `general` (výchozí), `strict-dimensioned`, `hybrid`, `visual-trace`, `geometry-only` (vynechá texty, kóty, odkazy a text tabulek).
- Důkaz pro každou hodnotu: `known`, `scaled`, `inferred`, `unreadable`. Výchozí jednotky jsou `unitless`; milimetry se nikdy nepředpokládají.
- Entity standardně používají souřadnice CAD. S `coords: 'source'` jde o pixely obrázku (počátek vlevo nahoře, y dolů) převedené kalibrací (`dimension-anchor`, `similarity`, `affine`, `homography`, `sheet-scale`).
- Stav: `pass`, `pass_with_warnings`, `needs_review` (rozpor kót nebo vazeb), `blocked` (přísnému profilu chybí důkazy), `fail` (neplatný spec; nic se nevykreslí).
- Tabulky se kreslí jako čáry a text, ne jako AcDbTable.
- Kreslení nastaví `INSUNITS` podle `units`, texty a texty kót používají styl `REDRAW_TEXT` s podporou CJK (`simsun` + `hztxt.shx`) a kótu, kterou nelze vytvořit, nakreslí s varováním jako čáry a text (poloměr/průměr jako odkaz); `fallbacks` je počítá.

```javascript
const r = cad.redraw.draw({
  profile: 'general',
  units: 'mm',
  entities: [
    { id: 'plate', type: 'rectangle', x: 0, y: 0, width: 120, height: 80, evidence: 'known' },
    { id: 'hole', type: 'circle', center: [60, 40], radius: 10, evidence: 'known' },
    { id: 'w', type: 'linear_dimension', p1: [0, 0], p2: [120, 0], dimLine: [60, -12], value: 120, evidence: 'known' },
    { id: 'note', type: 'leader', points: [[67, 47], [85, 65], [95, 65]], text: 'THRU' }
  ],
  checks: [{ measure: 'radius', entity: 'hole', expected: 10 }]
})
return { status: r.status, checks: r.checks, dimensionChecks: r.dimensionChecks }
```

### Porovnání po pixelech

`cad.redraw.compare` vykreslí výkres v rozsahu CAD odpovídajícím referenci (nebo `views[].sourceRoi`), převede ho kalibrací (podobnost, afinní nebo homografie) do souřadnic obrázku, obojí ztenčí na 1pixelové osy a změří je proti sobě pomocí vzdálenostních transformací.

- `coverage`: podíl referenčních čar, u kterých je v toleranci nakreslená geometrie (chybějící geometrie ho snižuje).
- `precision`: podíl nakreslených čar, u kterých je v toleranci referenční čára (nadbytečná nebo posunutá geometrie ho snižuje).
- `meanDistance*` / `p95Distance*`: vzdálenost referenčních čar od výkresu v pixelech reference a v jednotkách CAD.
- `verdict`: `aligned`, `offset` (většinu vyřeší posun — viz `suggestedMove`), `incomplete`, `cluttered` nebo `mismatch`.
- `hotspots`: buňky mřížky s největším nesouladem jako `sourceRoi` (pixely obrázku) a `cadBox`.

Překryv ukazuje zesvětlenou referenci se shodnými čarami zeleně, chybějícími červeně a nadbytečnými modře. Porovnání potřebuje vykreslovač a připojený obrázek, takže funguje v agentovi v aplikaci; relace bez rozhraní vrací `reason: 'no_raster_host'`. Pixelové metriky jsou jen vizuálním důkazem a rozměry neprokazují.

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

| Metoda                                                                                                     | Parametry                        | Návratová hodnota |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- |
| `tx.drawLine({ start, end, layer? })`                                                                      | `start/end: {x,y}`               | ID nové entity    |
| `tx.drawCircle({ center, radius, layer? })`                                                                | `center: {x,y}`                  | ID nové entity    |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })`                                       | `center: {x,y}`                  | ID nové entity    |
| `tx.drawRectangle({ corner1, corner2, layer? })`                                                           | `corner1/corner2: {x,y}`         | ID nové entity    |
| `tx.drawPolyline({ points, closed?, layer? })`                                                             | `points: Array<{x,y}>`           | ID nové entity    |
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}`                  | ID nové entity    |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })`                        | `boundary: Array<{x,y}>` (min 3) | ID nové entity    |
| `tx.drawPoint({ position, layer? })`                                                                       | `position: {x,y}`                | ID nové entity    |
| `tx.drawRay({ start, through, layer? })`                                                                   | `start/through: {x,y}`           | ID nové entity    |
| `tx.drawXline({ start, through, layer? })`                                                                 | `start/through: {x,y}`           | ID nové entity    |
| `tx.drawSpline({ points, closed?, layer? })`                                                               | `points: Array<{x,y}>`           | ID nové entity    |
| `tx.drawText({ position, text, height?, rotationDeg?, width?, layer? })`                                                         | `position: {x,y}`                | ID nové entity    |
| `tx.drawDimAligned({ xLine1Point, xLine2Point, dimLinePoint, text?, styleName?, layer? })`                 | body `{x,y}`                     | ID nové entity    |
| `tx.drawDimLinear({ xLine1Point, xLine2Point, dimLinePoint, rotationDeg?, text?, styleName?, layer? })`     | bez `rotationDeg` → H/V podle umístění | ID nové entity |
| `tx.drawDimDiameter({ center, radius, angleDeg?, leaderLength?, … } \| { chordPoint, farChordPoint, … })` | střed+poloměr nebo tětiva        | ID nové entity    |
| `tx.drawDimRadius({ center, radius, angleDeg?, leaderLength?, … } \| { center, chordPoint, … })`           | střed+poloměr nebo střed+tětiva  | ID nové entity    |
| `tx.drawDimAngular({ center, xLine1Point, xLine2Point, arcPoint, text?, styleName?, layer? })`             | 3bodový úhel                     | ID nové entity    |
| `tx.drawDimArc({ center, xLine1Point, xLine2Point, arcPoint, text?, styleName?, layer? })`                  | délka oblouku                    | ID nové entity    |
| `tx.drawDimOrdinate({ definingPoint, leaderEndPoint, useXAxis?, origin?, text?, styleName?, layer? })`     | souřadnicová kóta                | ID nové entity    |
| `tx.drawLeader({ points, text?, textPosition?, textHeight?, textLayer?, arrowHead?, styleName?, layer? })` | šipka v `points[0]` | ID odkazu (ID anotačního MTEXTu je také mezi vytvořenými ID) |

Pro kóty používejte `drawDim*`. Nenapodobujte je čarami, šipkami a textem. Výchozí je `$DIMSTYLE` výkresu; přepište ho pomocí `styleName` z `cad.tables.dimStyleTable`.

### Metody úprav

| Metoda                             | Parametry                  | Návratová hodnota       |
| ---------------------------------- | -------------------------- | ----------------------- |
| `tx.erase(ids)`                    | `string[]`                 | Počet smazaných entit   |
| `tx.setLayer(ids, layer)`          | `string[], string`         | —                       |
| `tx.move(ids, dx, dy)`             | `string[], number, number` | Počet přesunutých entit |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number`  | Počet otočených entit   |
| `tx.createLayer(name)`             | `string`                   | —                       |
| `tx.setCurrentLayer(name)`         | `string`                   | —                       |

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
