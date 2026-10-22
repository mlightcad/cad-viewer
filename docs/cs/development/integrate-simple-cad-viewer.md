---
title: "Integrace Simple CAD Viewer"
---

# Integrace Simple CAD Viewer

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

Ačkoli `cad-simple-viewer` nepodporuje ukládání výkresů do souborů DWG/DXF, poskytuje komplexní podporu pro **úpravy výkresů v reálném čase**. Do výkresu můžete přidávat, upravovat a mazat entity a prohlížeč se automaticky aktualizuje, aby tyto změny zobrazil.

Při úpravách entit pracujete přímo s podkladovou databází výkresu. Prohlížeč tyto změny automaticky rozpozná a odpovídajícím způsobem aktualizuje zobrazení. Tato synchronizace v reálném čase zajišťuje, že:

- všechny úpravy jsou okamžitě viditelné
- zásobník příkazů správně sleduje změny pro operace undo/redo. To bude brzy implementováno.

Díky této možnosti je `cad-simple-viewer` vhodný pro aplikace, které potřebují nejen zobrazovat CAD soubory, ale také umožnit uživatelům interagovat s obsahem výkresu a upravovat jej.

**Důležitá poznámka**: vzory použití v `cad-simple-viewer` jsou **velmi podobné AutoCAD RealDWG**. Pokud máte zkušenosti s vývojem pro AutoCAD RealDWG, budou vám struktura API a pracovní postup téměř totožné. Hlavní rozdíl je v tom, že používáme [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/) místo nativních knihoven RealDWG.

Projekt [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) ukazuje, jak vytvořit výkres pomocí [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/).

## Dostupné exporty

### Základní třídy

- `AcApContext` - Hlavní kontext aplikace
- `AcApDocManager` - Správa dokumentů
- `AcApDocument` - Zpracování jednotlivých dokumentů
- `AcApSettingManager` - Správa nastavení

### Příkazy

- `AcApOpenCmd` - Příkaz pro otevření souboru
- `AcApZoomCmd` - Příkaz přiblížení
- `AcApPanCmd` - Příkaz posunu
- `AcApSelectCmd` - Příkaz výběru
- `AcApConvertToSvgCmd` - Příkaz konverze do SVG

### Komponenty editoru

- `AcEditor` - Hlavní třída editoru
- `AcEdCommandStack` - Správa zásobníku příkazů
- `AcEdSelectionSet` - Zpracování výběru
- `AcEdInputPoint` - Správa vstupních bodů

### Komponenty zobrazení

- `AcTrScene` - Správa scény
- `AcTrLayoutView` - Zpracování zobrazení rozvržení
- `AcTrView2d` - Správa 2D zobrazení

## Role v MLightCAD

Tento balíček funguje jako vrstva základní logiky, která propojuje frontendové UI s vykreslovacími enginy a spravuje všechny operace související s dokumenty.

