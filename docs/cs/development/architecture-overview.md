---
title: "Přehled architektury"
---

# Přehled architektury

CAD-Viewer pracuje zcela v prohlížeči a **nevyžaduje žádný backend**. Soubory DWG/DXF jsou zpracovávány lokálně pomocí WebAssembly a JavaScriptu, což zajišťuje:

- **Nulové požadavky na server** – nasazení kdekoli pouze pomocí statického hostingu
- **Kompletní soukromí dat** – soubory nikdy neopustí zařízení uživatele
- **Okamžitou integraci** – žádné složité nastavení backendu ani konfigurace API
- **Funkčnost offline** – funguje bez připojení k internetu

CAD-Viewer je organizován do několika dílčích balíčků, z nichž každý odpovídá za určitou oblast systému:

- **cad-viewer**: hlavní komponenta Vue 3 a frontendová aplikace, včetně UI komponent, dialogů, panelů nástrojů, správy stavu a integrace s vykreslovacími enginy.
- **cad-simple-viewer**: základní logika pro správu dokumentů, zpracování příkazů a integraci mezi UI a vykreslovacími enginy. Nezávislá na frameworku a bez UI (pouze plátno).
- **svg-renderer**: vykresluje entity DWG/DXF jako SVG grafiku pro export a škálovatelný 2D výstup.
- **three-renderer**: používá THREE.js k vykreslování entit DWG/DXF jako interaktivní 2D/3D grafiku s pokročilou vizualizací a vlastními shadery.

## Přehled architektury

**CAD-Viewer** je vysoce výkonný prohlížeč DWG/DXF fungující pouze v prohlížeči, který používá modulární a rozšiřitelnou architekturu pro načítání, parsování, vykreslování a interakci s různými formáty CAD dat. Systém je rozdělen do následujících základních vrstev:

![Přehled architektury](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

Tato vrstvená architektura zajišťuje, že si **CAD-Viewer** udrží vysoký výkon, nízkou latenci a silnou rozšiřitelnost při práci s různými objemy dat, požadavky na vykreslování a prostředími nasazení.

### **Vrstva modelu**

- Definuje jednotný **datový model** pro popis parsovaných CAD dat (včetně geometrických entit, informací o hladinách, parametrů výřezu atd.) prostřednictvím modulu [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) v [`realdwg-web`](https://github.com/mlightcad/realdwg-web).
- Implementuje jednotné rozhraní pro konverzi CAD souborů prostřednictvím [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts), což umožňuje různým převodníkům transformovat CAD data do jednotného datového modelu.
- Poskytuje možnosti parsování DWG prostřednictvím modulu [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) v `realdwg-web`, který převádí soubory DWG do jednotného datového modelu.
- Poskytuje možnosti parsování DXF prostřednictvím modulu [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json), který převádí soubory DXF do jednotného datového modelu.
- Nabízí geometrický engine prostřednictvím modulu [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) v `realdwg-web`, který podporuje různé geometrické výpočty (body, úsečky, polylinie, spline křivky, kružnice, oblouky, elipsy, eliptické oblouky) i matematické operace (vektory, matice atd.).

Krátká poznámka k tomu, proč definujeme rozhraní `AcDbDatabaseConverter`: existující nástroje pro čtení, zápis a konverzi DXF/DWG na trhu jsou často neúplné. Implementoval jsem `@mlightcad/libredwg-converter` a `@mlightcad/dxf-json` na základě některého open-source kódu. Nejlepším dostupným nástrojem pro parsování a konverzi DWG/DXF je však ve skutečnosti [ODA](https://www.opendesign.com/products/drawings). Pro jeho použití je nutné zakoupit licenci k přístupu ke zdrojovému kódu, ze kterého lze sestavit modul WebAssembly převádějící DXF/DWG do jednotného datového modelu definovaného v `@mlightcad/data-model`. Pokud by mi někdo zdrojový kód ODA poskytl, mohl bych také implementovat převodník založený na něm.

### **Vrstva vykreslování**

- Definuje jednotné rozhraní pro vykreslování prostřednictvím modulu [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) v `realdwg-web` pro vykreslování různých typů CAD entit.
- Implementuje rozhraní pro vykreslování v modulu [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) v `cad-viewer` s použitím Three.js pro vykreslování všech typů entit.
- Implementuje rozhraní pro vykreslování v modulu [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) v `cad-viewer`, který vykresluje výkresy jako SVG.

### **Vrstva zobrazení**

- Modul [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) v `cad-viewer` poskytuje základní logiku pro prohlížení CAD souborů, například správu dokumentů, zpracování příkazů a koordinaci mezi UI a vykreslovacím enginem. Nezávisí na žádném UI frameworku a nenabízí žádné UI prvky kromě plátna.
- Modul [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) staví na `@mlightcad/cad-simple-viewer` a poskytuje UI založené na Vue 3 s nabídkami, panely nástrojů, příkazovým řádkem, stavovým řádkem a tmavým i světlým motivem. Všechny základní funkce zabaluje do komponenty Vue 3 pro snadnou integraci.

## Vykreslovací engine

Vykreslování souborů DXF/DWG přináší několik výzev:

- Vysoce výkonné vykreslování výkresů obsahujících velké množství entit.
- Reprodukce efektů vykreslování textu v AutoCADu.
- Podpora stylů čar a vzorů šrafování.

### Vysoce výkonné vykreslování

Pro vysoce výkonné vykreslování velkých výkresů je klíčové sloučit body, čáry a plochy, aby se snížil počet **Draw Calls**. THREE.js nabízí částečné řešení prostřednictvím třídy [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) pro slučování trojúhelníkových sítí. Ta však nepodporuje slučování bodů a čar a ani slučování ploch plně neodpovídá našim potřebám. Proto jsme implementovali několik tříd inspirovaných `BatchedMesh` pro slučování bodů, čar a ploch. [Kód najdete zde](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch).

### Vykreslování textu

AutoCAD používá formát [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) pro formátovaný text a speciální font [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) (font založený na tazích, kreslený pouze čarami) pro rychlejší vykreslování. Hlavní výzvy jsou:

- **Parsování MText** – implementováno pomocí balíčku [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser).
- **Parsování fontů SHX** – implementováno pomocí balíčku [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser).
- **Vykreslování MText** – implementováno pomocí balíčku [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer). Kvůli výkonu jsou parsované soubory fontů ukládány do mezipaměti v IndexedDB prohlížeče, takže po stažení a parsování je následné vykreslování rychlejší.

Pro ladění vykreslování textu jsme vytvořili editor formátovaného textu založený na THREE.js, [mtext-editor](https://github.com/mlightcad/mtext-editor). V současnosti neexistuje žádný jiný open-source editor formátovaného textu založený na THREE.js, takže jej lze znovu použít jako textový editor pro jakýkoli vykreslovací engine.

### Styly čar a vzory šrafování

AutoCAD podporuje vlastní typy čar a vzory šrafování. Některé z nich jsme implementovali (typy čar obsahující text zatím nejsou podporovány). Všechny styly čar a efekty šrafování jsou implementovány pomocí `ShaderMaterial` z THREE.js. [Kód najdete zde](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style).

