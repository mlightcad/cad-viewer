---
title: "Systémové proměnné"
---

# Systémové proměnné

Tato stránka vysvětluje, jak v CAD-Viewer fungují systémové proměnné, jak je uživatelé mohou měnit z příkazového řádku a jak jsou implementovány prostřednictvím `AcDbSystemVariables` a `AcDbSysVarManager`.

## Co je systémová proměnná

`systémová proměnná` je globální nastavení, které řídí chování částí systému CAD.

Příkazy obvykle spouštějí akci, vytvářejí geometrii nebo otevírají dialog. Systémové proměnné dělají něco jiného: řídí chování příkazů, výchozí hodnoty, stav výkresu nebo chování uživatelského rozhraní.

Typické příklady zahrnují:

- na které hladině mají být vytvářeny nové entity
- jakou výchozí barvu, tloušťku čáry nebo měřítko typu čáry použít
- zda je zapnut režim zobrazení
- jak má editor nebo prohlížeč vizuálně reagovat

Záměrně je to podobné AutoCADu. V CAD-Viewer můžete systémovou proměnnou nastavit přímo z příkazového řádku zadáním jejího názvu a následně nové hodnoty.

Například:

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

To znamená, že příkazový řádek považuje samotný název systémové proměnné za příkaz sloužící k aktualizaci daného nastavení.

CAD-Viewer tento model přebírá, aby bylo možné nastavení za běhu číst, měnit a sledovat jediným konzistentním mechanismem, místo aby bylo natvrdo zadrátováno v logice příkazů.

## Nastavení systémové proměnné z příkazového řádku

Postup na příkazovém řádku je jednoduchý:

1. Zadejte název systémové proměnné.
2. Stiskněte Enter.
3. Zadejte novou hodnotu.
4. Stiskněte Enter znovu pro její použití.

Jde o stejný způsob interakce, jaký mnoho uživatelů CAD již zná z AutoCADu.

Chcete-li například změnit aktuální hladinu:

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

Chcete-li změnit velikost pickboxu:

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

Jinými slovy, přiřazení systémové proměnné nevyžaduje samostatný postup ve stylu `SETVAR`. Název systémové proměnné můžete zadat přímo na příkazovém řádku a přiřadit jí novou hodnotu.

## Jak jsou systémové proměnné registrovány jako příkazy

V CAD-Viewer lze systémové proměnné používat z příkazového řádku proto, že jsou během inicializace aplikace registrovány jako běžné příkazy.

Registrace probíhá v `AcApDocManager`. Načte všechny deskriptory systémových proměnných z `AcDbSysVarManager` a zaregistruje každý název proměnné jako příkaz:

```ts
const sysVars = AcDbSysVarManager.instance().getAllDescriptors()
sysVars.forEach(sysVar => {
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    sysVar.name,
    sysVar.name,
    new AcApSysVarCmd()
  )
})
```

To znamená:

- každá registrovaná systémová proměnná se automaticky stane příkazem
- název příkazu je samotný název systémové proměnné, například `CLAYER` nebo `PICKBOX`
- všechny tyto příkazy sdílejí stejnou implementaci: `AcApSysVarCmd`

`AcApSysVarCmd` neobsahuje natvrdo zapsanou konkrétní proměnnou. Při spuštění používá aktuální název příkazu (`this.globalName`) k vyhledání odpovídajícího deskriptoru systémové proměnné, vyzve uživatele k zadání nové hodnoty a poté zavolá `setVar(...)`.

Jeho tok je v podstatě:

`zadán název systémové proměnné` -> `AcApSysVarCmd.execute()` -> výzva k zadání hodnoty -> `AcDbSysVarManager.setVar(...)`

Zapojeny jsou tedy dvě vrstvy:

- `AcDbSysVarManager` určuje, které systémové proměnné existují za běhu
- `AcApDocManager` tyto běhové proměnné zpřístupňuje jako příkazy příkazového řádku

Proto přidání podpory nové systémové proměnné obvykle začíná registrací jejího deskriptoru v `AcDbSysVarManager`. Jakmile je zahrnuta v `getAllDescriptors()`, může být zaregistrována do zásobníku příkazů a používána přímo z příkazového řádku.

## Jak je to navrženo v CAD-Viewer

Současná implementace je soustředěna do dvou souborů:

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

Mají různé určení.

### 1. `AcDbSystemVariables`

`AcDbSystemVariables` je kanonický seznam konstant názvů systémových proměnných.

