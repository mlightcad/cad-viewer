---
title: "Vestavěné pluginy"
---

# Vestavěné pluginy

MLightCAD přibaluje sadu oficiálních pluginů. Každý plugin se zaměřuje na jednu věc — UI rozhraní, AI asistenta, exportní/importní pipeline nebo cloudové datové zdroje — a podle potřeby je lze kombinovat.

O samotném mechanismu pluginů (`AcApPlugin`, správce pluginů, líné načítání a psaní vlastních pluginů) pojednává část [Systém pluginů](./plugin-system). Instalace, registrace a úplné podrobnosti o API jsou v README každého balíčku — viz odkazy níže.

## Přehled pluginů

| Balíček | Účel | Příkazy / schopnosti |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | **UI s panelem nástrojů, správcem hladin a recenzní paletou** pro `cad-simple-viewer` (čistý DOM, bez Vue/React) | `layer`, `markuppanel`, výchozí panel nástrojů (zobrazení, měření, export, revize, motiv, jazyk) |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **CAD agent ovládaný přirozeným jazykem** (AI chatovací panel + volání kreslicích nástrojů) | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **Ruční konzole CAD skriptů** (spouští ověřené skripty nad výkresem, nepotřebuje LLM ani API klíč) | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | Export výkresů do **samostatného offline HTML** | `chtml` (dialog v `cad-viewer`), `-chtml` (příkazový řádek) |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **Export a import PDF** (vektorová pipeline) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **Export SVG** a sdílený vektorový renderer (používaný i exportem PDF) | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **Datový zdroj OneDrive** — otevírání DWG/DXF z OneDrive / SharePoint | Registruje `AcApDataSource` (`onedrive`); dvoukrokový Sign in → Open (bezpečný vůči blokování vyskakovacích oken) |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Datový zdroj Google Drive** — otevírání DWG/DXF z Google Drive | Registruje `AcApDataSource` (`googledrive`); dvoukrokový Sign in → Open (bezpečný vůči blokování vyskakovacích oken) |

Všechny pluginy spouštěné příkazy jsou **líně načítané**: nejprve se zaregistruje malý registrační stub a těžký bundle se stáhne až ve chvíli, kdy uživatel spustí spouštěcí příkaz. Registraci API popisuje část [Systém pluginů — Registrace pluginů](./plugin-system#registrace-pluginů).

---

## UI pluginy

### `@mlightcad/cad-simple-ui-plugin` — UI rozhraní pro simple viewer

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) záměrně nepřibaluje **žádné aplikační UI** — jen plátno a CAD jádro. Pokud vkládáte simple viewer do vlastní webové aplikace a chcete hotové rozhraní, aniž byste museli přijmout kompletní Vue základnu [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-editor), **`cad-simple-ui-plugin` je zamýšlená UI vrstva**.

Poskytuje:

- **Konfigurovatelný panel nástrojů** (umístění na libovolné hraně, výchozí CAD příkazy, vnořené nabídky, vlastní položky)
- **Dokovací panel** s kartou **správce hladin** (zapnutí/vypnutí hladin, výběr barvy ACI, přiblížení na hladinu dvojitým kliknutím) a kartou **recenzní palety** (seznam značek, stav, komentáře)
- **Synchronizaci motivu** se systémovou proměnnou `COLORTHEME` a CSS tokeny `--ml-ui-*` na hostitelském prvku
- **Synchronizaci jazyka** s `AcApI18n` (angličtina / čínština / čeština / turečtina)

Všechny widgety jsou nezávislé na frameworku (čistý DOM). Kompletní Vue aplikace `cad-viewer` má vlastní UI Element Plus a tento plugin nevyžaduje; `cad-simple-ui-plugin` použijte, když stavíte přímo na `cad-simple-viewer`.

→ **Rychlý start, přizpůsobení panelu nástrojů a možnosti:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI asistent pro kreslení

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) přidává do aplikací postavených na `cad-simple-viewer` **CAD agenta ovládaného přirozeným jazykem**. Uživatelé popíší běžnou řečí, co chtějí; agent volá CAD nástroje, aby prozkoumal výkres a vytvořil či upravil geometrii.

Poskytuje:

- **Líně načítaný** `AcApPlugin` (spouštěcí příkaz: `agent`), takže AI bundle není na kritické cestě
- **Vue chatovací panel** (`AgentChatPanel`) postavený na Vercel AI SDK (`Experimental_Agent` + `@ai-sdk/vue`)
- **Konfiguraci LLM v prohlížeči** — API klíče pro OpenAI, Anthropic či OpenAI-kompatibilní koncové body zůstávají na straně klienta (šifrovaně v `localStorage`)
- **CAD nástroje fáze 1** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- Řetězce UI v **angličtině / čínštině / turečtině / češtině** prostřednictvím vrstvy i18n pluginu

Kompletní Vue aplikace `cad-viewer` registruje agenta automaticky, jakmile je balíček nainstalován (karta palety). `cad-simple-viewer-demo` jej přes `cad-simple-ui-plugin` zapojuje do dokovací karty. Hostitelské aplikace volají `registerLazyAgentPlugin` a `setAgentPaletteOpener`, aby panel umístily tam, kde chtějí.

