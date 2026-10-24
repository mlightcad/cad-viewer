---
title: "Integrace Simple Viewer"
---

# Integrace Simple Viewer

**cad-simple-viewer** poskytuje **vysoce výkonné** základní komponenty CAD prohlížeče, jako je správa dokumentů, zpracování příkazů a spolupráce mezi UI a vykreslovacími enginy. Je navržen pro optimální výkon při práci s velkými CAD soubory.

Tento modul nezávisí na žádném UI frameworku a neposkytuje žádné UI kromě plátna. Pokud chcete integrovat vysoce výkonný CAD prohlížeč do webové aplikace s vlastním UI, je tento modul správnou volbou.

## Klíčové vlastnosti
- Správa dokumentů optimalizovaná pro velké soubory
- Efektivní zásobník příkazů a operace undo/redo
- Optimalizovaná integrace s vykreslovacími enginy
- Nastavení a správa kontextu zaměřené na výkon
- Design nezávislý na frameworku pro maximální flexibilitu

## Kdy byste měli zvolit cad-simple-viewer?

Použijte `cad-simple-viewer`, pokud potřebujete **pouze základní CAD logiku** (správu dokumentů, zásobník příkazů, integraci vykreslovacího enginu) bez závislosti na UI frameworku. Tento balíček je ideální, pokud:

- Chcete vytvořit **vlastní UI** nebo integrovat CAD funkce do prostředí, které není založeno na Vue ani na webu.
- Požadujete maximální flexibilitu a výkon pro práci s velkými CAD soubory a plánujete připojit logiku k vlastní vykreslovací nebo UI vrstvě.
- Chcete řešení nezávislé na frameworku, které poskytuje pouze nezbytné CAD operace a vykreslování na plátno.

**Doporučeno pro:** vlastní integrace, headless zpracování CAD nebo pokročilé uživatele vytvářející vysoce přizpůsobená CAD řešení.

## Instalace

```bash
npm install @mlightcad/cad-simple-viewer
```

## Použití

Základní i pokročilé použití naleznete v projektu [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example).

Integrace má dva kroky: nejprve **inicializujte aplikaci** (jednou vytvořte singleton `AcApDocManager`) a poté **otevřete výkres**.

### Inicializace aplikace

`AcApDocManager` je vstupním bodem balíčku `cad-simple-viewer`. Funguje jako singleton: při startu jednou zavolejte `AcApDocManager.createInstance(options)` a poté k němu přistupujte přes `AcApDocManager.instance`. Opakované volání `createInstance` pouze vrátí existující instanci a nové volby nepoužije.

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const docManager = AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  autoResize: true,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
})
```

Všechny volby jsou nepovinné a definuje je rozhraní `AcApDocManagerOptions`.

#### Plátno a rozvržení

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | nový prvek | HTML kontejner, který hostuje plátno. Pokud jej vynecháte, vytvoří se nový prvek a sami jej musíte vložit do DOM. |
| `width` | `number` | šířka kontejneru | Šířka plátna v pixelech. |
| `height` | `number` | výška kontejneru | Výška plátna v pixelech. |
| `autoResize` | `boolean` | `false` | Pokud je `true`, plátno automaticky sleduje změny velikosti kontejneru (změna velikosti okna, sbalení postranního panelu, ...). |
| `busyIndicatorHost` | `HTMLElement` | `container` | Hostitelský prvek překryvu zaneprázdněnosti (např. spinner exportu). Nastavte jej na obálku prohlížeče, aby maska pokryla pásku, panely nástrojů i stavový řádek. |

#### Vykreslování a písma

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `useMainThreadDraw` | `boolean` | `false` | Určuje, kde se vykreslují entity MTEXT. `true`: hlavní vlákno — nižší špičková paměť, ale pomalejší první vykreslení. `false`: Web Worker — více paměti, ale výkres se zobrazí dříve. |
| `preloadDefaultFonts` | `boolean` | `false` | Pokud je `true`, výchozí řetězec záložních písem se při inicializaci předem načte. Ve výchozím nastavení se písma načítají podle potřeby při kreslení textu. |

#### Workery a zdroje

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://cdn.jsdelivr.net/gh/mlightcad/cad-data` | Základní URL pro stahování runtime zdrojů, jako jsou písma a šablony výkresů. Pro offline nebo vlastní nasazení jej nasměrujte na vlastní kopii zdrojů. |
| `webworkerFileUrls` | `AcApWebworkerFiles` | – | URL worker balíčků: `mtextRender` (worker pro rozvržení/glyfy MTEXT) a `dwgParser` (nepovinný worker pro parsování DWG, používá se pro ověření připravenosti). Specifika bundlerů popisuje stránka [Konfigurace URL workerů](./configure-worker-urls). |
| `checkWorkersOnInit` | `boolean` | `false` | Pokud je `true`, nakonfigurované URL worker skriptů se po inicializaci ověří HEAD požadavky; výsledek je vystaven přes `AcApDocManager.instance.workersReady` a událost `workersReady`. |

