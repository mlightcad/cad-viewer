---
title: 'Upgrade cad-simple-viewer a cad-editor'
---

# Upgrade cad-simple-viewer a cad-editor

Tato příručka vysvětluje, jak bezpečně upgradovat `@mlightcad/cad-simple-viewer` a `@mlightcad/cad-editor` — proč je nelze navyšovat izolovaně, které související balíčky se musí posunout společně a jaké existují dva spolehlivé způsoby, jak pro dané vydání určit správnou kompatibilní sadu verzí.

::: info Jednoduché UI je součástí `cad-simple-viewer`
Od vydání s touto změnou je **`@mlightcad/cad-simple-ui-plugin` odstraněn**. Panel nástrojů, dokovací karty a výchozí `AcApPaletteHost` jsou v **`@mlightcad/cad-simple-viewer/simple-ui`**. Zapněte přes `simpleUi` (výchozí zapnuto); pro `cad-editor` / CLI použijte `simpleUi: false`. Subcesta `@mlightcad/cad-simple-viewer/find` je odstraněna — API hledání importujte z `@mlightcad/cad-simple-viewer`. Soubor simple-ui je nyní `dist/cad-simple-ui.js` (export mapa `/simple-ui` beze změny).
:::

::: info Chrome dokovacího panelu se přesouvá do `cad-simple-viewer`
Plain-DOM **chrome dokovacího panelu** (`AcUiDockPanel`) je v **`@mlightcad/cad-simple-viewer`**. Vestavěné simple UI na tento dock montuje obsah karet (vrstvy / hledání / review / měření) a registruje `AcApPaletteHost`; `cad-editor` registruje svůj Vue hostitel palety.

Migrace:

- Importujte `AcUiDockPanel` / `AcUiDockPanelTab` / `AcUiDockPanelSide` z `@mlightcad/cad-simple-viewer`.
- i18n klíče jsou pod **`main.dockPanel.*`**.
- Bez hostitele `AcApPaletteService.open` používá `AcUiDockPanel` (pravý dock / telefonní sheet).
- Pojmenované karty: `AcApPaletteService.openNamedTab` / `ACAP_PALETTE_NAMED_TAB` — **vyžadují registrovaného hostitele** (bez dock fallbacku). Hostované `HTMLElement` panely dál používají `AcApPaletteService.open`.
  :::

::: info Sdílené nastavení modelu AI (`@mlightcad/cad-llm-plugin`)
Od vydání, které obsahuje tuto změnu, se nastavení poskytovatelů LLM přesouvá z `@mlightcad/cad-agent-plugin` do nového balíčku **`@mlightcad/cad-llm-plugin`**, takže CAD agent i rozpoznávání textu `pdftext` (OCR) sdílejí jednu konfiguraci. Nový balíček přidává příkaz **LLMSETTINGS** a dialog nastavení nezávislý na UI frameworku (dostupný i na kartě AI pásu karet v `@mlightcad/cad-editor`) a `@mlightcad/cad-simple-viewer` přidává `AcApLlmSettingsService`, přes který může jakákoli funkce dialog otevřít nebo zjistit, zda je nakonfigurován model s podporou obrázků.

Migrace hostitelských aplikací:

- Nainstalujte `@mlightcad/cad-llm-plugin` (nyní peer závislost `@mlightcad/cad-agent-plugin`) a vedle `registerLazyAgentPlugin` volejte `registerLazyLlmPlugin`. `@mlightcad/cad-editor` to při nainstalovaném balíčku udělá sám.
- `registerLazyAgentPlugin` už neregistruje rozpoznávač textu. Rozpoznávač má nyní id `cad-llm` (dříve `cad-agent`) a registruje ho `registerLazyLlmPlugin`. Z `acapAgentRecognizeText` / `cleanRecognizedText` jsou nyní `acapLlmRecognizeText` / `acapLlmCleanRecognizedText` v `@mlightcad/cad-llm-plugin`.
- Vloženou kartu nastavení v panelu agenta nahrazuje dialog; tlačítko s ozubeným kolem otevře LLMSETTINGS.
- Uložená nastavení zůstávají: klíč `localStorage` `cad-agent-plugin.llm-config` se nemění.
- Pokud používaný model podporuje jen text, OCR použije první nakonfigurovaný model s podporou obrázků.

