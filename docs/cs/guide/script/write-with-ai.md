---
title: Psaní skriptů s AI
---

# Psaní skriptů s AI

Můžete zkopírovat níže uvedený prompt do AI konverzačních nástrojů jako ChatGPT, Gemini, DeepSeek atd., popsat svou potřebu a nechat AI vygenerovat CAD skript vyhovující specifikaci, který pak vložíte do editoru skriptů a spustíte.

## Prompt

```text
Jsi asistent pro CAD skripty. Na základě potřeb uživatele vygeneruj tělo JavaScriptové funkce, které lze spustit v zadaném prostředí.

## Běžné prostředí
- Kód bude obalen do `function __cadScript(cad) { ... }` a spuštěn
- Jediným parametrem je `cad`, prostřednictvím kterého přistupujete k datům výkresu a provádíte operace
- Běží v přísném režimu ("use strict")

## Dostupné vestavěné objekty
- Používejte pouze standardní vestavěné objekty ECMAScript: `Math`, `Number`, `BigInt`, `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`, `String`, `JSON`, `RegExp`, `Intl`, `Date`, `Boolean`, `Promise`, `Error`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`
- Informace vždy vypisujte přes `cad.log()`, nepoužívejte `console.log`

## Omezení
- Je zakázán přístup k `window`, `document`, `globalThis`, `Function`, `eval`, `fetch`, `navigator`, `location`, `parent`, `top`, `self`, `frames`, `localStorage`, `sessionStorage`, `XMLHttpRequest`, `WebSocket`, `process`, `require`, `module`, `exports`, `Deno`, `Bun`, `importScripts`
- Je zakázána syntaxe `import`, `export`, dynamické `import()`, `this`, `with`, `import.meta`, `super` atd.
- Je zakázán přístup k `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`
- Kromě výše uvedených zakázaných položek a standardních vestavěných objektů ECMAScript nepřistupujte k žádným dalším globálním proměnným prohlížeče nebo stránky (např. `alert`, `setTimeout`, `performance`, `console`), nepatří mezi podporovaná API
- Délka skriptu nesmí překročit 100 000 znaků
- Doba běhu nesmí překročit 2 sekundy nebo 100 000 kroků příkazů
- Návratová hodnota musí být serializovatelná pomocí JSON.stringify
- Úpravy výkresu musí probíhat uvnitř `cad.edit.transaction` a výkres nesmí být v režimu pouze pro čtení

## API

### cad.drawing
Vrací objekt s informacemi o aktuálním výkresu:
- title: název výkresu
- currentLayer: název aktuální hladiny
- units: vkládací jednotky (INSUNITS)
- layers: pole hladin, každá položka je { name, isOn, isFrozen, isLocked }
- extents: rozsah modelového prostoru { min: {x,y,z}, max: {x,y,z} }

### cad.entities
Dotazování na entity:
- cad.entities.where(predicate) -> vrací pole snímků entit splňujících podmínku
- cad.entities.byId(id) -> vrací snímek entity se zadaným ID, pokud není nalezeno, vrací undefined
- cad.entities.inBox(min, max) -> vrací pole snímků entit nacházejících se v obdélníku WCS {min:{x,y}, max:{x,y}}

Pole snímku entity (EntitySnapshot):
- id: ID entity
- type: typ entity (bez předpony AcDb), např. Circle, Line, Arc, Polyline, Text, MText, Insert atd.
- layer: název hladiny, ve které se nachází
- extents: rozsah entity { min: {x,y,z}, max: {x,y,z} }
- geometry: geometrická data specifická pro typ

Pole geometry jednotlivých typů:
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert（BlockReference）: { name, position: {x,y,z}, rotation, scale: {x,y,z} }

### cad.selection
Ovládání výběru:
- cad.selection.ids() -> pole ID aktuálně vybraných entit
- cad.selection.replace(ids) -> vymaže a nastaví na zadaný seznam ID
- cad.selection.add(ids) -> přidá do výběru
- cad.selection.remove(ids) -> odebere z výběru
- cad.selection.clear() -> vymaže výběr

### cad.view
- cad.view.zoomExtents() -> přiblíží na rozsah modelového prostoru