#### UI a přepínače produktu

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `builtinOpenFileDialog` | `boolean` | `true` | Pokud je `false`, vestavěný výběr souborů příkazu OPEN se neinstaluje (užitečné, pokud máte vlastní UI pro otevírání). |
| `disableExport` | `boolean` | `false` | Pokud je `true`, příkazy pro export výkresů a související UI vstupy se neregistrují (`cdxf`, `pngout`, `jpgout`, `bmpout` a export HTML/PDF/SVG). Jde o produkt/UX přepínač, ne o DRM — data výkresu stále existují v paměti. |
| `docsBaseUrl` | `string` | dokumentační web MLightCAD | Absolutní kořenová URL lokalizovaných stránek uživatelské příručky používaných odkazy nápovědy v aplikaci. |
| `commandAliases` | `Record<string, string \| string[]>` | vestavěné aliasy | Přepíše aliasy příkazů podle jejich globálního názvu, například `{ LINE: ['L', 'LN'], CIRCLE: 'CI' }`. Příkazy, které nejsou uvedeny, si ponechají vestavěné aliasy. |

#### Pluginy a výchozí volby otevírání

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `plugins` | `{ fromConfig?, fromFolder? }` | – | Automaticky načte pluginy během inicializace. `fromConfig` přijímá instance pluginů nebo tovární funkce; `fromFolder` načte soubory pluginů ze složky (`folderPath`, `pluginList`, `continueOnError`). Viz [Pluginový systém](./plugin-system). |
| `openDocumentDefaults` | `AcApOpenDatabaseOptions` nebo `() => AcApOpenDatabaseOptions \| Promise<...>` | – | Výchozí volby pro soubory otevírané prostřednictvím vestavěného dialogu OPEN. Může to být statický objekt nebo synchronní/asynchronní továrna. Později lze aktualizovat přes `AcApDocManager.instance.setOpenDocumentDefaults(...)`. |

#### Registrace DWG konvertoru

`cad-simple-viewer` standardně DWG konvertor **neregistruje** (LibreDWG má licenci GPL). Pro otevírání souborů DWG zaregistrujte před otevřením konvertor, například `@mlightcad/libredwg-converter`:

```typescript
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

AcDbDatabaseConverterManager.instance.register(
  AcDbFileType.DWG,
  new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl: './workers/libredwg-parser-worker.js'
  })
)
```

### Otevření výkresu

Správce dokumentů nabízí dva způsoby otevření výkresu. Oba vracejí `Promise<boolean>`, který se při úspěšném otevření převede na `true`:

```typescript
// 1. Z URL (soubor stáhne prohlížeč)
await docManager.openUrl('https://example.com/plan.dwg', options)

// 2. Z obsahu souboru, který již máte (např. z file inputu)
const success = await docManager.openDocument(
  'plan.dwg',               // přípona názvu souboru určuje DWG vs DXF
  await file.arrayBuffer(), // obsah souboru jako ArrayBuffer
  options
)
```

