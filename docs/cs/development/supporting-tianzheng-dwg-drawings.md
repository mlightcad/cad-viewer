---
title: "Podpora výkresů Tianzheng DWG"
---

# Podpora výkresů Tianzheng DWG

Tato stránka vysvětluje, proč výkresy DWG vytvořené softwarem **Tianzheng** (天正建筑, TArch a další vertikální produkty Tianzheng) nelze plně parsovat generickými DWG parsery, a popisuje průmyslově standardní řešení: převést takové výkresy na **DWG ve formátu T3** před jejich parsováním a vykreslením.

## Pozadí: Proč entity Tianzheng nelze parsovat přímo

Na rozdíl od běžných entit DWG používají entity Tianzheng (stěny, dveře, okna, sloupy, kótovací anotace a další inteligentní stavební objekty) **datový formát soukromě definovaný softwarem Tianzheng**. **Nejsou** součástí nativního standardního formátu DWG AutoCADu.

V souborech DWG jsou tyto objekty specifické pro Tianzheng uloženy jako [vlastní entity](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-4E5C1B56-95C3-4D4F-8F1C-A9D34B1E1408) (proxy entity). Jejich interní data mají význam pouze pro vlastní běhové prostředí ObjectARX Tianzheng. Výsledkem je:

- Žádný univerzální komerční DWG parser nedokáže tyto proprietární entity Tianzheng parsovat přímo.
- Generický parser (včetně CAD-Viewer) dokáže vykreslit pouze standardní entity AutoCADu v takových výkresech, zatímco vlastní entity Tianzheng jsou přeskočeny nebo zobrazeny jako proxy grafika.

## Běžné průmyslové řešení: Převod do formátu T3

Dodavatelé software pro prohlížení CAD v oboru řeší tento problém podobným způsobem. Typický postup vypadá takto:

```text
DWG with Tianzheng entities
        |
        |  (1) Run Tianzheng runtime / conversion tool on the server
        v
T3 format DWG
        |
        |  (2) Parse with a standard DWG parser
        v
Rendered drawing in the viewer
```

1. **Spusťte prostředí Tianzheng nebo konverzní nástroj na straně serveru.** Výkres obsahující proprietární entity Tianzheng zpracuje software, který rozumí datovému formátu Tianzheng.
2. **Převeďte DWG do formátu T3.** T3 (Tianzheng 3) je exportní formát navržený pro kompatibilitu. Během konverze jsou všechny objekty specifické pro Tianzheng rozloženy („explodovány“) na běžné entity DWG — například stěny se stanou čarami/polyliniemi, dveře a okna se stanou blokovými referencemi a anotace Tianzheng se stanou standardními kótovacími/textovými entitami.
3. **Parsujte převedený soubor standardním DWG parserem.** Protože proprietární objekty Tianzheng zmizely a zůstaly pouze standardní entity DWG, může nyní jakýkoli generický DWG parser výkres správně načíst a zobrazit.

Jinými slovy, po převodu do formátu T3 se objekty specifické pro Tianzheng ve výkresu změní na běžné entity DWG, takže generický DWG parser funguje bez dalšího nastavení.

## Reference open-source nástroje pro konverzi T3

Pro referenci uvádíme open-source nástroj příkazového řádku, který tuto konverzi automatizuje:

- [t3-conv](https://github.com/housyty/t3-conv) — nástroj příkazového řádku pro Windows, který převádí soubory Tianzheng DWG na soubory T3 DWG pomocí dávkového pracovního postupu bez uživatelského rozhraní.

Upozorňujeme, že tento nástroj v zákulisí pohání skutečné běhové prostředí Tianzheng, takže na konverzním počítači musí být stále nainstalovány Tianzheng TArch a AutoCAD. Podrobné požadavky, konfiguraci a použití najdete v README projektu.

## Doporučení: Přidejte krok předzpracování

Pokud váš obchodní scénář zahrnuje velké množství výkresů Tianzheng, doporučujeme přidat **krok předzpracování** dříve, než výkresy vstoupí do pipeline prohlížení:

```text
Upload / Import
      |
      v
Detect Tianzheng entities  ->  If present, convert to T3 DWG
      |
      v
Store converted DWG
      |
      v
CAD-Viewer parsing & rendering
```

- Zjistěte, zda příchozí DWG obsahuje vlastní entity Tianzheng (například kontrolou názvů tříd proxy entit specifických pro Tianzheng nebo podpisů aplikace).
- Pokud ano, spusťte konverzi T3 (např. přes `t3-conv` na Windows serveru) a uložte převedený soubor.
- Předložte převedený T3 DWG do CAD-Viewer. Všechny dříve neviditelné objekty Tianzheng se nyní vykreslí jako standardní entity.

Díky tomu zůstává prohlížeč sám lehký a nezávislý na parseru, zatímco výkresy Tianzheng jsou koncovým uživatelům plně viditelné.
