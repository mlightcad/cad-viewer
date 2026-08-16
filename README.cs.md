# CAD-Viewer (Čeština)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

cad-viewer je `první webový prohlížeč a editor DXF/DWG na světě, který běží zcela v prohlížeči a nevyžaduje žádné backendové služby`.
Tím, že parsování DWG/DXF, zpracování geometrie a vykreslování probíhá přímo v prohlížeči, cad-viewer umožňuje skutečné bezserverové prohlížení a úpravy CAD — ideální pro cloudové aplikace, offline použití a pracovní postupy citlivé na soukromí.

Nabízí také něco, co u jiných CAD prohlížečů jen zřídka najdete — **export jedním kliknutím do jediného samostatného souboru HTML**. Stažený soubor `.html` obsahuje snímek výkresu a lehké běhové prostředí prohlížeče, takže příjemci mohou v jakémkoli moderním prohlížeči otevírat, posouvat, přibližovat, přepínat vrstvy a měřit vzdálenosti **bez CAD aplikace, bez serveru a bez instalace**. Většina desktopových i webových CAD prohlížečů umožňuje prohlížení pouze ve vlastním produktu; cad-viewer promění živý výkres v přenosný offline artefakt, který můžete poslat e-mailem, archivovat nebo umístit na statický souborový hosting — ideální pro sdílení s klienty, archivy pro compliance a izolovaná prostředí bez připojení k síti. Offline prohlížeč také spotřebovává výrazně méně paměti než tradiční desktopové nástroje při otevírání stejného výkresu (viz [porovnání paměti](#spotřeba-paměti-samostatného-html) níže).

- [**🌐 Domovská stránka**](https://mlightcad.com/)
- **🌐 Živé demo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Dokumentace API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (verzovaná) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/docs/) (nejnovější/dev) · [MCP server](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Aplikace postavené na cad-viewer

Tým [Thingraph](https://cad.thingraph.site/) staví produkční prohlížeče DWG/DXF a integrace platforem na základě cad-viewer a obsluhuje desítky tisíc uživatelů po celém světě:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — webový prohlížeč DWG/DXF využívaný inženýrskými týmy po celém světě pro rychlý, bezserverový přístup k výkresům. Instalace pro vaši platformu:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — otevření DWG/DXF z Disku pomocí **Open with**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — vlastní editor pouze pro čtení souborů `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — stejné rozšíření přes Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — vložení náhledů DWG/DXF na stránky
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — náhled a miniatury v Průzkumníku souborů

Komunitní aplikace a integrace:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — produkční webový CAD prohlížeč pro DWG, DXF, DWF, DWFx a XPS ([živé demo](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — nativní aplikace Nextcloud pro prohlížení DWG/DXF v prohlížeči ([App Store](https://apps.nextcloud.com/apps/cad_viewer))

Komunitní desktopové balíčky pro Linux:

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — AppImage založená na Electronu pro Linux (~114 MB), testováno na Fedoře
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — zdrojový balíček pro Arch Linux využívající systémový Electron (~5,4 MB)
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — binární balíček pro Arch Linux se součástí fontů/šablon pro plně offline otevírání výkresů

![CAD-Viewer Quick Demo](./assets/cad-viewer.gif)

## Funkce

- **Vysoký výkon** — prohlížení rozsáhlých souborů DWG/DXF s plynulým vykreslováním 60+ FPS
- **Bez backendu** — soubory se parsují a zpracovávají zcela v prohlížeči
- **Vyšší bezpečnost dat** — soubory nikdy neopustí vaše zařízení, zajištění úplného soukromí
- **Snadná integrace** — není potřeba nastavení serveru ani backendové infrastruktury
- Modulární architektura pro bezproblémovou integraci třetích stran
- **Export do offline HTML** — export aktuálního výkresu jako jediného samostatného souboru `.html` s vloženým prohlížečem (posun/přiblížení, přizpůsobení zobrazení, vrstvy, měření vzdálenosti, UI EN/ZH). Otevírá se offline v jakémkoli prohlížeči; není vyžadována instance cad-viewer ani backend.
- Offline i online editační pracovní postupy
- 3D vykreslovací engine THREE.js s pokročilými optimalizačními technikami
- Navrženo pro rozšiřitelnost a integraci s platformami jako CMS, Notion a WeChat

## Začínáme

### Požadavky

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Instalace

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Vývoj

```bash
# Spustit plnohodnotný prohlížeč (cad-viewer)
pnpm dev

# Nebo spustit jednoduchý prohlížeč
pnpm dev:simple
```

### Sestavení

```bash
pnpm build
```

### Náhled

```bash
# Náhled plnohodnotného prohlížeče
pnpm preview

# Náhled jednoduchého prohlížeče
pnpm preview:simple
```

## Jak používat

### Ovládání v desktopovém prohlížeči
- **Výběr**: levé tlačítko myši na entitách
- **Přiblížení/oddálení**: kolečko myši nahoru/dolů
- **Posun**: podržte prostřední tlačítko myši a táhněte
- **Smazání**: vyberte entity a stiskněte klávesu `Del`

### Ovládání v prohlížeči na tabletu/mobilu
- **Výběr**: klepněte na entity
- **Přiblížení**: stažení dvěma prsty
- **Posun**: tažení jedním prstem

## Systém pluginů

CAD-Viewer je postaven kolem modulárního **systému pluginů** v [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer). Pluginy implementují rozhraní `AcApPlugin` a napojují se na životní cyklus prohlížeče přes `onLoad` / `onUnload` — typicky pro registraci příkazů, přidání UI nebo propojení exportních/importních pipeline.

Pluginy načítejte přes `AcApDocManager.instance.pluginManager` (`loadPlugin`, `registerLazyPlugin` nebo `plugins.fromConfig` při vytváření správce dokumentů). Exportně orientované pluginy podporují **lazy loading**: zaregistrujte malý stub předem a stáhněte těžký balíček až když uživatel spustí související příkaz (například `-chtml`, nebo při potvrzení exportu z dialogu `chtml` v `cad-viewer`).

Monorepo dodává několik oficiálních pluginů. Každý se zaměřuje na jednu oblast; kombinujte je podle potřeby. **Instalace, registrace a podrobnosti API jsou v README každého balíčku** — viz odkazy níže.

### Oficiální pluginy

| Package | Role | Příkazy / schopnosti |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | **Panel nástrojů, správce vrstev a paleta revizí** pro `cad-simple-viewer` (čisté DOM, bez Vue/React) | `layer`, `markuppanel`, výchozí panel nástrojů (zobrazení, měření, export, revize, motiv, jazyk) |
| [`@mlightcad/cad-agent-plugin`](packages/cad-agent-plugin) | **CAD agent v přirozeném jazyce** (AI chat panel + volání nástrojů pro výkres) | `agent` |
| [`@mlightcad/cad-html-plugin`](packages/cad-html-plugin) | Export výkresů do **samostatného offline HTML** | `chtml` (dialog v `cad-viewer`), `-chtml` (příkazová řádka) |
| [`@mlightcad/cad-pdf-plugin`](packages/cad-pdf-plugin) | **Export a import PDF** (vektorová pipeline) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](packages/cad-svg-plugin) | **Export SVG** a sdílený vektorový renderer (používá se také u exportu PDF) | `csvg` |

### `@mlightcad/cad-simple-ui-plugin` — UI vrstva pro jednoduchý prohlížeč

[`cad-simple-viewer`](packages/cad-simple-viewer) záměrně **nedodává aplikační UI** — pouze plátno a CAD jádro. Pokud vkládáte jednoduchý prohlížeč do vlastní webové aplikace a chcete hotovou UI vrstvu bez plné Vue [`cad-viewer`](packages/cad-viewer) shell aplikace, **`cad-simple-ui-plugin` je určená UI vrstva**.

Poskytuje:

- **Konfigurovatelný panel nástrojů** (umístění na libovolném okraji, výchozí CAD příkazy, vnořená menu, vlastní položky)
- **Dokovací panel** se záložkou **správce vrstev** (zapnutí/vypnutí vrstvy, výběr barvy ACI, přiblížení na vrstvu dvojklikem) a záložkou **palety revizí** (seznam značek, stav, komentáře)
- **Synchronizaci motivu** se sysvar `COLORTHEME` a CSS tokeny `--ml-ui-*` na hostitelském elementu
- **Synchronizaci jazyka** s `AcApI18n` (angličtina / čínština / čeština / turečtina)

Všechny widgety jsou nezávislé na frameworku (čisté DOM). Plná Vue aplikace [`cad-viewer`](packages/cad-viewer) má vlastní Element Plus UI a tento plugin nevyžaduje; použijte `cad-simple-ui-plugin`, když stavíte přímo na `cad-simple-viewer`.

→ **Rychlý start, přizpůsobení panelu nástrojů a možnosti:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI asistent pro výkresy

[`cad-agent-plugin`](packages/cad-agent-plugin) přidává **CAD agenta v přirozeném jazyce** do aplikací založených na `cad-simple-viewer`. Uživatelé popíší, co chtějí, běžnou řečí; agent volá CAD nástroje pro prohlížení výkresu a vytváření nebo úpravu geometrie.

Poskytuje:

- **Lazy-loaded** `AcApPlugin` (spouštěcí příkaz: `agent`), takže AI balíček není na kritické cestě
- **Vue chat panel** (`AgentChatPanel`) postavený na Vercel AI SDK (`Experimental_Agent` + `@ai-sdk/vue`)
- **Konfiguraci LLM v prohlížeči** — API klíče pro OpenAI, Anthropic nebo OpenAI-kompatibilní endpointy zůstávají v klientovi (šifrované v `localStorage`)
- **CAD nástroje fáze 1** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- **UI řetězce v angličtině / čínštině / turečtině / češtině** přes i18n vrstvu pluginu

Plná Vue aplikace [`cad-viewer`](packages/cad-viewer) registruje agenta automaticky, pokud je balíček nainstalován (záložka palety). [`cad-simple-viewer-example`](packages/cad-simple-viewer-example) ho propojuje do dock záložky přes `cad-simple-ui-plugin`. Hostitelské aplikace volají `registerLazyAgentPlugin` a `setAgentPaletteOpener` pro umístění panelu podle potřeby.

→ **Instalace, registrace a seznam nástrojů:** [packages/cad-agent-plugin/README.md](packages/cad-agent-plugin/README.md)

### Exportní pluginy (HTML / PDF / SVG)

Tyto pluginy přidávají exportní (a u PDF importní) příkazy do stejného správce pluginů. Jsou **lazy-loaded**, aby počáteční velikost stránky zůstala malá. Demo [`cad-simple-viewer-example`](packages/cad-simple-viewer-example) registruje všechny tři exportní pluginy, `cad-simple-ui-plugin` a `cad-agent-plugin`; plná aplikace [`cad-viewer`](packages/cad-viewer) registruje exportní pluginy a agent plugin (pokud je nainstalován) při bootstrapu.

- **HTML** — jednosouborový offline prohlížeč pro sdílení a archivaci: [packages/cad-html-plugin/README.md](packages/cad-html-plugin/README.md)  
  (Headless CLI používající stejnou pipeline: [packages/cad-simple-viewer-cli/README.md](packages/cad-simple-viewer-cli/README.md))
- **PDF** — vektorový export PDF a import PDF do CAD: [packages/cad-pdf-plugin/README.md](packages/cad-pdf-plugin/README.md)
- **SVG** — vektorový export SVG: [packages/cad-svg-plugin/README.md](packages/cad-svg-plugin/README.md)

#### Spotřeba paměti samostatného HTML

Při otevírání ukázkového výkresu [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) je spotřeba paměti zhruba:

| Prohlížeč | Spotřeba paměti |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| Samostatné HTML (režim měření) | 56 MB |
| Samostatné HTML (režim prohlížení) | 33 MB |

Offline HTML prohlížeč spotřebovává přibližně o **83 % méně paměti než AutoCAD 2020** a v režimu prohlížení o **77 % méně než GstarCAD Viewer**, přičemž stále podporuje posun/přiblížení, přepínání vrstev a měření vzdálenosti (režim měření).

## Výkon

CAD-Viewer je navržen pro **výjimečný výkon** a zvládne velmi rozsáhlé soubory DXF/DWG při zachování vysoké snímkové frekvence. Využívá několik pokročilých vykreslovacích technologií pro optimalizaci výkonu:

- **Vlastní shader materiály**: GPU-akcelerované shader materiály pro efektivní vykreslování složitých typů čar a vzorů výplně šrafování
- **Dávkování geometrie**: slučování bodů, čar a ploch se stejným materiálem pro výrazné snížení počtu draw callů
- **Instancované vykreslování**: optimalizace vykreslování opakující se geometrie pomocí instancing technik
- **Optimalizace buffer geometrie**: efektivní správa paměti a slučování geometrie pro snížení GPU režie
- **Cache materiálů**: opakované použití materiálů u podobných entit pro minimalizaci změn stavu
- **WebGL optimalizace**: využití moderních WebGL funkcí pro hardwarově akcelerované vykreslování

Tyto optimalizace umožňují CAD-Viewer plynule vykreslovat složité CAD výkresy s tisíci entitami při zachování responzivní interakce s uživatelem.

## Známé problémy

Výchozí open-source cesta pro DWG je založena na [LibreDWG](https://github.com/LibreDWG/libredwg). Funguje dobře pro mnoho výkresů, ale pokrytí entit je stále omezené, WASM balíček je mnohem větší, spuštění je pomalejší, spotřeba paměti je vysoká a velmi rozsáhlé soubory DWG mohou skončit chybou nedostatku paměti. Také zavádí licenční aspekty GPL pro komerční produkty s uzavřeným zdrojovým kódem.

Pokud potřebujete lepší kompatibilitu, nižší spotřebu paměti, podporu velkých souborů nebo čistší komerční licenční model, podívejte se na náš [**vlastní parser DWG**](./PROPRIETARY-PARSER.md).

| Položka | Parser založený na LibreDWG | Vlastní parser DWG |
|------|------------------------|------------------------|
| Podporované entity | Omezené pokrytí | Širší pokrytí |
| Velikost balíčku | ~13 MB | ~437 KB |
| Rychlost načítání | Pomalejší spuštění | Výrazně rychlejší spuštění |
| Spotřeba paměti | Vyšší | Nižší |
| Velké soubory DWG | U velkých souborů může dojít k OOM | Žádný takový problém |
| Licence | Riziko šíření GPL | Bez rizika šíření GPL |

## Plán vývoje

Cílem tohoto projektu je vytvořit plnohodnotný **2D systém podobný AutoCADu v prohlížeči** (prohlížeč + editor) s modulární architekturou a integrací nezávislou na frameworku.

Legenda:
- [x] Dokončeno
- [ ] Plánováno
- [ ] ⏳ Probíhá

### Jádro souborů a datové vrstvy

#### Podpora souborů

* [x] Načítání DXF
* [x] Načítání DWG
* [x] Export do samostatného offline HTML (vložený prohlížeč)
* [x] Streamování / přírůstkové načítání velkých souborů
* [ ] ⏳ Kompatibilita verzí souborů (R12–Latest)

#### Datový model

* [x] Jednotný datový model entit
* [x] Podpora tabulky vrstev
* [x] Struktura bloků / vložení
* [ ] ⏳ Správa handle a object ID: v současnosti je objectId stejný jako handle a reprezentován jako jeden řetězec místo bigint (int64).
* [ ] ⏳ Podpora XData / rozšiřujícího slovníku
* [ ] Zpracování proxy entit

### Vykreslování a výkon

#### Vykreslovací engine

* [x] Vykreslování založené na WebGL (Three.js)
* [x] Pipeline optimalizovaná pouze pro 2D
* [x] Organizace scény podle vrstev
* [x] Vykreslování layoutu / papírového prostoru
* [ ] Podpora entit viewportu

#### Optimalizace výkonu

* [x] Slučování a dávkování geometrie
* [x] Prostorové indexování (základní)
* [x] Pokročilý prostorový index (R-tree / BVH)
* [ ] Vykreslování s úrovní detailu (LOD)
* [ ] Více pláten / dlaždicové vykreslování pro velmi rozsáhlé výkresy

### Prohlížení a navigace

#### Ovládání zobrazení

* [x] Posun
* [x] Přiblížení (kolečko / rámečkové přiblížení)
* [x] Přizpůsobení zobrazení / rozsah
* [ ] Pojmenovaná zobrazení
* [ ] Historie zobrazení (zpět / vpřed u změn zobrazení)

#### Ovládání zobrazení obsahu

* [x] Viditelnost vrstev zap/vyp
* [x] Zmrazení / uzamčení vrstev
* [x] Zobrazení tloušťky čar
* [ ] Měřítko typů čar
* [x] Přepínání pozadí / motivu

### Výběr a interakce

#### Výběr

* [x] Výběr jedné entity
* [x] Zvýraznění vybraných entit
* [x] Výběr oknem
* [x] Křížový výběr
* [x] Filtry výběru (podle typu / vrstvy)
* [x] Cyklický výběr

#### Přichycení (OSNAP)

* [x] Koncový bod
* [x] Střed
* [x] Střed kružnice
* [ ] Průsečík
* [ ] Kolmice / tečna
* [x] Nejbližší
* [ ] Sledování přichycení


### Úpravy a modifikace

#### Základní úpravy

* [x] Rámec pro úpravu entit
* [x] Posun
* [x] Kopírování
* [x] Otočení
* [ ] Měřítko
* [x] Smazání
* [x] Zpět / vpřed

#### Úpravy geometrie

* [x] Úchopové body
* [ ] Protažení
* [ ] Oříznutí
* [ ] Prodloužení
* [x] Odsazení
* [ ] Rozložení
* [ ] Spojení / zaoblení / zkosení (2D)

### Kreslení a nástroje pro tvorbu

#### Základní entity

* [x] Čára
* [x] Polyline
* [x] Spline
* [x] Kružnice
* [x] Oblouk
* [x] Elipsa
* [x] Obdélník / polygon

#### Pokročilé entity

* [x] Šrafování
* [ ] Text (jednořádkový / víceřádkový)
* [ ] Kóty (lineární, zarovnané, úhlové)
* [ ] Vytváření a vkládání bloků

### Měření

* [x] Vzdálenost
* [x] Délka oblouku
* [x] Plocha
* [x] Úhel
* [ ] Souřadnice
* [ ] Statistiky entit (délka, plocha, počet)

### Kóty

* [x] Lineární kóta
* [ ] Úhlová kóta
* [ ] Souřadnice

### Vlastnosti a UI panely

#### Paleta vlastností

* [x] Vlastnosti vybrané entity
* [ ] Úprava vrstvy, barvy, typu čáry
* [x] Živá aktualizace při změně

#### Panely a UI

* [x] Správce vrstev
* [ ] Správce bloků
* [x] Historie příkazů / konzole
* [x] Stavový řádek (přichycení, orto, mřížka)

#### Systém příkazů

* [x] Registr příkazů
* [x] Aliasy příkazů
* [x] Výzvy příkazů (ve stylu AutoCADu)

### Integrace a rozšiřitelnost

#### Integrace frameworků

* [x] Jádro nezávislé na frameworku
* [ ] Příklad integrace React
* [x] Příklad integrace Vue
* [ ] Integrace OpenLayers / Map
* [ ] Vkládání do CMS / Notion

#### Systém pluginů

* [x] Plugin API
* [ ] Podpora vlastních entit
* [x] Vlastní příkaz

### Offline a online úpravy

#### Offline editor

* [x] Lokální úpravy v prohlížeči
* [x] Uložení do DXF
* [ ] Uložení sady změn / diff
* [ ] Perzistence IndexedDB

#### Online editor

* [ ] Návrh backend API
* [ ] Autentizace uživatelů
* [ ] Verzování souborů
* [ ] Řízení přístupu pro více uživatelů
* [ ] Real-time spolupráce (budoucnost)

### Cílové platformy

* [ ] ⏳ Integrace Google Drive
* [ ] Prohlížeč pro WeChat Mini Program
* [ ] Podpora mobilního prohlížeče (pouze pro čtení)

### Dokumentace a komunita

* [x] Dokumentace architektury
* [x] Referenční dokumentace API
* [ ] Průvodce pro přispěvatele
* [x] Ukázkové projekty
* [x] Údržba plánu vývoje a changelogu

Tento plán vývoje je záměrně podrobný, aby přispěvatelé jasně viděli, **co existuje**, **co chybí** a **kde je potřeba pomoc**.

## Přispívání

Příspěvky jsou vítány! Otevírejte issue nebo pull requesty pro opravy chyb, nové funkce nebo návrhy. U hlášení chyb pomůže poskytnutí odkazu na problematický výkres při reprodukci a opravě problému.

## Licence

Monorepo cad-viewer je primárně licencováno pod [MIT](LICENSE).

Načítání DXF používá vestavěný MIT parser v `@mlightcad/data-model`. **Výchozí cesta pro načítání DWG** v `@mlightcad/cad-simple-viewer` závisí na balíčcích GPL-3.0 (`libredwg-web` / `@mlightcad/libredwg-converter`). Pokud dodáváte produkt s uzavřeným zdrojovým kódem a nemůžete zákazníkům distribuovat GPL kód, použijte místo toho [**vlastní parser DWG**](./PROPRIETARY-PARSER.md) — nahradí tento konvertor a zbytek stacku zůstane pouze pod MIT.

→ **Komerční parser:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (rozsah, licencování, ceny, integrace, soulad s GPL, podpora)