Obě metody přijímají tentýž objekt `AcApOpenDatabaseOptions`. Pokud je vynechán, aplikuje správce `drawNoPlotLayers: false` a `progressiveRendering: false`. Tento typ kombinuje volby na úrovni prohlížeče se základním `AcDbOpenDatabaseOptions` z `@mlightcad/data-model`.

#### Volby prohlížeče

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `mode` | `AcEdOpenMode` | – | Režim přístupu: `Read` (0, pouze prohlížení), `Review` (4, revize, kompatibilní s Read), `Write` (8, plné čtení/zápis, kompatibilní s ostatními). Vyšší režimy jsou kompatibilní s nižšími. Určuje také výchozí `openViewMode` (viz níže). |
| `progressiveRendering` | `boolean` | `false` | Určuje, zda se geometrie vykresluje, dokud se výkres stále konvertuje. `false`: plátno se nepřekresluje, dokud není převedena každá entita, a překryv otevírání zůstane, dokud nedoběhnou odložené úlohy textu/glyfů INSERT. `true`: konverze entit se dělí napříč cykly smyčky událostí, takže geometrie se maluje po dávkách; po dokončení parsování a hlášení průběhu konverze je k dispozici posun/zoom a zbytek geometrie se dále konvertuje na pozadí. Pro interaktivní prohlížení velkých souborů použijte `true`, pro snímky obrazovky či deterministický první snímek `false`. |
| `openViewMode` | `AcApOpenViewMode` | `Extents` pro Read/Review, `Saved` pro Write | Jak zarámovat každé rozvržení, na kterém uživatel zatím nepracoval. `Extents` (`'extents'`) přiblíží na převedenou geometrii. `Saved` (`'saved'`) obnoví uložené zobrazení AutoCADu (modelový prostor používá VPORT `*ACTIVE`; papírový prostor použije limity rozvržení, pokud obsahují reálné viewporty, jinak rámeček viewportu). |
| `sysVars` | `AcApOpenSysVars` | – | Systémové proměnné, které se při otevření databaze přepíší. Klíče jsou názvy systémových proměnných (nerozlišují velikost písmen); hodnoty mohou být `number`, `boolean`, `string` nebo `AcCmColor`. Běžné příklady: `lwdisplay: false` pro skrytí tlouštěk čar, `paperbkcolor` pro barvu pozadí papírového prostoru. |
| `convertInvisibleLayers` | `boolean` | `false` | Pokud je `true`, entity na vypnutých/zmrazených vrstvách se převedou již při otevření, takže offline export HTML/PDF nepotřebuje druhý průchod. Pro interaktivní prohlížení ponechte `false` (převedou se, když se vrstva zapne). |
| `convertAllLayouts` | `boolean` | `false` | Pokud je `true`, všechna rozvržení papírového prostoru se zaregistrují a převedou během/ihned po otevření, takže export nečeká na návštěvu každé karty rozvržení uživatelem. |
| `skipSpatialIndex` | `boolean` | `false` | Pokud je `true`, během konverze entit se nevytvoří hierarchický prostorový index. Index slouží pro interaktivní výběr a chytrá rozsahy; headless export HTML/JPEG potřebuje jen dávky scény, takže jej lze pro úsporu času a paměti vynechat. |
| `cooperativeYield` | `boolean` | `true` | Pokud je `false`, deaktivuje kooperativní vzdávání se přes `setTimeout` během konverze entit a vynechá mezilehlé WebGL vykreslení. Headless skripty nepotřebují responzivní UI; vypnutí vzdávání zkracuje čas otevření. |

#### Volby databáze (zděděné z `@mlightcad/data-model`)

