---
title: "Upgrade cad-simple-viewer a cad-viewer"
---

# Upgrade cad-simple-viewer a cad-viewer

Tato příručka vysvětluje, jak bezpečně upgradovat `@mlightcad/cad-simple-viewer` a `@mlightcad/cad-viewer` — proč je nelze navyšovat izolovaně, které související balíčky se musí posunout společně a jaké existují dva spolehlivé způsoby, jak pro dané vydání určit správnou kompatibilní sadu verzí.

## Přehled

`@mlightcad/cad-simple-viewer` a `@mlightcad/cad-viewer` **nejsou samostatné balíčky**. Jsou součástí těsně integrovaného ekosystému, který sdílí společnou kódovou základnu a cyklus vydávání. Každé vydání obsahuje koordinovanou sadu aktualizací napříč pluginy, renderery, balíčky data-model, knihovnami pro vykreslování textu a UI frameworky třetích stran.

**Upgrade pouze `cad-simple-viewer` nebo `cad-viewer` izolovaně může vést k jemným chybám za běhu**, včetně:

- Rozhraní pluginů očekávající API signatury, které se změnily v novějších (nebo starších) verzích jádra
- Nesoulad tvaru data-model mezi tím, co jádro očekává, a tím, co starší parser/renderer produkuje
- Chybějící kompatibilita WebAssembly nebo Worker po navýšení libredwg-converter
- Problémy s vykreslováním textu, když se verze `mtext-renderer` / `mtext-parser` rozjedou
- Breaking nebo behaviorální změny Three.js, které nejsou sladěné napříč vrstvou rendereru

Vždy upgradujte **celou sadu souvisejících balíčků společně**. Dva spolehlivé způsoby, jak určit správné verze, jsou popsány níže.

---

## Ekosystém v kostce

Před upgradem pomůže vědět, které balíčky patří ke koordinovanému vydání a které jsou třetích stran. Následující kategorie jsou synchronizovány se stejným vydáním cad-viewer:

### Základní balíčky prohlížeče

| Balíček | Role |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | Jádro nezávislé na frameworku (správa dokumentů, zásobník příkazů, propojení vykreslování) |
| `@mlightcad/cad-viewer` | Obal uživatelského rozhraní Vue 3 + Element Plus postavený nad cad-simple-viewer |

### Pluginy — **musí přesně odpovídat verzi cad-simple-viewer**

| Balíček | Účel |
| --- | --- |
| `@mlightcad/cad-html-plugin` | Export samostatného HTML jedním kliknutím |
| `@mlightcad/cad-pdf-plugin` | Export PDF a import PDF podkladu |
| `@mlightcad/cad-svg-plugin` | Export SVG |
| `@mlightcad/cad-simple-ui-plugin` | Panel nástrojů v čistém DOM, správce hladin, dokovací panel |
| `@mlightcad/cad-agent-plugin` | Interakce poháněná AI agentem |
| `@mlightcad/cad-onedrive-plugin` | Integrace OneDrive |
| `@mlightcad/cad-google-drive-plugin` | Integrace Google Drive |

> **Základní pravidlo:** každý plugin ve výše uvedeném seznamu by měl být připnut k **přesně stejnému číslu verze** jako `cad-simple-viewer`, na který upgradujete (například `1.7.5`).

### Interní vrstva rendereru (stejná verze jako jádro, publikováno samostatně)

| Balíček | Účel |
| --- | --- |
| `@mlightcad/three-renderer` | Vykreslovací engine 2D/3D založený na THREE.js |
| `@mlightcad/pdf-renderer` | Backend používaný cad-pdf-plugin pro generování obsahu PDF |

Tyto jsou interně spotřebovávány pluginy a cad-simple-viewer. Obvykle je **neinstalujete** přímo, ale jejich verze musí být kompatibilní s pluginy, které instalujete.

### Nízkourovňová datová a textová vrstva — **musí odpovídat verzím z vydání**

| Balíček | Poznámky |
| --- | --- |
| `@mlightcad/data-model` | Základní typy entit/databáze; každé vydání je navyšuje společně s prohlížečem |
| `@mlightcad/libredwg-converter` | WebAssembly obal pro parsování DWG — podpora DWG na něm závisí |
| `@mlightcad/mtext-parser` | Parser obsahu MTEXT |
| `@mlightcad/mtext-renderer` | Renderer geometrie MTEXT → THREE |
| `@mlightcad/mtext-input-box` | Widget editoru MTEXT na plátně |

### Vue UI závislosti pouze pro cad-viewer

Tyto se objevují v overrides v `pnpm-workspace.yaml`, ale jsou potřeba pouze při použití `@mlightcad/cad-viewer` (plné Vue 3 UI). Integrace cad-simple-viewer je přímo neinstalují.

| Balíček | Účel |
| --- | --- |
| `@mlightcad/ribbon` | Komponenta uživatelského rozhraní ribbon |
| `@mlightcad/ui-components` | Sdílené primitivy Vue UI |

### Peer závislosti třetích stran (ponechte verze tak, jak jsou připnuty ve vydání)

| Balíček |
| --- |
| `three` |
| `vue` (pouze pro cad-viewer) |
| `element-plus` (pouze pro cad-viewer) |
| `vue-i18n` (pouze pro cad-viewer) |
| `lodash-es` |

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

4. Aktualizujte každý používaný `@mlightcad/cad-*-plugin` na **stejnou verzi** jako `cad-simple-viewer` / `cad-viewer`:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
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

A: Semver rozsahy (`^`, `~`) fungují dobře pro navyšování na úrovni patch *v rámci* jedné série vydání (například `^1.7.0` automaticky zvolí `1.7.5`), ale **koordinované verze pluginů/data-model/libredwg-converter** nejsou ze samotného semveru zjistitelné — nastavují je správci vydání. Pro jakékoli navyšování menší verze stále potřebujete jednu ze dvou výše uvedených metod, abyste věděli, které verze k sobě patří.

**Q: Používám npm/yarn místo pnpm. Platí to stále?**

A: Ano. Koordinace verzí je stejná bez ohledu na správce balíčků. Použijte `overrides` (pnpm), `resolutions` (yarn) nebo `overrides` (npm) s hodnotami z `pnpm-workspace.yaml`, nebo jednoduše připněte verze z diffu `cad-simple-viewer-demo` ve vašem `package.json`.
