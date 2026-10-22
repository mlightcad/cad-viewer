---
title: "Systém Jig"
---

# Systém Jig

AutoCAD spoléhá na framework AcEdJig, který poskytuje vizuální zpětnou vazbu v reálném čase při získávání uživatelského vstupu. Ačkoli je tento systém výkonný, rozděluje vyzvání, vykreslování náhledu a vzorkování vstupu do několika přepsaných metod – logika se tak často rozprostírá do různých funkcí a fází životního cyklu. CAD-Viewer přetváří tento koncept pro web zavedením jednotného mechanismu jig řízeného TypeScriptem, který se bezproblémově integruje se vstupem výzev. Namísto správy drag smyček nebo stavových kódů vzorkovače mohou vývojáři připojit jig přímo k možnostem výzvy, čímž zůstává logika dynamického náhledu, uživatelský vstup a finální vytvoření entity pohromadě v jednom čitelném pracovním postupu.

## Přehled

**Systém Jig** v CAD-Viewer umožňuje interaktivní náhledy a dynamické vytváření entit a nabízí pracovní postup podobný **AcEdJig** (ObjectARX) v AutoCADu. *Jig* spravuje dočasnou entitu náhledu, která se nepřetržitě aktualizuje podle pohybu kurzoru nebo přírůstkového uživatelského vstupu.

Mezi případy použití patří:

* interaktivní vytváření geometrie (bod, kružnice, polylinie atd.)
* měření vzdálenosti nebo úhlu v reálném čase
* úpravy existujících entit v reálném čase

CAD-Viewer však zavádí **jednodušší, ucelenější a TypeScriptu bližší design**, který snižuje strukturální složitost obvykle se vyskytující u jigů v AutoCADu.


## Klíčový architektonický rozdíl

### Jig se předává do možností výzvy

V AutoCADu jsou výzvy a jigy samostatné mechanismy. Spuštění jigu vyžaduje přepsání `sampler()`, `worldDraw()` a volání `drag()`.

V CAD-Viewer mohou výzvy přímo **nést instanci jigu**:

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

Tento design:

* automaticky propojuje uživatelský vstup s živým náhledem
* odstraňuje ruční správu drag smyčky

➡️ Výsledek: **méně boilerplate, více konzistence**.

---

### Kompletní logika dynamického vstupu zůstává pohromadě

Jak můžete vidět v [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC), AutoCAD rozděluje logiku vstupu pro vytvoření jedné elipsy na několik míst.

* `createEllipse()` — získá střed elipsy
* `sampler()` — získá koncový bod hlavní osy a vzdálenost od středu elipsy ke koncovému bodu vedlejší osy

V CAD-Viewer je celý pracovní postup dynamického vstupu vyjádřen sekvenčně takto.

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ Uživatelský vstup, náhled jigu a finální geometrie jsou spravovány v **témže bloku kódu**.


## Klíčové koncepty

### Obecný jig (`AcEdPreviewJig<T>`)

`AcEdPreviewJig<T>` je třída založená na TypeScriptu, která spravuje přechodné entity náhledu:

| AutoCAD AcEdJig | Web CAD Jig (`AcEdPreviewJig`)      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | Ovládáno externě pomocí událostí JS |

**Vlastnosti:**

-   Používá obecný typ `T` pro zpracování více typů vstupu (bod, vzdálenost, úhel atd.)
-   Integruje se s `AcEdBaseView` pro vykreslování přechodných entit
-   Podporuje entity náhledu implementující `onJigUpdate(value: T)` pro dynamické aktualizace geometrie
-   Umožňuje čisté ukončení jigu pomocí `end()`

* * *

### Základní metody

#### `update(value: T): void`

Aktualizuje entitu náhledu podle uživatelského vstupu. Jedná se o ekvivalent `sampler()` v AutoCADu.

#### `render(): void`

Vykreslí entitu náhledu v přidruženém zobrazení, podobně jako `worldDraw()` v AutoCADu.

#### `end(): void`

Vymaže přechodnou entitu a ukončí relaci jigu.

#### `entity: AcDbEntity | null`

Getter pro aktuální entitu náhledu.

## Použití jigů

### Krok 1: Vytvoření třídy jigu

Pro konkrétní entitu je třeba vytvořit třídu dědící z `AcEdPreviewJig<T>`. Například vytvoření **jigu kružnice**:

```ts
import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcEdPreviewJig, AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}
```

**Vysvětlení:**

-   Jig spravuje přechodnou `AcDbCircle`.
-   Metoda `update` dynamicky mění poloměr podle uživatelského vstupu.

* * *

### Krok 2: Použití jigu v příkazu

Jig můžete integrovat do příkazu pro interaktivní vytvoření entity:

```ts
import { AcEdCommand, AcApDocManager, AcEdPromptPointOptions, AcEdPromptDistanceOptions } from '@mlightcad/cad-simple-viewer'
import { AcApCircleJig } from './AcApCircleJig'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context) {
    // Step 2a: Acquire center point
    const centerPrompt = new AcEdPromptPointOptions('Specify center of circle:')
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Step 2b: Acquire radius using Jig
    const radiusPrompt = new AcEdPromptDistanceOptions('Specify radius of circle:')
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Step 2c: Add circle to database
    const circle = new AcDbCircle(center, radius)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

**Pracovní postup:**

1.  Vyzvěte uživatele k zadání **středu** kružnice.
1.  Vytvořte **jig kružnice** připojený ke středu.
1.  Vyzvěte uživatele k zadání **poloměru** s interaktivním náhledem.
1.  Potvrďte finální kružnici do databáze.

* * *

## Uživatelský vstup

Kompletní a aktuální příručku k API pro vstup v AcEditor, možnostem výzev, pravidlům klíčových slov a zpracování výsledků výzev naleznete v části:

[Uživatelský vstup](./user-input)

## Odkazy

-   [AutoCAD AcEdJig Documentation](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig Drag Loop](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)