```ts
import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'
import { registerLazyLlmPlugin } from '@mlightcad/cad-llm-plugin/register'

registerLazyLlmPlugin(pluginManager)
registerLazyAgentPlugin(pluginManager)
```

:::

::: info Import PDF: z `ipdf` je `PDFIMPORT` / `-PDFIMPORT`
Od vydání, které obsahuje tuto změnu (1.8.0), používá příkaz pro import PDF v `@mlightcad/cad-pdf-plugin` názvy z AutoCADu:

- **PDFIMPORT** po výběru souboru otevře dialog **Importovat PDF** (`AcUiPdfImportDialog`): stránka s náhledem, bod vložení (X/Y nebo na obrazovce), měřítko a režim (Obnovit výkres / Zachovat vzhled PDF).
- **-PDFIMPORT** zachovává výzvy na příkazovém řádku, které mělo `ipdf` (stránka, bod vložení s možnostmi **Měřítko** a **Režim**). Jeho třída je `AcApImportPdfPromptCmd`.

Migrace: `ipdf` již neexistuje. Skripty, které spouštěly `executeCommand('ipdf')` a odpovídaly na výzvy, mají použít `-pdfimport`; hostitelé s vlastním pásem karet mají použít `pdfimport` (ID položky pásu karet v cad-editor je nyní `cmd-pdfimport`). Popisy příkazů se přesouvají z `command.ACAD.ipdf` do `command.ACAD.pdfimport` / `command.ACAD.-pdfimport` a texty výzev z `jig.ipdf` do `jig.pdfimport` (texty dialogu v `jig.pdfimport.dialog`). `AcApPdfImportConvertor.importFromFilePicker` nyní zobrazí dialog; `importFromCommandLine` je postup s výzvami.
:::

::: info Chytré bloky: Vyhledat a převést (`BSEARCH`)
Od vydání, které obsahuje tuto změnu, registruje `@mlightcad/cad-simple-viewer` příkaz **-BSEARCH** a `@mlightcad/cad-editor` přidává **BSEARCH** (alias `BCONVERT`) s kartou Vyhledat a převést v paletě nástrojů (seznam nalezených instancí) a dialogem Převést na blok (karty Vložit a AI na pásu karet).

Porovnávání tvarů se přesunulo z `@mlightcad/cad-pdf-plugin` do `@mlightcad/cad-simple-viewer`. Upravte importy:

| `@mlightcad/cad-pdf-plugin` (zastaralé)                                    | `@mlightcad/cad-simple-viewer`                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `findPdfShapeMatches`                                                      | `acedFindShapeMatches`                                                           |
| `applyPdfAffine`                                                           | `acedApplyAffine2d`                                                              |
| `pdfEntityToFeature`                                                       | `acedEntityToShapeFeature(entity, id, { matchLayer: false })`                    |
| `PdfMatchFeature` / `PdfAffine` / `PdfShapeMatch` / `PdfShapeMatchOptions` | `AcEdShapeFeature` / `AcEdAffine2d` / `AcEdShapeMatch` / `AcEdShapeMatchOptions` |

Staré názvy fungují dál jako zastaralé aliasy. Text se přesunul z `kind` do `label`. `pdfblock` nyní používá pořadí výzev `-BSEARCH` (Převést → Nový/Existující → název → bod vložení → rozsah); skripty odpovídající na staré výzvy je třeba upravit.
:::

::: info AutoCAD skupiny (`GROUP` / `PICKSTYLE` / `GROUPDISPLAYMODE`)
Od vydání, které obsahuje tuto změnu, `@mlightcad/cad-simple-viewer` registruje **GROUP**, **-GROUP**, **UNGROUP** a **GROUPEDIT**, rozšiřuje výběr při `PICKSTYLE` `1` nebo `3` a uplatňuje úchyty `GROUPDISPLAYMODE` u volitelných skupin. `@mlightcad/cad-editor` přidává **CLASSICGROUP** (dialog Seskupování objektů) a panel Domů → Skupiny na pásu karet.

Vyžaduje `@mlightcad/data-model` se systémovými proměnnými `PICKSTYLE` (0–3, výchozí `1`) a `GROUPDISPLAYMODE` (0–2, výchozí `2`). Sdílený výběr asociativní šrafy (`PICKSTYLE` 2/3) zůstává no-op, dokud `AcDbHatch` nezíská soft-pointery hranic.
:::