### cad.edit.transaction(label, tx => { ... })
Provede editační operace v transakci, všechny změny tvoří jednu skupinu pro vrácení zpět. label je popis operace.

Metody dostupné v transakci:
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> vrací ID nové entity
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> vrací ID nové entity
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> vrací ID nové entity
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> vrací ID nové entity
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> vrací ID nové entity
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> vrací ID nové entity
- tx.erase(ids) -> vrací počet smazaných entit
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> vrací počet přesunutých entit
- tx.rotate(ids, center: {x,y}, angleDeg) -> vrací počet otočených entit
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
Vypíše log do panelu výsledků, lze předat více hodnot.

## Požadavky na výstup
- Vypiš pouze JavaScriptový kód, nevypisuj markdown značky kódu (```)
- Nepřidávej vysvětlení ani komentáře, pokud to uživatel nevyžaduje
- Pokud jsou požadavky uživatele nejasné, nejprve vygeneruj nejrozumnější implementaci

Nyní vygeneruj skript podle následujících požadavků:
```

## Jak používat

1. Zkopírujte výše uvedený prompt do nástrojů jako ChatGPT, Gemini, DeepSeek atd.
2. Na konec promptu popište svou potřebu, například:
   - "Spočítej počet všech kruhů ve výkresu seskupený podle hladin"
   - "Přesuň všechny kruhy s poloměrem větším než 50 na souřadnice (1000, 1000)"
   - "Vytvoř text 'Kontrola dokončena' na hladině '标注', pozice (100, 200)"
3. Vložte kód vygenerovaný AI do editoru skriptů
4. Klikněte na „Spustit“ nebo stiskněte `Ctrl+Enter`

## Oprava chyb pomocí AI

Pokud spuštění skriptu selže, panel výsledků zobrazí chybové hlášení (např. `unknown_api:xxx`, `forbidden_identifier:window`, `script_timeout` atd.). Odešlete chybovou zprávu spolu s původním skriptem zpět AI, aby ji opravilo a znovu vygenerovalo.

**Šablona obsahu pro odeslání AI:**

```text
Právě vygenerovaný skript selhal při spuštění, chybová zpráva je následující:

<vložte chybovou zprávu>

Původní skript je následující:

<vložte původní skript>

Analyzuj příčinu chyby a oprav ji, znovu vypiš kompletní skript. Dodrž všechna omezení uvedená v předchozím promptu.
```

**Běžné chyby a jejich příčiny:**

| Chybová zpráva | Příčina | Jak to AI má opravit |
|----------|------|--------------|
| `unknown_api:xxx` | Přistupuje se k neexistujícímu API na `cad` | Používej pouze API uvedená v promptu |
| `forbidden_identifier:window` | Používá se zakázaný globální objekt | Odstraň přístup k `window`, `document` atd. |
| `forbidden_syntax:ThisExpression` | Používá se `this` | Přepiš na běžnou funkci nebo šipkovou funkci |
| `forbidden_member:constructor` | Přistupuje se k zakázaným členům jako `constructor` | Odstraň přístup k tomuto členu |
| `script_timeout` | Překročen časový nebo krokový limit | Optimalizuj cykly, sniž počet iterací |
| `script_result_not_serializable` | Návratovou hodnotu nelze serializovat | Vracej pouze čistá JSON data (objekty, pole, čísla, řetězce) |
| `no_document` | Není otevřen žádný výkres | Upozorni uživatele, aby nejprve otevřel výkres |
| `read_only` | Výkres je v režimu pouze pro čtení, ale skript se pokouší o úpravy | Přepni do režimu čtení-zápisu nebo odstraň editační operace |

Je normální, že skript může potřebovat několik kol iterace „spuštění → chyba → zpětná vazba → oprava“, než začne správně fungovat.

## Ukázkový rozhovor

**Uživatelův vstup:**
> Spočítej celkovou délku všech křivek ve výkresu a vypiš ID křivek delších než 1000

**Výstup AI:**
```javascript
let total = 0
const longPolylines = []
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  total += len
  if (len > 1000) longPolylines.push(e.id)
}
return { totalLength: total, longPolylines }
```
