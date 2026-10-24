---
title: "Příkaz"
---

# Vytvoření vlastního příkazu v MLightCAD

Tato stránka vysvětluje, jak vytvořit vlastní příkaz v **MLightCAD** a zaregistrovat jej tak, aby jej uživatel mohl spustit.

## Přehled

Příkazy jsou hlavním způsobem interakce uživatelů s MLightCAD. Každý příkaz představuje konkrétní operaci, například kreslení čáry, vytvoření kružnice, přiblížení nebo výběr objektů.

Systém poskytuje **zásobník příkazů** (`AcEdCommandStack`) pro správu příkazů ve skupinách, jejich vyhledávání podle názvu a zpracování událostí jejich životního cyklu prostřednictvím editoru.

## Životní cyklus příkazu

Každý příkaz prochází dobře definovaným životním cyklem spravovaným třídou `AcEdCommand`:

1.  Příkaz je **spuštěn** pomocí `trigger()`
1.  Je vyvolána událost `commandWillStart`
1.  Je volána metoda `execute()` s aktuálním kontextem
1.  Je vyvolána událost `commandEnded` (vždy, i když dojde k chybě)

Interně je tento životní cyklus implementován takto:

```
async trigger(context: AcApContext) {
  try {
    this.onCommandWillStart(context)
    context.view.editor.events.commandWillStart.dispatch({ command: this })
    await this.execute(context)
  } finally {
    context.view.editor.events.commandEnded.dispatch({ command: this })
    this.onCommandEnded(context)
  }
}
```

### Klíčové záruky

-   `commandWillStart` je vždy vyvolána **před** `execute()`

-   `commandEnded` je vždy vyvolána **po** provedení, i když příkaz vyhodí výjimku nebo je zrušen

-   Příkazy se mohou napojit na logiku životního cyklu přepsáním:

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## Vytvoření příkazu

Všechny příkazy by měly dědit z abstraktní třídy `AcEdCommand`:

```
import {
  AcEdCommand,
  AcApContext,
  AcApDocManager,
  AcEdPromptPointOptions,
  AcEdPromptDistanceOptions
} from '@mlightcad/cad-simple-viewer'

import { AcDbCircle } from '@mlightcad/data-model'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    // Prompt for center point
    const centerPrompt = new AcEdPromptPointOptions(
      'Specify center point of circle:'
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Prompt for radius
    const radiusPrompt = new AcEdPromptDistanceOptions(
      'Specify radius of circle:'
    )
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Create circle entity and add it to model space
    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

### Poznámky

-   `execute()` přijímá aktuální `AcApContext`, který obsahuje:

    -   `context.view`
    -   `context.doc`

-   Pokud již jste uvnitř příkazu, **vždy upřednostněte**:

    ```
    context.view.editor
    ```

    před přístupem ke globální instanci editoru.

## Složité příkazy (více větví) se stavovými automaty

U příkazů s **kontinuálním vstupem + více větvemi + náhledem v reálném čase** (například `PLINE`)
se vyhněte umístění veškeré logiky příkazu do jediného Jigu. To se rychle stane obtížně udržovatelným.

Doporučený přístup:

-   **Logiku příkazu** zpracovává **stavový automat** (řízení větví)
-   **Jig** zpracovává pouze **náhled pro aktuální stav**

Toto oddělení udržuje příkaz čitelný a umožňuje znovu použít vzor stavového automatu
v dalších složitých příkazech.

### Proč používat stavový automat

-   Složité příkazy musí reagovat na více větví klíčových slov
-   Každá větev má odlišná pravidla výzev a chování náhledu
-   Stavový automat udržuje tyto záležitosti lokální pro každý stav

### Doporučená architektura

```
Command Controller
│
├── State Machine
│    ├── LineState
│    ├── ArcState
│    ├── CloseState
│    ├── UndoState
│    └── ...
│
└── Jig (preview only)
```

### Základní třída stavového automatu

Projekt poskytuje opakovaně použitelnou pomocnou třídu stavového automatu pro příkazy řízené výzvami:

```
export interface AcEdPromptState<TPromptOptions, TResult> {
  buildPrompt(): TPromptOptions
  handleResult(result: TResult): Promise<'continue' | 'finish'> | 'continue' | 'finish'
}

export class AcEdPromptStateMachine<TPromptOptions, TResult> {
  setState(state: AcEdPromptState<TPromptOptions, TResult>): void
  run(getResult: (prompt: TPromptOptions) => Promise<TResult>): Promise<void>
}
```

### Interakce mezi stavem a Jigem

-   Každý stav sestavuje vlastní možnosti výzvy
-   Výzva připojuje Jig **pouze pro náhled**
-   Jig **nezná** klíčová slova ani větvení

Jinými slovy:

-   **Stav** rozhoduje, na co se ptát a jak přejít dál
-   **Jig** pouze kreslí aktuální náhled pro daný stav

### Příklad: Vícevětvová polylinie (zjednodušený)

```
class LineState implements AcEdPromptState<AcEdPromptPointOptions, AcEdPromptPointResult> {
  buildPrompt() {
    const prompt = new AcEdPromptPointOptions('Specify next point or')
    prompt.keywords.add('Arc(A)', 'Arc', 'Arc')
    prompt.keywords.add('Undo(U)', 'Undo', 'Undo')
    prompt.keywords.add('Close(C)', 'Close', 'Close')
    prompt.jig = new AcApPolylineJig(view, points, bulges)
    return prompt
  }

  async handleResult(result: AcEdPromptPointResult) {
    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Arc') machine.setState(new ArcState(machine))
      if (result.stringResult === 'Undo') undo()
      if (result.stringResult === 'Close') return 'finish'
      return 'continue'
    }