| Volba | Typ | Výchozí | Popis |
| --- | --- | --- | --- |
| `minimumChunkSize` | `number` | – | Minimální počet entit na jeden zpracovávaný blok. Větší bloky snižují režii plánování; oficiální příklad používá `1000`. Horní hranicí je celkový počet entit. |
| `timeout` | `number` | výchozí konvertoru | Časový limit parsování ve Web Workeru v milisekundách. Použije se jen tehdy, když vybraný konvertor parsuje ve workeru. |
| `encoding` | `string` | automatická detekce | Přepsání textového kódování pro názvy vrstev, poznámky, texty a atributy (například `'gbk'` nebo `'euc-kr'`). Pokud není uvedeno, DXF čte `$DWGCODEPAGE` a DWG kódovou stránku z hlavičky. Explicitně zadaná hodnota má přednost před automatickou detekcí — hodí se pro soubory s chybějící nebo chybně deklarovanou kódovou stránkou. |
| `drawNoPlotLayers` | `boolean` | `false` | Zda se kreslí entity na neukládacích ("no-plot") vrstvách (Defpoints, `*-NPLT`, ...). `true` = sémantika desktopového AutoCADu (na obrazovce viditelné); `false` = sémantika web/publikačního prohlížeče (skryté). `AcApDocManager` nastavuje výchozí `false`. |
| `circleSides` | `number` | `50` (koncept) | Maximální počet segmentů pro tessellaci celého kruhu. Nižší hodnoty šetří GPU paměť a zmenšují HTML export; vyšší vypadají hladčeji. Omezeno na rozsah DXF VPORT. Krátké oblouky používají méně segmentů. |
| `fileName` | `string` | – | Název souboru výkresu včetně přípony. Aktualizuje systémovou proměnnou `DWGNAME` (pouze pro čtení) otevřené databaze. |

#### Zastaralé volby

| Volba | Stav |
| --- | --- |
| `waitForTextGeometry` | Ignorováno. Obě fáze progresivního vykreslování řídí `progressiveRendering`; předání zapíše varování. |
| `fontLoader`, `failOnFontLoadError` | Odstraněno. Písma načítá textový renderer líně při kreslení; předání zapíše varování. |

#### Příklad

```typescript
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  layoutBackgroundColorFromRgb
} from '@mlightcad/cad-simple-viewer'

const options = {
  mode: AcEdOpenMode.Write,
  minimumChunkSize: 1000,
  progressiveRendering: true,
  openViewMode: AcApOpenViewMode.Extents,
  sysVars: {
    lwdisplay: false,
    paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
  }
}

const success = await AcApDocManager.instance.openDocument(
  'plan.dwg',
  await file.arrayBuffer(),
  options
)
if (!success) {
  console.error('Výkres se nepodařilo otevřít')
}
```

Pro sledování životního cyklu otevírání se přihlaste k odběru událostí na `AcApDocManager.instance.events`: `documentToBeOpened`, `documentCreated`, `documentToBeActivated`, `documentActivated`, `documentToBeDestroyed` a `documentDestroyed`.

### Úpravy výkresů v reálném čase

Ačkoli `cad-simple-viewer` nepodporuje ukládání výkresů do souborů DWG/DXF, poskytuje komplexní podporu pro **úpravy výkresů v reálném čase**. Do výkresu můžete přidávat, upravovat a mazat entity a prohlížeč se automaticky aktualizuje, aby tyto změny zobrazil.

Při úpravách entit pracujete přímo s podkladovou databází výkresu. Prohlížeč tyto změny automaticky rozpozná a odpovídajícím způsobem aktualizuje zobrazení. Tato synchronizace v reálném čase zajišťuje, že:

- všechny úpravy jsou okamžitě viditelné
- zásobník příkazů správně sleduje změny pro operace undo/redo. To bude brzy implementováno.

Díky této možnosti je `cad-simple-viewer` vhodný pro aplikace, které potřebují nejen zobrazovat CAD soubory, ale také umožnit uživatelům interagovat s obsahem výkresu a upravovat jej.

**Důležitá poznámka**: vzory použití v `cad-simple-viewer` jsou **velmi podobné AutoCAD RealDWG**. Pokud máte zkušenosti s vývojem pro AutoCAD RealDWG, budou vám struktura API a pracovní postup téměř totožné. Hlavní rozdíl je v tom, že používáme [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) místo nativních knihoven RealDWG.

Projekt [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) ukazuje, jak vytvořit výkres pomocí [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/).

## Role v MLightCAD

Tento balíček funguje jako vrstva základní logiky, která propojuje frontendové UI s vykreslovacími enginy a spravuje všechny operace související s dokumenty.