Jeho hlavní role jsou:

- poskytovat jediný zdroj pravdy pro názvy proměnných
- vyhnout se natvrdo zapsaným řetězcům napříč kódovou základnou
- nabízet volajícím typově bezpečný způsob odkazování na proměnné
- podporovat odvozené typy, jako je `AcDbSystemVariableName`

Nejlépe jej chápete jako registr názvů systémových proměnných v CAD-Viewer.

### 2. `AcDbSysVarManager`

`AcDbSysVarManager` je běhový správce systémových proměnných. Odpovídá za:

- registraci deskriptorů proměnných
- ukládání metadat o typu a výchozí hodnotě
- jednotný přístup pomocí `getVar` a `setVar`
- cachování proměnných, které nejsou v databázi
- šíření událostí změny

Je to v podstatě registr, přístupová vrstva a rozbočovač událostí pro systémové proměnné.

## Dva druhy systémových proměnných

V současném návrhu spadají systémové proměnné do dvou kategorií.

### Proměnné uložené v databázi

Tyto proměnné žijí na `AcDbDatabase`. `AcDbSysVarManager` je čte a zapisuje mapováním názvu proměnné na pole databáze.

Mezi aktuálně registrované příklady patří:

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

Mají blíže ke stavu výkresu a výchozím vlastnostem výkresu.

### Proměnné mimo databázi

Tyto proměnné nejsou uloženy přímo na `AcDbDatabase`. Jsou cachovány uvnitř `AcDbSysVarManager`.

Mezi aktuálně registrované příklady patří:

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

Mají blíže k chování editoru nebo stavu uživatelského rozhraní.

## Proč na tomto rozdělení záleží

Oddělení obou druhů proměnných přináší dva okamžité přínosy:

- nastavení související s výkresem může zůstat připojeno k datovému modelu databáze
- nastavení související s hostitelskou aplikací nebo uživatelským rozhraním není nutné nutit do databázové vrstvy

Díky tomu mohou systémové proměnné čistě sloužit jak datovému modelu, tak vrstvě editoru.

## Základní možnosti současné implementace

### Jednotný přístup

Volající nemusí vědět, zda je proměnná uložena v databázi, nebo v běhové cache vlastněné správcem. V obou případech mohou použít stejné přístupové API:

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### Převod typů

`setVar` provádí základní převod na základě typu registrovaného deskriptoru. Současná implementace podporuje převod například pro hodnoty:

- `number`
- `boolean`
- `color`

To je užitečné, když hodnoty přicházejí ze vstupu příkazového řádku, formulářů nebo skriptů a zpočátku dorazí jako řetězce.

### Oznámení o změnách

`AcDbSysVarManager` zpřístupňuje událost `sysVarChanged`, aby moduly vyšší úrovně mohly reagovat na aktualizace systémových proměnných.

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

V současné implementaci je tato událost šířena především pro změny proměnných mimo databázi, což ji činí obzvláště vhodnou pro synchronizaci editoru a uživatelského rozhraní.

## Příklad: `PICKBOX`

`PICKBOX` představuje polovinu velikosti pickboxu v pixelech. Je to proměnná mimo databázi, ale přímo ovlivňuje chování uživatelské interakce.

V `cad-viewer` naslouchá `AcEdCursorManager` změnám `PICKBOX`. Když se hodnota změní, znovu sestaví obdélníkovou část kurzoru nitkového kříže a okamžitě znovu použije aktivní kurzor. To ukazuje, že systémová proměnná není jen uložená konfigurace; může také fungovat jako řídicí prvek živého chování uživatelského rozhraní.

Referenční implementace:

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

Tok je následující:

`setVar('PICKBOX', ...)` -> událost `sysVarChanged` -> správce kurzoru aktualizuje vzhled kurzoru

To je jeden z nejjasnějších příkladů toho, proč je tato abstrakce užitečná.

## Jeden důležitý detail v současném kódu

`AcDbSystemVariables.ts` definuje kanonickou sadu rozpoznávaných názvů proměnných, ale `AcDbSysVarManager` jich ve svém konstruktoru aktuálně registruje jen podmnožinu.

Jinými slovy:

- `AcDbSystemVariables` je katalog názvů
- `AcDbSysVarManager.registry` určuje, které proměnné jsou za běhu skutečně podporovány

To je rozumná cesta vývoje: nejprve definovat názvy, poté postupně přidávat metadata typů, výchozí hodnoty, strategii úložiště a chování, jakmile je každá proměnná podporována.