→ **Instalace, registrace a seznam nástrojů:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — konzole CAD skriptů

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) přidává do aplikací postavených na `cad-simple-viewer` **ruční konzoli CAD skriptů**. Na rozdíl od pluginu agenta **nekomunikuje** s modelem a nepotřebuje **žádný API klíč**: konzole spouští ověřený skriptový host z `@mlightcad/cad-agent-core` a každý skript je tělo funkce s jediným argumentem `cad`, které poskytuje programový přístup ke stejným kreslicím nástrojům, jaké používá agent.

- Líně načítaný `AcApPlugin` (spouštěcí příkaz: `cadscript`)
- Znovu využívá CAD nástroje z `@mlightcad/cad-agent-core`; tento balíček přidává pouze panel a příkaz
- Hostitelské aplikace volají `registerLazyCadScriptPlugin` a namontují `new CadScriptPanel().element` (dokovací karta v `cad-simple-viewer-demo`, karta nástrojové palety v `cad-viewer`); při odebrání karty zavolejte `destroy()`

→ **Použití:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## Pluginy pro export / import (HTML / PDF / SVG)

Tyto pluginy přidávají do stejného správce pluginů příkazy pro export (a import PDF). Jsou **líně načítané**, takže počáteční velikost stránky zůstává malá. Ukázka `cad-simple-viewer-demo` registruje všechny tři exportní pluginy plus pluginy UI/agenta/skriptů; kompletní aplikace `cad-viewer` registruje při bootstrapu exportní pluginy a pluginy agenta/skriptů (pokud jsou nainstalovány).

### HTML (`@mlightcad/cad-html-plugin`)

Jednosouborový **offline prohlížeč** pro sdílení a archivaci — exportované HTML obsahuje data výkresu a běhový prohlížeč, server není potřeba.

| Položka | Hodnota |
|------|-------|
| Příkaz | `chtml` (dialog v `cad-viewer`), `-chtml` (příkazový řádek přes `cad-simple-viewer-cli`) |
| Další konfigurace | `htmlViewerRuntimeUrl` v `AcApDocManager.createInstance()` — adresa URL souboru `viewer-runtime.iife.js` (zkopírujte z `dist/` balíčku) |
| Veřejné API | `registerLazyHtmlPlugin`, `createHtmlPlugin`, `AcApHtmlConvertor`, `packHtml`, typy snímků |

→ **Výstup sestavení a integrace:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **Headless CLI využívající stejnou pipeline:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF (`@mlightcad/cad-pdf-plugin`)

**Vektorový export PDF a import PDF do CAD.**

| Položka | Hodnota |
|------|-------|
| Příkazy | `cpdf` (export), `ipdf` (import) |
| Veřejné API | `registerLazyPdfPlugin`, `createPdfPlugin`, převodníky |

→ **Výstup sestavení a integrace:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG (`@mlightcad/cad-svg-plugin`)

**Vektorový export SVG** a sdílený vektorový renderer používaný exportem PDF.

| Položka | Hodnota |
|------|-------|
| Příkaz | `csvg` |
| Veřejné API | `registerLazySvgPlugin`, `createSvgPlugin`, `AcApSvgConvertor`, nástroje rendereru SVG |

→ **Výstup sestavení a integrace:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## Pluginy datových zdrojů (OneDrive / Google Drive)

Tyto pluginy neregistrují příkazy — registrují [`AcApDataSource`](./data-source-plugin), takže uživatelé mohou otevírat výkresy DWG/DXF přímo z cloudového úložiště. Oba používají **dvoukrokový tok Sign in → Open**, navržený tak, aby odolal blokování vyskakovacích oken.

### `@mlightcad/cad-onedrive-plugin`

**Datový zdroj OneDrive / SharePoint** postavený na Microsoft File Picker v8 + MSAL. Vyžaduje registraci aplikace v Azure (SPA, delegovaná oprávnění `User.Read` + `Files.Read.All`).

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Nastavení aplikace Azure a kompletní integrace:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) a [Plugin datového zdroje](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

**Datový zdroj Google Drive** se stejným kontraktem `AcApDataSource`.

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Nastavení Google Cloud a kompletní integrace:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## Které pluginy registruje každá aplikace?

| Aplikace | Registrované pluginy |
|-----|--------------------|
| `cad-simple-viewer` | Žádné — pouze jádro, pluginy jsou volitelné |
| `cad-simple-viewer-demo` | Exportní pluginy (HTML/PDF/SVG), `cad-simple-ui-plugin`, `cad-agent-plugin`, `cad-script-plugin` |
| `cad-viewer` (Vue) | Exportní pluginy (HTML/PDF/SVG); pluginy agenta a skriptů se registrují automaticky, **pokud jsou nainstalovány** (volitelné peer závislosti) |

---

## Související dokumentace

- [Systém pluginů](./plugin-system) — rozhraní `AcApPlugin`, správce pluginů, líné načítání a psaní vlastních pluginů
- [Plugin datového zdroje](./data-source-plugin) — mechanismus `AcApDataSource` používaný pluginy OneDrive / Google Drive
- [Příkaz](./command) — životní cyklus příkazu a `AcEdCommand`