::: info Náhled výběru v `cad.view.capturePreview`
Od vydání, které obsahuje tuto změnu, `CadSession.capturePreview` přijímá objekt voleb místo holého čísla `longSide`:

```ts
capturePreview?(options?: {
  longSide?: number
  selection?: boolean
}): Promise<CaptureDrawingPreviewResult>
```

Ve skriptu použijte `cad.view.capturePreview({ longSide?, selection? })`. Po `cad.selection.replace(ids)` předáte `selection: true` pro vykreslení vybraných entit stejnou batch-preview cestou jako ENTPREVIEW (rámování podle scénových bounds, ne databázových `geometricExtents`) a připojení PNG k výsledku nástroje. Prázdný výběr vrací `reason: 'no-selection'`. Bezhlavový `createDatabaseSession` stále přeskočí náhledy (bez rendereru).
:::

::: info Náhled hladin v `cad.view.capturePreview`
Od vydání, které obsahuje tuto změnu, přidává `CadCapturePreviewOptions` volbu `layers?: string | string[]` a `CaptureDrawingPreviewFailure` hodnotu `'no-layers'`:

```ts
cad.view.capturePreview({ layers: ['WALL', 'DOOR'], longSide: 1024 })
```

Vykreslí se jen geometrie modelového prostoru na těchto hladinách (INSERT přispěje jen svými částmi na těchto hladinách) a snímek se ořízne na společný rozsah hladin místo celého výkresu. Názvy hladin nerozlišují velikost písmen; neznámé názvy vyhodí chybu během běhu skriptu; `layers` nelze kombinovat se `selection: true`. `normalizeCadCapturePreviewOptions` nyní vrací `NormalizedCadCapturePreviewOptions` (`layers` jako `string[]` bez duplicit). Vlastní implementace `CadSession.capturePreview` by měly zpracovat `options.layers`, nebo vrátit `reason: 'no-layers'`. Implementace prohlížeče používá novou `AcApEntityPreviewConvertor.captureLayers(layerNames, longSide)`.
:::

::: info Lehký vstup pro úvodní stránku otevření souboru
Od **1.8.0** nabízí `@mlightcad/cad-simple-viewer` podcestu bez DocManageru pro úvodní stránky. Upřednostněte **`acuiCreateFileOpenSession`** (lazy `createDocManager` + automatické otevření / `attachSourcesTo`). Použijte `AcUiFileOpenLanding`, když otevíráte výkresy sami (např. Vue `MlCadViewer`):

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

Použijte ji na domovské / výběrové obrazovce, aby plný prohlížeč zůstal lazy až do otevření výkresu. Pro Vue editor je protějškem `@mlightcad/cad-editor/locale` pro i18n bez montáže `MlCadViewer`.

Úplný postup: [Panel otevření souboru](./file-open-panel). Smlouvy cloudových zdrojů: [Plugin datového zdroje](./data-source-plugin).
:::

::: warning Balíček byl přejmenován: `@mlightcad/cad-viewer` → `@mlightcad/cad-editor`
Od verze **1.8.0** se balíček dříve publikovaný jako `@mlightcad/cad-viewer` jmenuje `@mlightcad/cad-editor`, aby jeho název odpovídal tomu, co skutečně dělá.

- **Starý balíček se už nevyvíjí.** `@mlightcad/cad-viewer` končí na 1.7.x a žádné další vydání se v registry neobjeví, takže `pnpm add @mlightcad/cad-viewer@1.8.0` skončí chybou 404. Projekt je stále udržovaný — jen pod novým názvem.
- **Nic jiného se nezměnilo.** Změnil se pouze název balíčku a názvy generovaných souborů; exporty (`MlCadViewer`, `i18n`, …) i jejich použití jsou stejné.
- **Přejmenujte v rámci stejného upgradu**, aby prohlížeč zůstal na stejné verzi jako zbytek sady:

```diff
  {
    "dependencies": {
-     "@mlightcad/cad-viewer": "1.7.8",
+     "@mlightcad/cad-editor": "1.8.0",
      "@mlightcad/cad-simple-viewer": "1.8.0"
    }
  }
```

```diff
- import { MlCadViewer, i18n } from '@mlightcad/cad-viewer'
+ import { MlCadViewer, i18n } from '@mlightcad/cad-editor'
```