    if (result.status === AcEdPromptStatus.OK) {
      appendPoint(result.value!)
      return 'continue'
    }

    return 'finish'
  }
}
```

### Praktické poznámky

-   Uchovávejte **datový model** (body, bulges, stav náhledu) v řadiči příkazu
-   Každý stav by měl být **malý a zaměřený**
-   Pro sdílené vzory pracovních postupů upřednostněte `AcEdPromptStateMachine`
-   Řadič příkazu vlastní **finální vytvoření entity**

Kompletní příklad naleznete v [implementaci příkazu polylinie](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts).

## Naslouchání událostem životního cyklu příkazu

Události životního cyklu příkazu jsou vystaveny **editorem**, nikoli příkazem samotným.

### Dostupné události editoru

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### Získání instance `AcEditor`

Podle toho, kde se v aplikaci nacházíte:

#### Odkudkoli (globální přístup)

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### Uvnitř provádění příkazu

```
const editor = context.view.editor
```

### Příklad: Naslouchání událostem příkazu

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### Typické případy použití

-   Sledování historie příkazů
-   Aktualizace stavu UI (panely nástrojů, panely)
-   Uzamykání nebo odemykání interakcí
-   Implementace analytiky nebo telemetrie
-   Napodobení chování `commandWillStart` / `commandEnded` z ObjectARX

## Režim přístupu příkazu

`AcEdCommand` nyní podporuje **požadavek na minimální režim přístupu**, který příkazům umožňuje deklarovat, jakou úroveň přístupu k dokumentu potřebují.

### Režimy otevření

MLightCAD podporuje tři režimy otevření dokumentu:

```
export enum AcEdOpenMode {
  /** Read-only mode */
  Read = 0,
  /** Review mode (compatible with Read) */
  Review = 4,
  /** Write mode (compatible with Review and Read) */
  Write = 8
}
```

Režimy s vyšší hodnotou jsou kompatibilní s režimy s nižší hodnotou:

-   `Write` ≥ `Review` ≥ `Read`

K režimu otevření aktuálního dokumentu můžete přistupovat pomocí:

```
context.doc.openMode
```

nebo

```
AcApDocument.openMode
```

### Nastavení režimu příkazu

Každý příkaz může deklarovat **minimální požadovaný režim přístupu**:

```
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

export class AcApCircleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    // write operations
  }
}
```

#### Vlastnost mode

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### Chování

-   Příkaz **se může provést pouze** pokud:

    ```
    document.openMode >= command.mode
    ```

-   Příklady:

    -   Příkaz `Write` **nemůže** běžet v režimu `Read`
    -   Příkaz `Review` **může** běžet v režimu `Write`
    -   Příkaz `Read` běží ve všech režimech

To umožňuje:

-   Bezpečné prohlížeče pouze pro čtení
-   Pracovní postupy pouze pro revizi
-   Přísnou ochranu zápisu pro editační příkazy

## Registrace příkazu

Příkazy se registrují prostřednictvím `AcApDocManager.instance.commandManager`.

```
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcApCircleCmd } from './AcApCircleCmd'

const register = AcApDocManager.instance.commandManager

const circleCommand = new AcApCircleCmd()
circleCommand.globalName = 'CIRCLE'
circleCommand.localName = 'CIRCLE'

register.addCommand(
  'USER',
  circleCommand.globalName,
  circleCommand.localName,
  circleCommand
)
```

### Poznámky

-   `globalName` musí být v rámci skupiny příkazů jedinečný

-   `localName` je určen uživateli a lze jej lokalizovat

-   Skupiny příkazů:

    -   `ACAD` – systémové příkazy
    -   `USER` – vlastní příkazy

## Alias příkazu

MLightCAD podporuje aliasy příkazů ve stylu AutoCADu (podobně jako chování `acad.pgp`).

### Registrace aliasu pomocí `addCommand`

Aliasy můžete zadat v 5. argumentu metody `addCommand`:

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

Pravidla aliasů:

-   Porovnání aliasů nerozlišuje velká a malá písmena (interně se normalizují na velká písmena)
-   Alias musí být jedinečný v rámci stejné skupiny příkazů
-   Alias nesmí kolidovat s existujícími globálními/lokálními názvy příkazů ve stejné skupině

### Konfigurace aliasů v `AcApDocManager`

`AcApDocManagerOptions` poskytuje `commandAliases`, takže můžete přepsat mapování aliasů při inicializaci:

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

Chování:

-   Pokud má příkaz uživatelem nakonfigurované aliasy, nahradí pro tento příkaz vestavěné výchozí hodnoty
-   Pokud příkaz není nakonfigurován, použijí se vestavěné výchozí aliasy

### Vyhledávání a chování UI

-   `lookupGlobalCmd()` a `lookupLocalCmd()` podporují vyhledávání podle aliasu
-   `searchCommandsByPrefix()` podporuje porovnávání prefixů aliasů
-   Automatické doplňování příkazového řádku zobrazuje aliasy v seznamu, například:
    `LINE（L, LN） - description`

## Spuštění příkazu

Po registraci lze příkaz provést programově:

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## Kompletní pracovní postup

1.  Vytvořte příkaz děděním z `AcEdCommand`
1.  (Volitelně) Nastavte požadovaný režim přístupu `mode` příkazu
1.  Zaregistrujte jej pomocí `commandManager`
1.   (Volitelně) V případě potřeby naslouchejte událostem životního cyklu prostřednictvím `AcEditor`
1.  Spusťte příkaz podle názvu nebo programově


## Lokalizace vlastního příkazu

V projektu <https://github.com/mlightcad/cad-simple-viewer-example> naleznete kompletní příklad předvádějící vlastní příkazy s podporou lokalizace.
