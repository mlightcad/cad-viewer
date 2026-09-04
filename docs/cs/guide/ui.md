---
title: Uživatelské rozhraní
---

# Uživatelské rozhraní

MLightCAD Viewer používá klasické trojdílné rozvržení ve stylu AutoCADu: horní pás karet, uprostřed plátno a ve spodní části stavový řádek.

## Celkové rozvržení

```
┌───────────────────────────────────────────────┐
│  Horní pás karet (Ribbon)                     │
├───────────────────────────────────────────────┤
│                                               │
│           Plátno + překryvné vrstvy            │
│    ┌─────┐                                    │
│    │pravý│  Ukotvitelné panely (hladiny,       │
│    │ nást│  vlastnosti atd.)                   │
│    │roj  │                                    │
│    └─────┘                                    │
│                                               │
├───────────────────────────────────────────────┤
│  Stavový řádek                                │
└───────────────────────────────────────────────┘
```

## Horní pás karet

Pás karet organizuje příkazová tlačítka do karet (Tab) a skupin (Group).

### Soubor

| Tlačítko | Popis |
|---|---|
| Otevřít | Otevře soubor DWG / DXF |
| Exportovat DXF | Exportuje aktuální výkres do formátu DXF |
| Exportovat PNG | Exportuje plátno jako obrázek PNG |

### Kreslení

Obsahuje kresebné příkazy Line, Circle, Arc, Rect, Polyline, Hatch atd. Tyto příkazy nejsou v režimu revize k dispozici.

### Hladiny

Operace s hladinami: zapnutí/vypnutí, zmrazení/rozmrazení, uzamčení, izolace atd.

### Úpravy

Příkazy úprav jako Move, Copy, Offset atd.

### Měření

Vzdálenost, úhel, plocha, délka oblouku, spojité měření, souřadnice bodu. Viz [Přehled měření](/cs/guide/measure/overview).

### Komentáře

Šipka, cloud, obdélník, kruh, text, Callout, zvýraznění, razítko atd. Viz [Přehled komentářů](/cs/guide/markup/overview).

## Pravý nástrojový panel

Svislý nástrojový panel plovoucí na pravé straně plátna, poskytuje rychlý přístup k často používaným nástrojům:

- **Výběr**: vybrat a přesouvat entity
- **Posun**: tažením posouvat pohled
- **Přiblížit na vše**: vycentrovat všechny grafické objekty
- **Přiblížení oknem**: přiblížit vybranou oblast
- **Správa hladin**: otevřít panel hladin
- **Přepnutí pozadí**: přepnutí světlého/tmavého pozadí
- **Režim čtení**: režim celé obrazovky pro soustředěné čtení
- **Skupina měřicích nástrojů**: otevře panel měřicích nástrojů
- **Skupina nástrojů komentářů**: otevře panel nástrojů komentářů (zobrazeno v režimu revize)

## Ukotvitelné panely

Panely lze ukotvit na pravé straně plátna nebo přetáhnout jako plovoucí okno. Běžné panely:

| Panel | Popis |
|---|---|
| Hladiny | vypíše všechny hladiny, podporuje zapnutí/vypnutí, uzamčení, zmrazení, izolaci atd. |
| Vlastnosti | zobrazí vlastnosti vybraných entit |
| Seznam měření | vypíše všechna měření v aktuálním výkrese, kliknutím přejdete na odpovídající měření |
| Revize (komentáře) | vypíše všechny komentáře, podporuje úpravu metadat komentářů, mazání atd. |
| Statistika | statistika použití bloků ve výkresu |
| Chybějící zdroje | upozorní na chybějící fonty nebo externí reference ve výkresu |

## Stavový řádek

Stavový řádek se nachází ve spodní části rozhraní, zleva dopprava:

| Oblast | Popis |
|---|---|
| Záložky rozvržení | přepínání Modelový prostor / Rozvržení |
| Souřadnice | zobrazí souřadnice aktuální pozice kurzoru (pouze desktop) |
| OSNAP | zapnutí/vypnutí a konfigurace režimu object snap |
| ORTHO | zapnutí/vypnutí ortogonálního režimu |
| POLAR | zapnutí/vypnutí polar tracking a úhlový přírůstek |
| Zobrazení tloušťky čáry | určuje, zda zobrazit tloušťku čar |
| Dynamický vstup | zapnutí/vypnutí dynamického vstupu |
| Přepnutí motivu | světlý/tmavý motiv |
| Celá obrazovka | režim celé obrazovky |

## Režim revize

Při spuštění příkazu komentáře se prohlížeč automaticky přepne do **režimu revize**. Pozadí DWG/DXF se stane pouze pro čtení a všechny komentáře a měření se zobrazí jako překryvná vrstva. Po ukončení příkazu komentáře zůstane v režimu revize, dokud se ručně nepřepne zpět do režimu úprav.

V režimu revize jsou příkazy komentářů automaticky dostupné; v režimu úprav je nutné nástroje komentářů aktivovat ručně.