## Doporučený vzor rozšíření

Při přidávání dalších systémových proměnných v budoucnu je doporučený postup:

1. Přidejte konstantu názvu proměnné do `AcDbSystemVariables`
2. Zaregistrujte deskriptor v `AcDbSysVarManager`
3. Rozhodněte, zda má být uložena v databázi, nebo pouze za běhu
4. Definujte její typ, výchozí hodnotu a popis
5. Pokud má ovlivňovat příkazy nebo uživatelské rozhraní, dejte přednost integraci založené na událostech před natvrdo zapsanými kontrolami v obchodní logice

## Jak přidat novou systémovou proměnnou

Přidání nové systémové proměnné obvykle zahrnuje pět kroků.

### 1. Přidejte název proměnné do `AcDbSystemVariables`

Nejprve přidejte novou kanonickou konstantu názvu do `AcDbSystemVariables`.

Tím zůstane název proměnné centralizovaný a zabráníte rozptýlení natvrdo zapsaných řetězců po kódové základně.

Například:

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. Zaregistrujte deskriptor v `AcDbSysVarManager`

Dále zaregistrujte proměnnou v `AcDbSysVarManager`. Právě tento krok zajistí, že je proměnná za běhu skutečně podporována.

Při registraci definujte:

- její název
- její typ
- její výchozí hodnotu
- zda je její hodnota uložena na `AcDbDatabase`, nebo pouze v cache správce
- jakýkoli popis nebo metadata vyžadovaná modelem deskriptoru

Toto je nejdůležitější krok. Pokud proměnná existuje pouze v `AcDbSystemVariables`, ale není zaregistrována v `AcDbSysVarManager`, je jen konstantou názvu, nikoli použitelnou systémovou proměnnou.

`AcApDocManager` během inicializace automaticky zaregistruje všechny registrované systémové proměnné jako příkaz.

To znamená, že nově přidanou proměnnou lze obvykle používat z příkazového řádku bez psaní vyhrazené třídy příkazu.

Tok na příkazovém řádku pak vypadá takto:

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. Zvolte model úložiště

Poté byste měli rozhodnout, zda nová proměnná je:

- uložená v databázi, pokud patří ke stavu výkresu nebo výchozím hodnotám výkresu
- mimo databázi, pokud patří k chování editoru, preferencím uživatelského rozhraní nebo běhovému stavu aplikace

Pokud je uložena v databázi, `AcDbSysVarManager` ji musí umět namapovat na pole na `AcDbDatabase`.

Pokud je mimo databázi, `AcDbSysVarManager` ji může uchovávat ve své interní běhové cache.

Základní pravidlo:

- proměnné uložené v databázi používejte pro věci, jako je aktuální hladina nebo aktuální barva
- proměnné mimo databázi používejte pro věci, jako je velikost pickboxu nebo barevné téma

### 4. Připojte chování, pokud je potřeba

Pokud změna proměnné má okamžitě ovlivnit uživatelské rozhraní nebo chování editoru, přidejte odpovídající logiku do spotřebitelského modulu.

Preferovaný vzor je reagovat na `sysVarChanged` namísto ruční kontroly proměnné na mnoha místech.

`PICKBOX` je dobrým příkladem tohoto vzoru:

- proměnná je zaregistrována v `AcDbSysVarManager`
- systém příkazů ji zpřístupňuje na příkazovém řádku
- `AcEdCursorManager` naslouchá změnám a okamžitě aktualizuje kurzor

V praxi je tedy minimální cesta pro novou proměnnou:

1. Definovat její název v `AcDbSystemVariables`
2. Zaregistrovat její deskriptor v `AcDbSysVarManager`
3. Rozhodnout její strategii úložiště
4. Volitelně připojit posluchače nebo obchodní logiku, která reaguje na její hodnotu

Poté se může účastnit stejného jednotného pracovního postupu `getVar` / `setVar` jako vestavěné systémové proměnné.

## Shrnutí

V CAD-Viewer jsou systémové proměnné víc než jen volná sbírka nastavení. Tvoří jednotnou abstrakci stavu aplikace:

- směrem dolů se mapují na databázový stav související s výkresem
- směrem nahoru řídí chování editoru a uživatelského rozhraní
- uprostřed poskytují centralizovaný přístup, typová omezení a oznámení o změnách

Pokud příkaz odpovídá na otázku „co udělat“, systémová proměnná odpovídá na otázku „za jakých nastavení nebo v jakém režimu to udělat“.
