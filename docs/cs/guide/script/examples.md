---
title: Příklady skriptů
---

# Příklady skriptů

Následující příklady ukazují běžné použití skriptů. Zkopírujte je do panelu skriptů a spusťte.

## Počítání entit

Spočítá počty jednotlivých typů entit ve výkresu.

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

## Počítání kruhů podle hladin a jejich zvýraznění

Najde hladinu s největším počtem kruhů a zvýrazní všechny entity na této hladině.

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

## Hledání kruhů s velkým poloměrem

Vyfiltruje kruhy s poloměrem větším než 100 a vypíše jejich středy.

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

## Kreslení obdélníku v zadané oblasti

Vykreslí obdélník na zadaných souřadnicích WCS.

```javascript
cad.edit.transaction('Kreslení obdélníku', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## Přesunutí všech entit na hladině

Přesune všechny entity na hladině „标注“ o 1000 jednotek doprava.

```javascript
const targetLayer = '标注'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('Přesunutí hladiny 标注', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## Hromadné vytváření textů

Vytvoří více textových objektů na zadaných pozicích.

```javascript
const texts = [
  { x: 0, y: 0, content: '起点' },
  { x: 50, y: 50, content: '终点' }
]
cad.edit.transaction('Hromadné vytváření textů', tx => {
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

## Výpočet celkové délky křivek

Spočítá celkovou délku všech křivek (polyline).

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

## Zvýraznění a ohraničení zadané oblasti

Přidá všechny entity v zadaném obdélníku do výběru a přiblíží na tento rozsah.

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```
