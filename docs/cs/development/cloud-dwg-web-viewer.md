---
title: "Vytvoření cloudového webového prohlížeče DWG"
---

# Vytvoření cloudového webového prohlížeče DWG pomocí `cad-html-plugin`: předrenderování + statické hostování

Tento článek představuje, jak využít schopnost exportu **vícesouborového balíčku ACEX** z `@mlightcad/cad-html-plugin` k převodu výkresů DWG/DXF na přímo hostovatelné statické zdroje na straně serveru (nebo během procesu sestavení). Uživatelé pak mohou otevřít webovou stránku a prohlížet výkres, aniž by museli v prohlížeči parsovat výkres nebo triangulovat geometrii.

Podrobnosti o samotném formátu (pole manifestu, binární kódování ACEC/ACEO atd.) najdete v [acex-package-format.md](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-html-plugin/docs/acex-package-format.md). Tento článek se zaměřuje pouze na **jak vytvořit cloudový prohlížeč výkresů pomocí tohoto formátu**.

---

## 1. Pozadí: dvě architektury webového prohlížeče výkresů

**Architektura A: Parsování v reálném čase v prohlížeči (výchozí způsob, jakým `cad-viewer` otevírá soubory DWG/DXF)**

```text
DWG/DXF file → Browser download → Parse entities (AcDb*) → Tessellate/triangulate into rendering data → Render with WebGL
```

Veškerá cena za parsování a převod „entity → data pro vykreslování“ vzniká na **zařízení uživatele**: velké výkresy mají pomalé počáteční vykreslení, zařízení s nízkým výkonem se mohou zpomalit a tlak na paměť může být značný.

**Architektura B: Předrenderování + statické hostování (mainstreamový přístup cloudových prohlížečů výkresů, jako jsou Haochen Viewer Web a Autodesk Web Viewer)**

```text
Conversion stage (one-time): DWG/DXF → Parse + tessellate → Display data (line/mesh batches) + offline viewer → Static files
Access stage (every time):   Browser only needs to fetch → gunzip → render directly
```

**Multi balíček** exportovaný z `cad-html-plugin` je produktem architektury B: soubor `.zip`, který se po rozbalení stane čistým statickým adresářem. Může být hostován jakýmkoli webovým serverem (nginx, objektové úložiště, CDN) a **nevyžaduje žádné backendové běhové prostředí**.

### Kdy zvolit architekturu B

* Výkresy se používají především pro **publikování / sdílení / archivní prohlížení**, přičemž mnoho uživatelů opakovaně prohlíží stejný výkres (vysoká míra zásahů cache CDN);
* Chcete rychlé počáteční vykreslení a dobrý zážitek na mobilu, aniž by zařízení uživatelů musela provádět parsování a triangulaci;
* Nechcete distribuovat původní DWG/DXF prohlížejícím (balíček obsahuje pouze **data na úrovni zobrazení**, bez editovatelných záznamů entit, což poskytuje určitou ochranu aktiv výkresu);
* Chcete, aby náklady na straně serveru byly blízko nule (čistě statický provoz).

### Náklady a předpoklady

* **Síť musí být dostatečně rychlá.** Předrenderovaná data jsou zploštěná geometrie pro zobrazení a mohou být větší než původní DWG/DXF (i když po kompresi gzip jsou obvykle velmi malá: nekomprimovaný blok o velikosti přibližně 2 MiB je po gzip obvykle menší než 200 KiB). Pokud jsou síťové náklady na stažení těchto dat již větší než náklady na lokální parsování + triangulaci, tento přístup nemá výhodu. Pro prostředí se slabou sítí nebo scénáře, kdy je malý výkres prohlížen jen jednou, může být vhodnější přímo doručit jednostránkové HTML nebo výkres parsovat online.
* **Po aktualizaci výkresů je nutné je znovu exportovat a publikovat.** Tento přístup je vhodný pro scénáře „po publikaci pouze pro čtení“, nikoli pro online kolaborativní úpravy.
* Ochrana heslem a expirací je aktuálně dostupná pouze pro export **jednosouborového HTML**. Řízení přístupu pro multi balíčky je nutné řešit na hostující vrstvě (podepsané URL, autentizované reverzní proxy atd.).