Pokud soubory z CDN (jsDelivr, unpkg, …) připínáte na konkrétní verzi, upravte i názvy souborů:

```diff
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.js
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.css
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.js
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.css
```

::: tip Název repozitáře se nezměnil
GitHub repozitář je stále [`mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) a dokumentační web i živá dema si zachovávají stávající cesty. Změnil se pouze **název balíčku na npm**, takže všechny odkazy na repozitář a issue v této příručce fungují dál.
:::
:::

::: warning Veřejné API exportu HTML bylo přejmenováno (`AcExHtml` / `acexHtml`)
Od verze **1.8.0** používají veřejné typy a funkce `@mlightcad/cad-html-core` (znovu exportované přes `@mlightcad/cad-html-plugin`) vrstvové předpony `AcExHtml*` (typy) a `acexHtml*` (funkce), stejně jako ostatní vrstvy v monorepu.

Chování se nemění; mění se jen názvy symbolů. Při upgradu z 1.7.x aktualizujte importy:

```diff
  import {
-   type AcExSnapshot,
-   buildAcExPackage,
-   zipAcExPackageFiles,
-   unzipAcExPackageFiles,
-   packHtml,
-   packHtmlPackage
+   type AcExHtmlSnapshot,
+   acexHtmlBuildPackage,
+   acexHtmlZipPackageFiles,
+   acexHtmlUnzipPackageFiles,
+   acexHtmlPackHtml,
+   acexHtmlPackHtmlPackage
  } from '@mlightcad/cad-html-plugin'
```

Stejné přejmenování platí i pro další pomocné funkce HTML-core (například `captureAcExSavedViewExtents` → `acexHtmlCaptureSavedViewExtents`, `buildOsnapCatalog` → `acexHtmlBuildOsnapCatalog`). API na úrovni příkazů jako `AcApHtmlConvertor` a `chtml` / `-chtml` nejsou ovlivněna. Vývojové příručky s novými názvy cílí na **1.8.0+**; na 1.7.x používejte i nadále staré symboly.
:::

::: tip Skriptový hostitel: vytváření skutečných kót (`drawDim*`)
Od vydání po **1.8.0-preview.2** umí `cad.edit.transaction` v `@mlightcad/cad-script-core` vytvářet kótovací entity — nejen je číst ze snapshotů:

- `drawDimAligned`, `drawDimLinear`, `drawDimDiameter`, `drawDimRadius`
- `drawDimAngular`, `drawDimArc`, `drawDimOrdinate`

Agenti a skripty by měli volat tato API místo napodobování kót čarami, šipkami a textem. Průměr/poloměr přijímají `center` + `radius`, takže snapshot kružnice lze předat přímo. Viz [API skriptů](../guide/script/api.md).
:::

::: tip Skriptový hostitel: statistiky po blocích na `cad.blocks`
Od vydání s touto změnou `cad.blocks` poskytuje u každého bloku `entityCount` / `typeCounts` bez plného pole `entities`. Pro součty preferujte tato pole nebo `count(pred)`. Snímky přes `where` / `inBlock(id, pred)` — snímek celého prostoru se zastaví kolem 500 s `too_many_matches`. `where` / `count` / `inBox` procházejí jen modelový a výkresový prostor.
:::

::: info SVG File → Open
Od verze **1.8.0** lze `.svg` otevřít jako výkres přes File → Open / `openDocument` / `openUrl`. Konverze je v novém balíčku [`@mlightcad/cad-svg-converter`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-converter). `initializeCadViewer` v `cad-editor` jej registruje automaticky; při samotném `cad-simple-viewer` zavolejte jednou `registerSvgConverter()`. Export zůstává `csvg` v `cad-svg-plugin`.
:::

::: info Export PDF rozdělen do sdíleného jádra (prohlížeč + Node)
Od verze **1.8.0** používá export PDF stejné vrstvení jako export HTML. Sdílená logika je v `@mlightcad/cad-pdf-core` (model voleb a pipeline database → PDF, **bez** závislosti na `cad-simple-viewer` / DOM). Spotřebovávají ji dvě frontendy:

| Balíček                       | Role                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `@mlightcad/cad-pdf-plugin`   | Prohlížečové `cpdf` / `-cpdf` / `pdfimport` (a Vue dialog exportu) |
| `@mlightcad/cad-pdf-exporter` | Headless Node DXF/DWG → PDF — **bez prohlížeče**                   |

**Integrátoři v prohlížeči — většinou beze změny.** Nadále používejte `cpdf` / `-cpdf` / `pdfimport`, `AcApPdfConvertor`, `AcApPdfExportOptions` a `resolveAcApPdfExportOptions`. Nainstalujte nový peer `@mlightcad/cad-pdf-core` vedle pluginu (stejná verze jako `cad-simple-viewer`).

**API / chování, které se uživatelů týkají:**

- Nová volba `colorMode: 'color' | 'monochrome'` (výchozí `'color'`). Dostupná v dialogu `cpdf`, jako **poslední** výzva `-cpdf` (`Color` / `Monochrome`) a na `AcApPdfExportOptions`. Stávající skripty `-cpdf` musí po odpovědi na režim textu tuto výzvu zodpovědět (nebo poslat prázdný řádek pro výchozí hodnotu).
- Server / CI bez prohlížeče: místo ovládání `cpdf` přes Playwright použijte `@mlightcad/cad-pdf-exporter` (`exportFileToPdf`, `convertDatabaseToPdf`).

```ts
// Prohlížeč (názvy beze změny)
import {
  AcApPdfConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({ colorMode: 'monochrome' })
)

// Node, bez prohlížeče
import { exportFileToPdf } from '@mlightcad/cad-pdf-exporter'

await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome'
})
```

Pokročilé volání sdílené pipeline přímo používá `acexPdfExportDatabase` / `acexPdfResolveExportOptions` z `@mlightcad/cad-pdf-core`. Fonty, rozvržení a režim textu popisují README jednotlivých balíčků.
:::

## Přehled

`@mlightcad/cad-simple-viewer` a `@mlightcad/cad-editor` **nejsou samostatné balíčky**. Jsou součástí těsně integrovaného ekosystému, který sdílí společnou kódovou základnu a cyklus vydávání. Každé vydání obsahuje koordinovanou sadu aktualizací napříč pluginy, renderery, balíčky data-model, knihovnami pro vykreslování textu a UI frameworky třetích stran.

**Upgrade pouze `cad-simple-viewer` nebo `cad-editor` izolovaně může vést k jemným chybám za běhu**, včetně:

- Rozhraní pluginů očekávající API signatury, které se změnily v novějších (nebo starších) verzích jádra
- Nesoulad tvaru data-model mezi tím, co jádro očekává, a tím, co starší parser/renderer produkuje
- Chybějící kompatibilita WebAssembly nebo Worker po navýšení libredwg-converter
- Problémy s vykreslováním textu, když se verze `mtext-renderer` / `mtext-parser` rozjedou
- Breaking nebo behaviorální změny Three.js, které nejsou sladěné napříč vrstvou rendereru

Vždy upgradujte **celou sadu souvisejících balíčků společně**. Dva spolehlivé způsoby, jak určit správné verze, jsou popsány níže.

---

## Ekosystém v kostce

Před upgradem pomůže vědět, které balíčky patří ke koordinovanému vydání a které jsou třetích stran. Následující kategorie jsou synchronizovány se stejným vydáním cad-editor:

### Základní balíčky prohlížeče

| Balíček                        | Role                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `@mlightcad/cad-simple-viewer` | Jádro nezávislé na frameworku (správa dokumentů, zásobník příkazů, propojení vykreslování) |
| `@mlightcad/cad-editor`        | Obal uživatelského rozhraní Vue 3 + Element Plus postavený nad cad-simple-viewer           |

### Pluginy — **musí přesně odpovídat verzi cad-simple-viewer**

| Balíček                                  | Účel                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `@mlightcad/cad-html-plugin`             | Export samostatného HTML jedním kliknutím           |
| `@mlightcad/cad-pdf-plugin`              | Prohlížečový export PDF a import PDF do CAD         |
| `@mlightcad/cad-svg-plugin`              | Export SVG                                          |
| `@mlightcad/cad-simple-viewer/simple-ui` | Built-in plain-DOM toolbar / dock tabs (`simpleUi`) |
| `@mlightcad/cad-agent-plugin`            | Interakce poháněná AI agentem                       |
| `@mlightcad/cad-onedrive-plugin`         | Integrace OneDrive                                  |
| `@mlightcad/cad-google-drive-plugin`     | Integrace Google Drive                              |

> **Základní pravidlo:** každý plugin ve výše uvedeném seznamu by měl být připnut k **přesně stejnému číslu verze** jako `cad-simple-viewer`, na který upgradujete (například `1.7.5`).

### Sdílená exportní jádra a headless exportéry (stejná verze jako jádro)

| Balíček                        | Účel                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `@mlightcad/cad-html-core`     | Sdílená pipeline HTML snapshot / balení (bez prohlížeče / DOM)           |
| `@mlightcad/cad-html-exporter` | Headless Node export HTML                                                |
| `@mlightcad/cad-pdf-core`      | Sdílený model voleb PDF a pipeline database → PDF (bez prohlížeče / DOM) |
| `@mlightcad/cad-pdf-exporter`  | Headless Node DXF/DWG → PDF (bez prohlížeče)                             |

### Interní vrstva rendereru (stejná verze jako jádro, publikováno samostatně)

| Balíček                     | Účel                                           |
| --------------------------- | ---------------------------------------------- |
| `@mlightcad/three-renderer` | Vykreslovací engine 2D/3D založený na THREE.js |
| `@mlightcad/pdf-renderer`   | Backend obsahu PDF používaný `cad-pdf-core`    |

Tyto jsou interně spotřebovávány pluginy a cad-simple-viewer. Obvykle je **neinstalujete** přímo, ale jejich verze musí být kompatibilní s pluginy, které instalujete.

### Nízkourovňová datová a textová vrstva — **musí odpovídat verzím z vydání**

| Balíček                         | Poznámky                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `@mlightcad/data-model`         | Základní typy entit/databáze; každé vydání je navyšuje společně s prohlížečem |
| `@mlightcad/libredwg-converter` | WebAssembly obal pro parsování DWG — podpora DWG na něm závisí                |
| `@mlightcad/mtext-parser`       | Parser obsahu MTEXT                                                           |
| `@mlightcad/mtext-renderer`     | Renderer geometrie MTEXT → THREE                                              |
| `@mlightcad/mtext-input-box`    | Widget editoru MTEXT na plátně                                                |

### Vue UI závislosti pouze pro cad-editor

Tyto se objevují v overrides v `pnpm-workspace.yaml`, ale jsou potřeba pouze při použití `@mlightcad/cad-editor` (plné Vue 3 UI). Integrace cad-simple-viewer je přímo neinstalují.

| Balíček                    | Účel                                     |
| -------------------------- | ---------------------------------------- |
| `@mlightcad/ribbon`        | Komponenta uživatelského rozhraní ribbon |
| `@mlightcad/ui-components` | Sdílené primitivy Vue UI                 |

### Peer závislosti třetích stran (ponechte verze tak, jak jsou připnuty ve vydání)

| Balíček                               |
| ------------------------------------- |
| `three`                               |
| `vue` (pouze pro cad-editor)          |
| `element-plus` (pouze pro cad-editor) |
| `vue-i18n` (pouze pro cad-editor)     |
| `lodash-es`                           |

---

## Metoda 1 — Přečtěte `pnpm-workspace.yaml` na cílové verzi

Kanonickým zdrojem pravdy pro každé vydání je sekce `overrides` v `pnpm-workspace.yaml` monorepa na odpovídajícím Git tagu. Uvádí **přesné verze** každého balíčku `@mlightcad/*` a peer závislosti třetí strany, se kterými bylo vydání testováno.

### Kroky

1. Najděte tag verze, na kterou chcete upgradovat. Tagy následují vzor `vX.Y.Z` (například `v1.7.5`). Všechny tagy jsou v hlavním repozitáři:

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. Otevřete `pnpm-workspace.yaml` na tomto tagu. Šablona URL je:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   Nahraďte `vX.Y.Z` skutečným tagem verze, například:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. Zkopírujte blok `overrides:` do `pnpm-workspace.yaml` vašeho projektu. Bude vypadat podobně jako tento (zkrácený příklad):

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. Aktualizujte každý používaný `@mlightcad/cad-*-plugin` na **stejnou verzi** jako `cad-simple-viewer` / `cad-editor`:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-editor": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. Spusťte `pnpm install` (nebo `npm install`) a ověřte, že se aplikace načte bez varování o peer závislostech.

> Pokud je váš projekt obyčejný workspace `npm` nebo `yarn`, zkopírujte stejné `overrides` do bloku `pnpm.overrides` / `resolutions`. Rozhodující jsou hodnoty verzí, nikoli formát souboru.

---

## Metoda 2 — Sledujte upgradovací commity `cad-simple-viewer-demo`

Repozitář [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) je oficiální minimální hostitel pro `cad-simple-viewer`. Pokaždé, když je jádro vydáno, obdrží ukázkový projekt commit s názvem `feat: upgrade to cad-simple-viewer vX.Y.Z`, který aktualizuje **všechny související závislosti společně**. Tento commit je praktická, konkrétní reference ukazující přesně, které verze správci pro dané vydání použili.

### Kroky

1. Otevřete historii commitů souboru package.json:

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. Najděte commit, jehož zpráva uvádí `feat: upgrade to cad-simple-viewer vX.Y.Z` pro vaši cílovou verzi.

3. Klikněte na commit pro zobrazení diffu. Diff ukáže koordinované navýšení napříč:
   - Všechny pluginy (na stejnou verzi jako `cad-simple-viewer`)
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - a všechny balíčky třetích stran, které se změnily

4. Přepište verze z diffu do svého `package.json`.

### Konkrétní příklad — upgrade v1.7.3 → v1.7.4

Následující skutečný diff byl převzat z [commitu `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff) v ukázkovém repozitáři. Všimněte si, jak se **každý jednotlivý balíček `@mlightcad/*` posunul v tandemu**:

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> Toto je přesně ten druh koordinované aktualizace, kterou byste měli provést ve svém projektu. Všimněte si, že `mtext-parser` zůstal na `^1.5.3` (změna nebyla potřeba), zatímco `mtext-renderer` se posunul z `0.13.1` na `0.13.2`. Tato rozhodnutí se dělají pro každé vydání a měli byste je následovat, místo abyste hádali.

---

## Po upgradu — rychlé kontroly

1. **Instalace** — spusťte čistou instalaci, abyste zajistili, že nebudou překážet zastaralé `node_modules`:

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **Otevření výkresu** — ověřte, že se načtou soubory DXF i DWG, že funguje posun/přiblížení a že se v konzoli neobjevují chyby.

3. **Export** — pokud používáte exportní pluginy, otestujte export HTML, PDF a SVG na ukázkovém výkresu.

4. **Kontrola varování o peer závislostech** — `pnpm` varuje, pokud nejsou splněny některé `peerDependencies`. Považujte je za nutné opravit; obvykle vznikají odchýlením verze pluginu od jádra.

5. **Sestavení aplikace** — plný `vite build` (nebo ekvivalent) je nejrychlejší způsob, jak zachytit typové neshody mezi typy prohlížeče a vaším integračním kódem.

---

## Časté dotazy

**Q: Mohu zkombinovat `cad-simple-viewer@1.7.5` s `cad-html-plugin@1.7.3`?**

A: Obecně ne. Pluginy jsou vydávány společně s jádrem a často závisí na interních API, která se mezi menšími verzemi změnila. I když TypeScript zkompiluje, můžete narazit na chyby za běhu (např. export tiše produkující prázdný výstup nebo registrace pluginu selhávající se zavádějící chybou).

**Q: Co když používám pouze `cad-simple-viewer` bez pluginů?**

A: Stále potřebujete `data-model` a (pokud načítáte soubory DWG) `libredwg-converter` v kompatibilních verzích. `pnpm-workspace.yaml` na cílovém tagu stále platí.

**Q: Chrání mě sémantické verzování?**

A: Semver rozsahy (`^`, `~`) fungují dobře pro navyšování na úrovni patch _v rámci_ jedné série vydání (například `^1.7.0` automaticky zvolí `1.7.5`), ale **koordinované verze pluginů/data-model/libredwg-converter** nejsou ze samotného semveru zjistitelné — nastavují je správci vydání. Pro jakékoli navyšování menší verze stále potřebujete jednu ze dvou výše uvedených metod, abyste věděli, které verze k sobě patří.

**Q: Používám npm/yarn místo pnpm. Platí to stále?**

A: Ano. Koordinace verzí je stejná bez ohledu na správce balíčků. Použijte `overrides` (pnpm), `resolutions` (yarn) nebo `overrides` (npm) s hodnotami z `pnpm-workspace.yaml`, nebo jednoduše připněte verze z diffu `cad-simple-viewer-demo` ve vašem `package.json`.
