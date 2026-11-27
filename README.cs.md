# MLightCAD (Čeština)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD je `první webová platforma pro prohlížení, porovnávání a úpravy DXF/DWG na světě, která běží zcela v prohlížeči a nevyžaduje žádné backendové služby`.
Tím, že parsování DWG/DXF, zpracování geometrie a vykreslování probíhá přímo v prohlížeči, MLightCAD umožňuje skutečné bezserverové prohlížení a úpravy CAD — ideální pro cloudové aplikace, offline použití a pracovní postupy citlivé na soukromí.

MLightCAD není jen CAD prohlížeč, ale **CAD infrastruktura běžící nativně v prohlížeči**. Na jednom jádru nabízí tři produkty připravené k použití:

| Podprojekt | Zaměření | Balíček |
| --- | --- | --- |
| **CAD Viewer** | Prohlížení a revize: otevření DWG/DXF, posun, zoom, měření a poznámky; lze použít i jako SDK ve vlastním produktu | [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer) |
| **CAD Diff Viewer** | Porovnání revizí výkresů: vedle sebe nebo překrytím — šedá beze změny, červená odstraněno, zelená přidáno; revizní obláčky z množin změn | [`@mlightcad/cad-diff-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-diff-viewer) |
| **CAD Editor** | Úpravy a kreslení: nabídky, ribbon, příkazový řádek a stavový řádek ve stylu AutoCADu; otevřete výkres a upravujte geometrii přímo | [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) |

Všechny tři sdílejí stejný model entit, vykreslovací engine a sběrnici pluginů. UI, export a funkce AI se načítají podle potřeby, místo aby se implementovaly znovu — prohlížení, porovnávání a úpravy jsou různé formy jednoho CAD jádra, nikoli nesouvisející nástroje.

Navíc MLightCAD nabízí něco, co u jiného CAD softwaru jen zřídka najdete — **export jedním kliknutím do jediného samostatného souboru HTML**. Stažený soubor `.html` obsahuje snímek výkresu a lehké běhové prostředí prohlížeče, takže příjemci mohou v jakémkoli moderním prohlížeči otevírat, posouvat, přibližovat, přepínat vrstvy a měřit vzdálenosti **bez CAD aplikace, bez serveru a bez instalace**. Většina desktopových i webových CAD nástrojů umožňuje prohlížení pouze ve vlastním produktu; MLightCAD promění živý výkres v přenosný offline artefakt, který můžete poslat e-mailem, archivovat nebo umístit na statický souborový hosting — ideální pro sdílení s klienty, archivy pro compliance a izolovaná prostředí bez připojení k síti. Offline prohlížeč také spotřebovává výrazně méně paměti než tradiční desktopové nástroje při otevírání stejného výkresu (viz [porovnání paměti](#spotřeba-paměti-samostatného-html) níže).

MLightCAD navíc podporuje **předrenderování na straně serveru**. Výkres se jednou zpracuje na serveru a klient pouze zobrazí předrenderovaný výsledek, aniž by znovu parsoval DWG/DXF nebo znovu sestavoval geometrii. Výrazně to snižuje spotřebu paměti na klientu a opakované otevření stejného výkresu je mnohem rychlejší — ideální pro prohlížení výkresů na mobilních zařízeních.

- [**🌐 Domovská stránka**](https://mlightcad.com/)
- **🌐 Živé demo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Dokumentace API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (verzovaná) · [MCP server](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Aplikace postavené na MLightCAD

Tým [Thingraph](https://cad.thingraph.site/) staví produkční prohlížeče DWG/DXF a integrace platforem na základě MLightCAD a obsluhuje desítky tisíc uživatelů po celém světě:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — webový prohlížeč DWG/DXF využívaný inženýrskými týmy po celém světě pro rychlý, bezserverový přístup k výkresům. Instalace pro vaši platformu:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — otevření DWG/DXF z Disku pomocí **Open with**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — vlastní editor pouze pro čtení souborů `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — stejné rozšíření přes Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — vložení náhledů DWG/DXF na stránky
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — náhled a miniatury v Průzkumníku souborů

Komunitní aplikace a integrace:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — produkční webový CAD prohlížeč pro DWG, DXF, DWF, DWFx a XPS ([živé demo](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — nativní aplikace Nextcloud pro prohlížení DWG/DXF v prohlížeči ([App Store](https://apps.nextcloud.com/apps/cad_viewer))

Oficiální desktopová aplikace:

- [MLightCAD Studio](https://github.com/mlightcad/mlightcad-studio) — oficiální desktopová edice MLightCAD, která zabaluje [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) do shellu [Tauri 2](https://v2.tauri.app/) a funguje zcela offline; k dispozici jsou instalátory pro Windows (NSIS / MSI), Linux (AppImage / deb) a macOS (Universal DMG, Apple Silicon + Intel) — [stáhnout](https://github.com/mlightcad/mlightcad-studio/releases/).

### Demo aplikace (Demo Apps)

Oficiální ukázkové aplikace, které ukazují, jak integrovat MLightCAD do vlastního produktu:

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — Minimální vanilla TypeScript host pro [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer): otevření lokálních nebo CDN DXF/DWG, ovládání příkazů malým toolbarem a líné načítání pluginů pro export HTML/PDF/SVG bez plného Vue UI.
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — Plnohodnotná Vue 3 aplikace na [`@mlightcad/cad-editor`](https://www.npmjs.com/package/@mlightcad/cad-editor) s nabídkami, ribbonem, dialogy, příkazovým řádkem a stavovým řádkem ([živé demo](https://mlightcad.github.io/cad-viewer-example/)).
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Next.js demo „CAD disk“: obnovitelné chunkované nahrávání DWG/DXF, seznam souborů v SQLite s náhledy a otevření výkresů buď **živým parsováním v prohlížeči** (`cad-simple-viewer`), nebo **serverovým ACEX prerenderem** (rychlejší otevření, méně paměti).

![MLightCAD Quick Demo](./assets/cad-viewer.gif)

## Funkce

- **Vysoký výkon** — prohlížení rozsáhlých souborů DWG/DXF s plynulým vykreslováním 60+ FPS
- **Bez backendu** — soubory se parsují a zpracovávají zcela v prohlížeči
- **Vyšší bezpečnost dat** — soubory nikdy neopustí vaše zařízení, zajištění úplného soukromí
- **Snadná integrace** — není potřeba nastavení serveru ani backendové infrastruktury
- Modulární architektura pro bezproblémovou integraci třetích stran
- **Systém pluginů** — Rozšiřitelná architektura pluginů s oficiálními pluginy pro UI, AI asistenta a export do HTML/PDF/SVG; viz [průvodce systémem pluginů](https://mlightcad.com/cad-viewer/docs/cs/development/plugin-system.html)
- **Mobilní rozložení a dotykové ovládání** — responzivní UI pro telefon/tablet a dotyková gesta (štípnutí pro zoom, posun jedním prstem, klepnutí pro výběr) vestavěná v `@mlightcad/cad-simple-viewer`, bez nutnosti samostatné mobilní aplikace
- **Export do offline HTML** — export aktuálního výkresu jako jediného samostatného souboru `.html` s vloženým prohlížečem (posun/přiblížení, přizpůsobení zobrazení, vrstvy, měření vzdálenosti, UI EN/ZH). Otevírá se offline v jakémkoli prohlížeči; není vyžadována instance MLightCAD ani backend.
- Offline i online editační pracovní postupy
- 3D vykreslovací engine THREE.js s pokročilými optimalizačními technikami
- Navrženo pro rozšiřitelnost a integraci s platformami jako CMS, Notion a WeChat

- **Jasná vrstvená architektura** — model → vykreslování → pohled → UI / pluginy, kde nižší balíčky nikdy nezávisí na vyšších, plus samostatně nasaditelné headless exportéry a CLI; viz [přehled architektury](https://mlightcad.com/cad-viewer/docs/cs/development/architecture-overview.html)

## Možnosti AI

MLightCAD přichází s vestavěnou sadou CAD schopností zaměřených na AI. Skripty a volání nástrojů se provádějí lokálně, takže data výkresu nikdy neopustí váš počítač.

### CAD skripty
- Vestavěné izolované (sandbox) běhové prostředí JavaScript skriptů, které přes jednotné hostitelské API `cad.*` dotazuje entity, kreslí, upravuje, měří a exportuje
- Jeden skript může za jedno volání provést filtrování, měření, úpravy a samokontrolu, čímž se vyhnete častému přepínání nástrojů a spotřebě tokenů
- Před spuštěním probíhá AST validace: `import`, `eval`, přístup k síti a ke stránce jsou blokovány, s rozpočtem kroků/času a limitem počtu snapshotů
- Konzole skriptů umožňuje psát a spouštět skripty přímo bez účasti jakéhokoli modelu; skripty mohou exportovat do DXF / PDF / HTML a dalších formátů

### AI agent
- Panel konverzace v přirozeném jazyce: popište, co potřebujete, a model napíše a spustí skripty `cad.*` pro kreslení, dotazy a úpravy
- Založeno na Vercel AI SDK; modely a API klíče se konfigurují v jednotném nastavení AI modelů
- Dva režimy uvažování — Simple a High; v režimu High agent po složitých úkolech pořídí screenshot a provede vizuální kontrolu

### MCP
- Stejný katalog skriptových nástrojů vystavuje jako stdio MCP server přes `@mlightcad/cad-mcp-server` pro externí AI klienty (např. Claude Desktop, Cursor)
- Externí asistenti mohou otevírat výkresy, dotazovat entity, spouštět skripty a ukládat výsledky se stejnými schopnostmi jako vestavěný agent

### Chytré bloky
- Automaticky najde všechny identické kopie vybraných objektů a převede je na reference bloku
- Najde opakující se objekty v celém výkresu a dávkově je převede na bloky
- Kopie, které se liší pouze textem (např. čísla místností), mohou být automaticky převedeny na atributy bloku, s konfigurovatelným prahem minimálního přínosu

### Obnova výkresů z PDF
- Importuje vektorovou geometrii ze stránek PDF a rekonstruuje skutečné CAD entity — kružnice/oblouky/elipsy/splajny, polylinie s boulí (bulge), tloušťky čar a přerušované typy čar, textové styly, plnohodnotná a šrafovací výplně a obrázky; opakovaně kreslené Form XObject se automaticky obnovují jako reference bloku
- Kalibruje měřítko importovaného výkresu pomocí známé vzdálenosti
- Rozpozná text rozložený na čáry zpět do CAD textových entit: nejprve vestavěný slovník glyfů provede lokální rozpoznání, zbytek se hromadně rozpozná přes OCR / model vidění
- Obnoví lineární, poloměrové, průměrové a úhlové rozměry ze šipek, rozměrových čar a textu, s panelem kontroly pro potvrzení hodnot a výběr nebo vytvoření stylu rozměru

## Vložení DWG/DXF jedním řádkem kódu

Přidejte prohlížení DWG/DXF na libovolný web jediným `<iframe>` — bez CAD backendu a bez nahrávání výkresů do cizího cloudu. Soubor se načte z **vaší** URL a kompletně zpracuje v prohlížeči návštěvníka; nástroje pro review (posun, zoom, měření, anotace) jsou ihned k dispozici.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

Podrobný návod a živé demo: [Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4).

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

# Nebo spustit prohlížeč porovnání výkresů (cad-diff-viewer)
pnpm dev:diff
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

Jste v MLightCAD noví? **[Uživatelská příručka](https://mlightcad.com/cad-viewer/docs/)** nabízí podrobné návody k rozhraní prohlížeče, ovládání na počítači i dotykových zařízeních a k nástrojům pro poznámky a měření.

### Ovládání v desktopovém prohlížeči
- **Výběr**: levé tlačítko myši na entitách
- **Přiblížení/oddálení**: kolečko myši nahoru/dolů
- **Posun**: podržte prostřední tlačítko myši a táhněte
- **Smazání**: vyberte entity a stiskněte klávesu `Del`

### Ovládání v prohlížeči na tabletu/mobilu
- **Výběr**: klepněte na entity
- **Přiblížení**: stažení dvěma prsty
- **Posun**: tažení jedním prstem

## Výkon

MLightCAD je navržen pro **výjimečný výkon** a zvládne velmi rozsáhlé soubory DXF/DWG při zachování vysoké snímkové frekvence. Využívá několik pokročilých vykreslovacích technologií pro optimalizaci výkonu:

- **Vlastní shader materiály**: GPU-akcelerované shader materiály pro efektivní vykreslování složitých typů čar a vzorů výplně šrafování
- **Dávkování geometrie**: slučování bodů, čar a ploch se stejným materiálem pro výrazné snížení počtu draw callů
- **Instancované vykreslování**: optimalizace vykreslování opakující se geometrie pomocí instancing technik
- **Optimalizace buffer geometrie**: efektivní správa paměti a slučování geometrie pro snížení GPU režie
- **Cache materiálů**: opakované použití materiálů u podobných entit pro minimalizaci změn stavu
- **WebGL optimalizace**: využití moderních WebGL funkcí pro hardwarově akcelerované vykreslování

Tyto optimalizace umožňují MLightCAD plynule vykreslovat složité CAD výkresy s tisíci entitami při zachování responzivní interakce s uživatelem.

#### Spotřeba paměti samostatného HTML

Při otevírání ukázkového výkresu [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg) je spotřeba paměti zhruba:

| Prohlížeč | Spotřeba paměti |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| Samostatné HTML (režim měření) | 56 MB |
| Samostatné HTML (režim prohlížení) | 33 MB |

Offline HTML prohlížeč spotřebovává přibližně o **83 % méně paměti než AutoCAD 2020** a v režimu prohlížení o **77 % méně než GstarCAD Viewer**, přičemž stále podporuje posun/přiblížení, přepínání vrstev a měření vzdálenosti (režim měření).

## Známé problémy

Výchozí open-source cesta pro DWG je založena na [LibreDWG](https://github.com/LibreDWG/libredwg) prostřednictvím volitelného balíčku `@mlightcad/libredwg-converter`. Funguje dobře pro mnoho výkresů, ale pokrytí entit je stále omezené, WASM balíček je mnohem větší, spuštění je pomalejší, spotřeba paměti je vysoká a velmi rozsáhlé soubory DWG mohou skončit chybou nedostatku paměti. Také zavádí licenční aspekty GPL pro komerční produkty s uzavřeným zdrojovým kódem. `@mlightcad/cad-simple-viewer` na tomto konvertoru **nezávisí** a ve výchozím stavu jej neregistruje — hostitelské aplikace (viz ukázkové balíčky) se připojují explicitně.

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

Cílem MLightCAD je plnohodnotný, modulární a na frameworku nezávislý 2D CAD systém v prohlížeči — prohlížení, porovnávání a úpravy nad jedním jádrem.

Plán vývoje je veden ve Wiki. Zahrnuje platformní práci, která ještě probíhá (LOD vykreslování, pojmenované pohledy, vlastní entity atd.), i směry AI, na které se zaměřujeme (porozumění výkresům, automatizované revize, rozpoznávání naskenovaných výkresů, ověřitelné úpravy přirozeným jazykem atd.):

→ **[Plán vývoje (Wiki)](https://github.com/mlightcad/cad-viewer/wiki/Roadmap)**

## Přispívání

Příspěvky jsou vítány! Otevírejte issue nebo pull requesty pro opravy chyb, nové funkce nebo návrhy. U hlášení chyb pomůže poskytnutí odkazu na problematický výkres při reprodukci a opravě problému.

## Licence

Monorepo MLightCAD je primárně licencováno pod [MIT](LICENSE).

Načítání DXF používá vestavěný MIT parser v `@mlightcad/data-model`. Načítání DWG je **opt-in**: `@mlightcad/cad-simple-viewer` nezávisí na GPL balíčcích LibreDWG. Hostitelé, kteří chtějí open-source podporu DWG, si sami přidají `@mlightcad/libredwg-converter` (GPL-3.0), nasadí jeho worker + wasm a zaregistrují konvertor. Pokud dodáváte produkt s uzavřeným zdrojovým kódem a nemůžete zákazníkům distribuovat GPL kód, použijte místo toho [**vlastní parser DWG**](./PROPRIETARY-PARSER.md).

→ **Komerční parser:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (rozsah, licencování, ceny, integrace, soulad s GPL, podpora)