> **Jak vybrat mezi jednosouborovým a vícesouborovým exportem?**
>
> Poslat přímo někomu nebo otevřít offline dvojklikem → použijte `single` (samostatný `.html`).
>
> Hostovat na webovém serveru/CDN pro přístup mnoha uživatelů → použijte `multi` (přístup popsaný v tomto článku): geometrie je rozdělena do malých chunků a **postupně načítána**. Pro počáteční zobrazení je nutné stáhnout pouze prvních několik chunků aktuálního rozvržení; ostatní rozvržení a data objektového snappingu se načítají líně na vyžádání.

---

## Online ukázka

Pokud si chcete tento přístup **předrenderování + statického hostování** k webovému prohlížení DWG vyzkoušet prakticky, můžete přímo otevřít níže uvedenou online ukázku:

👉 [**Vyzkoušet webový prohlížeč DWG online**](https://mlightcad.com/cad-viewer/self-contained-html/canteen-progressive/viewer.html)

Tato ukázka používá přístup předrenderování popsaný v tomto článku. Výkres DWG byl před publikováním již parsován a jeho geometrie triangulována. Když uživatelé otevřou webovou stránku, není nutné znovu parsovat původní soubor DWG; prohlížeč přímo načte předem vygenerovaná data pro zobrazení.

Protože jsou zdroje výkresu cachovány prohlížečem, **při prvním otevření stránky může být nutné počkat na stažení zdrojů; po vytvoření cache bude opětovné otevření stejné stránky velmi rychlé**. To je jeden z důvodů, proč je přístup **předrenderování + statické hostování** obzvláště vhodný pro publikování, sdílení a opakované prohlížení výkresů.

Nejprve si můžete vyzkoušet ukázku a poté pokračovat ve čtení architektury a implementačních detailů níže.

---

## 2. Výstup: statický adresář připravený k použití po rozbalení

Multi export vytváří soubor `.zip`, ale **zip slouží pouze k distribuci**. Prohlížeč soubor v prohlížeči nerozbaluje. Místo toho postupně načítá manifest a jednotlivé soubory chunků. **Balíček je nutné před hostováním rozbalit:**

```text
my-drawing/
  viewer.html                 # Entry page (HTML/CSS/JS shell + inlined offline viewer runtime)
  my_drawing.acex.json        # Package manifest (small amount of metadata + index)
  chunks/
    L0-000.acex.gz            # Gzip-compressed geometry chunk (ACEC binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # Gzip-compressed object-snap data (only available in measure mode)
    L1-000.acex.gz            # Chunks for other layouts, lazy-loaded when switching layouts
    ...
```

Pořadí načítání poté, co uživatel přistoupí na `viewer.html`:

1. Přečte konfiguraci `#mlcad-package` vloženou na stránce a získá URL manifestu (výchozí: `./{name}.acex.json`);
2. Stáhne manifest (malý JSON) a inicializuje hladinu, rozvržení, rozsahy a další komponenty uživatelského rozhraní;
3. Stáhne chunky geometrie **aktuálního rozvržení** jeden po druhém → gunzip → dekódování → vykreslení, přičemž každý chunk zobrazí, jakmile je připraven;
4. Poté, co lze výkres již posouvat a přibližovat, stáhne data objektového snappingu `*.osnap.gz` (používaná pro měření/objektové snapping);
5. Ostatní rozvržení se načtou pouze tehdy, když na ně uživatel přepne.

Běhové prostředí prohlížeče je již vloženo v `viewer.html`, takže adresář **neobsahuje žádné další závislosti JavaScriptu**. Mezi funkce patří: výběr / posun / přiblížení (rozsahy, okno, původní zobrazení), panel hladin, přepínání rozvržení, měření, značky (značky Design Review), objektový snapping a vestavěné vícejazyčné rozhraní v čínštině / angličtině / češtině / turečtině.

---

## 3. Tři způsoby, jak vytvořit multi balíček

### Metoda 1: Ruční export z webové aplikace cad-viewer (vhodné pro občasné exporty)

* Otevřete výkres v [cad-viewer](https://mlightcad.com/cad-viewer/), spusťte příkaz `chtml` pro otevření dialogu exportu a jako formát exportu vyberte **„Multi-file Package (ZIP)“**;
* Nebo spusťte `-chtml` z příkazového řádku a odpovězte na výzvy, přičemž jako formát vyberte **Multi**:

```text
-chtml
Export format [Single/Multi] <Single>: Multi
...
```

Prohlížeč stáhne soubor `.zip`.

### Metoda 2: Dávková konverze na serveru / CI (doporučeno pro cloudové architektury)

Headless CLI balíček [`@mlightcad/cad-simple-viewer-cli`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer-cli) používá Playwright ke spuštění kompletní pipeline parsování + triangulace + export v headless Chromiu. Je ideální pro integraci do konverzní služby nebo CI pipeline.

Instalace (vyžaduje Node.js 20+):

```bash
npm install -D @mlightcad/cad-simple-viewer-cli
npx playwright install chromium
```

Export vyžaduje skript `.scr`, který odpovídá na výzvy `-chtml` řádek po řádku (`Single/Multi`, `Yes/No`, `Black/White/Space`, `Extents/Current`, `Measure/View`). CLI balíček obsahuje připravený `examples/export-html-multi.scr` (po instalaci npm se nachází v `node_modules/@mlightcad/cad-simple-viewer-cli/examples/`; v repozitáři je umístěn v [`packages/cad-simple-viewer-cli/examples/`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer-cli/examples/export-html-multi.scr)):

```text
; Export a multi-file ACEX package (zip)
; Prompt order: export format / hidden layers / layouts / background /
; initial view / viewer mode / chunk size MiB / compress chunks
-chtml
Multi
Yes
Yes
Black
Extents
Measure
2
Yes
quit
```

Export jednoho výkresu:

```bash
cad-simple-viewer-cli -i ./drawings/floor-plan.dwg \
  -s node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr \
  -o ./out
# Output: ./out/floor-plan.zip
```

Kompletní automatizační řešení pro dávkovou konverzi adresářů, rozbalení zipu a publikování najdete v části 6.

Můžete jej také integrovat do vlastní konverzní služby pomocí programového API:

```js
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

const { outputDir, savedFiles } = await runHeadless({
  inputPath: './drawings/floor-plan.dwg', // HTTP(S) URLs are also supported
  scriptPath: 'node_modules/@mlightcad/cad-simple-viewer-cli/examples/export-html-multi.scr',
  outputDir: './out',
  mode: 'read'
})

console.log(savedFiles) // [ 'floor-plan.zip', ... ]
```

### Metoda 3: Programový export ve vlastní webové aplikaci

Pokud vaše aplikace již vkládá `cad-simple-viewer` (uživatelé prohlížejí výkresy přímo ve vaší webové aplikaci), můžete také zavolat konverzní API přímo a udělat z „exportu hostovacího balíčku“ tlačítko ve vašem produktu:

```typescript
import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'

// Export a multi package for the currently opened drawing (triggers a .zip download in the browser)
await new AcApHtmlConvertor({ viewerRuntimeUrl: './viewer-runtime.iife.js' })
  .convert('floor-plan.dwg', {
    exportFormat: 'multi',   // Multi-file package; default is 'single'
    viewerMode: 'measure',   // 'measure' (includes measurement/markup/snapping) or 'view' (view-only, smaller)
    exportLayouts: true,     // Whether to include paper space layouts
    exportInvisibleLayers: true, // Whether to include off/frozen layers
    initialView: 'fit'       // 'fit' (extents) or 'current' (current view)
  })
```

API nižší úrovně (balíček sestavíte sami a rozhodnete, zda jej zapsat na disk, nebo nahrát):

```typescript
import {
  buildAcExPackage,
  zipAcExPackageFiles,
  unzipAcExPackageFiles
} from '@mlightcad/cad-html-plugin'

// snapshot is built from the Three.js scene by AcApHtmlSnapshotBuilder
const pkg = buildAcExPackage(snapshot, {
  viewerRuntime,          // Text of viewer-runtime.iife.js
  baseName: 'floor-plan'
})

const zipBytes = zipAcExPackageFiles(pkg)     // Package into a zip for download
// Or directly write pkg.files ([{ path, bytes }, ...]) to disk / upload to object storage,
// completely skipping the extraction step:
for (const file of pkg.files) {
  // Write to /var/www/packages/floor-plan/<file.path>
}
```

> **Poznámka:** Parsování DWG/DXF a sestavení scény závisí na běhovém prostředí prohlížeče `cad-simple-viewer`, proto **konverze na straně serveru by měla používat metodu 2 (CLI)**. Metoda 3 je vhodná pro integraci exportní funkce do vlastního webového produktu.

---

## 4. Nasazení na webový server

### 4.1 Rozbalení a publikování

```bash
mkdir -p /var/www/cad-packages/floor-plan
unzip ./out/floor-plan.zip -d /var/www/cad-packages/floor-plan
```

Po publikování stačí uživatelům předat URL `https://your-domain/cad-packages/floor-plan/viewer.html`. Doporučujeme organizovat adresáře podle **ID výkresu / čísla verze** (například `/cad-packages/{drawingId}/{version}/`). Když se výkres aktualizuje, publikujte nový adresář verze. Starou verzi lze přirozeně vyřadit a tato struktura také usnadňuje cachování.

### 4.2 Požadavky na server

Bude fungovat jakákoli služba schopná servírovat statické soubory: nginx, Apache, IIS, `npx serve`, Python `-m http.server`, stejně jako statické webové hostování v objektovém úložišti, jako Alibaba Cloud OSS / AWS S3 + CloudFront. Požadavků je jen několik:

1. **Přístup musí být přes HTTP(S).** Prohlížeč používá `fetch()` k načtení manifestu a souborů chunků. S protokolem `file://` nefunguje, takže nelze jednoduše dvojkliknout na `viewer.html` a použít jej jako lokální soubor.
2. **Celý balíček musí být hostován na stejném origin.** Z bezpečnostních důvodů loader ověřuje, že `manifestUrl` je na stejném origin jako stránka a že soubory chunků jsou na stejném origin jako manifest a nacházejí se uvnitř adresáře balíčku (absolutní URL a cesty `..` procházející adresáři jsou odmítnuty). Umístěte proto `viewer.html`, manifest a `chunks/` pod **stejný web / stejnou doménu CDN**. Nedělte soubory chunků na jinou doménu. Hostování stránky i chunků na doméně CDN je zcela v pořádku.
3. **Soubory `.gz` musí být vráceny jako původní bajty a nesmí obsahovat odpovědní hlavičku `Content-Encoding: gzip`.**

   `.acex.gz` / `.osnap.gz` jsou již bajty komprimované gzipem a prohlížeč provádí gunzip sám v JavaScriptu. Pokud webový server (typicky `mod_mime` Apache, který ve výchozím nastavení může pro příponu `.gz` nastavit `AddEncoding gzip gz`, nebo metadata konfigurovaná některými CDN/objektovými úložišti) přidá `Content-Encoding: gzip`, prohlížeč soubor automaticky jednou dekomprimuje a prohlížeč se jej pokusí dekomprimovat znovu, což vede k chybě. Ujistěte se, že jsou tyto soubory vráceny jako neprůhledná binární data (stačí `Content-Type: application/octet-stream`; prohlížeč je čte pomocí `arrayBuffer` a na MIME typu nezávisí). Manifest `.acex.json` by měl používat `application/json`.
4. **Strategie cachování.** Obsah souborů chunků je neměnný (v rámci stejného adresáře verze se nemění), takže je bezpečné dát `chunks/` dlouhou dobu života cache (`Cache-Control: public, max-age=31536000, immutable`). Soubory manifestu by měly používat krátkou dobu života cache nebo `no-cache`, aby klienti rychle odhalili aktualizace, když je balíček znovu exportován do stejného adresáře. Pokud jsou balíčky publikovány do adresářů s verzemi, může celý adresář používat dlouhodobé cachování.

Příklad nginx (výchozí konfigurace soubory `.gz` při přímém požadavku nekomprimuje/dekomprimuje; zde je to výslovně deklarováno, aby se předešlo vlivu CDN nebo vlastní konfigurace):

```nginx
server {
    listen 80;
    server_name drawings.example.com;
    root /var/www/cad-packages;

    # Chunk files: opaque bytes, prohibit any Content-Encoding
    location ~* \.(acex|osnap)\.gz$ {
        gzip off;
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.acex\.json$ {
        default_type application/json;
        add_header Cache-Control "no-cache";
    }
}
```

Uživatelé Apache by se měli ujistit, že pro příponu `.gz` není zapnuto `AddEncoding gzip .gz` (což je výchozí konfigurace MIME běžná). V případě potřeby jej odeberte v `.htaccess` adresáře balíčku:

```apache
<FilesMatch "\.(acex|osnap)\.gz$">
    <IfModule mod_headers.c>
        Header unset Content-Encoding
    </IfModule>
    ForceType application/octet-stream
</FilesMatch>
```

### 4.3 Lokální ověření

```bash
# In the extracted package directory
npx serve .
# Open http://localhost:3000/viewer.html
```

Pokud se výkres zobrazí správně a můžete přepínat rozvržení a provádět měření, konfigurace hostování je správná.

---

## 5. Jak zvolit možnosti exportu

| Možnost                  | Popis                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportFormat: 'multi'` | Přístup popsaný v tomto článku. `'single'` je samostatné jednostránkové HTML                                                                                                              |
| `viewerMode`            | `'measure'` (výchozí): zahrnuje měření, značky a objektový snapping s daty `*.osnap.gz`; `'view'`: pouze prohlížení (posun/přiblížení/hladiny), výsledkem je menší balíček a rychlejší počáteční vykreslení |
| `exportLayouts`         | `true` (výchozí) exportuje rozvržení papírového prostoru; `false` exportuje pouze modelový prostor a panel nástrojů nezobrazuje přepínání rozvržení                                                                    |
| `exportInvisibleLayers` | `true` (výchozí) exportuje také vypnuté/zmrazené hladiny; `false` exportuje pouze viditelné hladiny, výsledkem je menší balíček                                                                                 |
| `initialView`           | `'fit'` (výchozí, při otevření přizpůsobí výkres celému zobrazení) nebo `'current'` (zachová pozici zobrazení v okamžiku exportu)                                                                           |
| Heslo / expirace   | Podporováno pouze v režimu `single`; pro multi balíčky použijte autentizaci na hostující vrstvě (podepsané URL, reverzní proxy s přístupovými tokeny atd.)                                                   |

---

## 6. Příklad end-to-end pipeline

Minimální Node skript pro „konverze → rozbalení → publikování“ (který lze po nahrání výkresu připojit k webhooku nebo k CI pipeline):

```js
// publish-cad-package.mjs
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'
import { unzipAcExPackageFiles } from '@mlightcad/cad-html-plugin'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const [drawing, publishRoot] = process.argv.slice(2)
const workDir = './.cad-build'

// 1. Headless conversion, producing a zip
const { outputDir } = await runHeadless({
  inputPath: drawing,
  scriptPath: './export-html-multi.scr',
  outputDir: workDir,
  mode: 'read'
})

// 2. Find the generated zip and extract it to the publishing directory
const zipName = (await readdir(outputDir)).find(f => f.endsWith('.zip'))
const zipBytes = await readFile(path.join(outputDir, zipName))
const files = unzipAcExPackageFiles(
  new Uint8Array(zipBytes)
) // Includes path security validation and rejects dangerous entries such as ../
const target = path.join(publishRoot, path.basename(zipName, '.zip'))
for (const file of files) {
  const dest = path.join(target, file.path)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, file.bytes)
}

// 3. Upload/sync to the nginx directory or object storage (rsync, ossutil, aws s3 sync, ...)
console.log(`Published: https://drawings.example.com/${path.basename(target)}/viewer.html`)
```

V produkčním prostředí můžete také přidat funkce, jako: použití hashe obsahu výkresu k určení, zda lze přeskočit duplicitní konverzi, opakování neúspěšných konverzí, nebo přímé nahrání `pkg.files` do objektového úložiště pomocí `PutObject` (s použitím `buildAcExPackage` z metody 3, takže ani nemusíte vytvářet zip).

---

## 7. Časté dotazy

**Q: Mohu jednoduše umístit soubor zip na server a poskytnout na něj odkaz?**

Ne. Zip je pouze formát balení pro stažení a distribuci. Za běhu prohlížeč načítá rozbalené `viewer.html` / `*.acex.json` / `chunks/*.gz`. Musíte jej buď rozbalit na serveru a hostovat výsledné soubory, nebo použít `unzipAcExPackageFiles` ve vlastní aplikaci k rozbalení na frontendu (pozor na problémy se stejným origin a pamětí; u velkých výkresů se to nedoporučuje).

**Q: Soubory chunků po otevření stránky vrací 404 / selhávají při načítání.**

Zkontrolujte, zda je stránka přístupná přes HTTP(S); zda je adresář `chunks/` nasazen společně s `viewer.html` a manifestem; a zda nebyly soubory chunků přejmenovány nebo přesunuty (hodnoty `href` v manifestu jsou relativní cesty, takže struktura adresářů musí být zachována).

**Q: Soubory chunků se stáhnou úspěšně, ale selhávají při parsování.**

Nejpravděpodobněji server přidal `Content-Encoding: gzip` k souborům `.gz` (prohlížeč je automaticky jednou dekomprimoval). Zkontrolujte odpovědní hlavičky podle bodu 3 v části 4.2.

**Q: Mohu umístit soubory chunků na CDN a stránku ponechat na vlastní doméně?**

Aktuální loader vyžaduje, aby stránka, manifest a soubory chunků byly na stejném origin. Publikujte **celý adresář balíčku** na doménu CDN a nechte uživatele přistupovat k `viewer.html` přímo z CDN, aby mohli využívat zrychlení CDN.

**Q: Proč se exportovaný název souboru změnil na `floor-plan-2.zip`?**

Když cílový soubor již existuje, proces exportu automaticky připojí pořadové číslo, aby jej nepřepsal. Před dalším exportem adresář výstupu smažte nebo vyprázdněte, aby další běh nepřebíral zastaralý zip.

**Q: Co se stane, když se výkres upraví?**

Spusťte konverzi znovu a publikujte ji do nového adresáře (nebo přepište stejný adresář a zneplatněte cache manifestu). Balíček je snímek dat pro zobrazení a automaticky nesleduje aktualizace zdrojového souboru.

**Q: Bude původní výkres vystaven?**

Balíček obsahuje pouze data **na úrovni zobrazení**, jako jsou dávky čar/mesh, názvy hladin, názvy rozvržení, rozsahy a jednotky. Neobsahuje bajty DWG/DXF ani editovatelné záznamy entit. Stále však jde o kompletní reprezentaci geometrie výkresu. Pokud je vyžadováno silné řízení přístupu, implementujte autentizaci na hostující vrstvě nebo použijte jednostránkové HTML, které podporuje ochranu heslem a expirací.
