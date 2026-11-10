---
title: Převod výkresů PDF
---

# Převod výkresů PDF

Výkres v PDF uchovává jen to, co bylo vytištěno: křivky jsou Bézierovy cesty, text je často složený z tahů a kóty i bloky se rozpadly na samostatné čáry. Panel **PDF** na kartě **AI** pásu karet takový výkres převede zpět na upravitelné objekty CAD. Jednoznačné případy se převedou automaticky při importu; u ostatních vyberete vzor nebo potvrdíte, co bylo nalezeno.

| Tlačítko | Příkaz | Co dělá |
|---|---|---|
| Import PDF | `ipdf` | Importuje stránku PDF a obnoví křivky, bloky, tloušťky a typy čar |
| Kalibrovat měřítko | `pdfscale` | Změní měřítko importu na skutečnou velikost podle jedné známé vzdálenosti |
| Obnovit text | `pdftext` | Převede rozložené tahy textu zpět na text |
| Vytvořit blok | `pdfblock` | Převede opakovanou geometrii zpět na blok |
| Obnovit kóty | `pdfdim` | Převede rozložené kóty zpět na kótovací objekty |

Příkazy vyžadují režim **Zápis**. Doporučené pořadí: `ipdf` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim`.

## Import (`ipdf`)

1. Vyberte soubor PDF.
2. U vícestránkového souboru zadejte číslo stránky.
3. Určete bod vložení, nebo stiskněte Enter pro počátek. Možnosti:
   - **Měřítko**: jednotné měřítko použité při importu.
   - **Režim**: způsob importu.
     - **Obnovit** (výchozí): pokusí se obnovit původní výkres, viz níže.
     - **Vzhled**: zachová PDF přesně tak, jak vypadá. Každá cesta se stane úsečkou nebo křivkou (oblouky se rozloží) a každý textový úsek samostatným textem; nic se neslučuje, neodstraňují se duplicity ani nevznikají bloky. Použijte, když obnova změní vzhled stránky.

V režimu **Obnovit** se automaticky obnoví:

- **Křivky**: Bézierovy kružnice, oblouky a elipsy se stanou kružnicemi, oblouky a elipsami. Obrysy kombinující úsečky a oblouky se stanou křivkami s obloukovými segmenty. Oblouky, které tvůrce PDF už rozdělil na krátké úsečky, se znovu proloží. Volné křivky se stanou spliny.
- **Bloky**: obsah nakreslený několikrát ze stejného formuláře PDF se stane jedním blokem (`PDF_FORM_n`) s referencí pro každou kopii, včetně otočených a zrcadlených.
- **Styly**: šířky tahů se stanou tloušťkami čar, přerušované čáry dostanou typ čáry `PDF_DASH_*` a text dostane textový styl `PDF_<písmo>`. Rozdělené úseky textu na jednom řádku se spojí.
- **Úklid**: přesně duplicitní obrysy se odstraní.

Vyplněné oblasti (barevné plochy, vyplněná loga a obrysy textu) se importují jako plné šrafy v barvě výplně, ve stejném pořadí vykreslení jako na stránce. Integrace mohou nastavit volbu `fillHatches` na `false` a importovat je jen jako obrysy.

Vzorové šrafy (ANSI31, cihly, křížové šrafování apod.) jsou v PDF uloženy jako tisíce krátkých úseček. V režimu **Obnovit** se znovu sestaví jako objekty šraf: úsečky se porovnají se standardními vzory `acadiso.pat`, případně s uživatelským jednoduchým nebo křížovým vzorem, včetně měřítka, úhlu a počátku, se kterými byly nakresleny. Hranice se vezme z nakresleného uzavřeného obrysu, z ořezové cesty PDF nebo z konců úseček. Šrafa se ponechá jen tehdy, když její vykreslení odpovídá úsečkám na stránce; vše ostatní zůstane jako úsečky. Integrace mohou nastavit `recognizeHatches` na `false` a ponechat všechny úsečky.

V obou režimech se text roztáhne nebo zúží na šířku, kterou měl v PDF, protože prohlížeč ho obvykle kreslí jiným písmem. Obrázky (fotografie, loga, QR kódy) se importují jako rastrové obrázky s názvem `PDF_IMAGE_n.png`; jejich pixely zůstávají jen v otevřeném výkresu, protože DWG a DXF odkazují na obrázky jako na samostatné soubory. Černé obrázky na průhledném pozadí, například QR kódy, se umístí na bílý podklad jako na stránce PDF.

## Kalibrace měřítka (`pdfscale`)

Výkresy PDF jsou obvykle vytištěny v měřítku, například 1:50 nebo 1:100.

1. Vyberte objekty, kterým chcete změnit měřítko.
2. Určete oba konce známé vzdálenosti, například okótované hrany.
3. Zadejte skutečnou délku.

Pokud výběr obsahuje rozložené kóty, skutečná délka se předvyplní podle měřítka, které vyplývá z jejich textů; potvrďte ji klávesou Enter.

## Obnovení textu (`pdftext`)

1. Vyberte oblast s textem. Rámečky a jiné velké čáry se ignorují.
2. Tahy se seskupí do řádků a každý řádek se postupně zvýrazní. Napište jeho text a potvrďte; prázdný vstup řádek přeskočí, Esc příkaz ukončí.
3. Tvar každého potvrzeného znaku se zapamatuje. Řádky složené jen ze známých tvarů se převedou bez ptaní, takže čím víc toho napíšete, tím méně musíte psát.

Zapamatované tvary se ukládají v prohlížeči, takže pomohou i u dalších výkresů se stejným písmem. Je-li pro CAD Agent nastaven model AI s podporou obrázků, každý řádek přijde s navrženým textem.

## Vytvoření bloku (`pdfblock`)

1. Vyberte objekty **jedné** kopie opakovaného symbolu.
2. Určete základní bod bloku. Volba **Měřítko** najde i kopie jiné velikosti.
3. Potvrďte název bloku.
4. Všechny ostatní kopie, včetně otočených a zrcadlených, se zvýrazní. Zvolte **Ano** pro nahrazení všech, **Ne**, aby se blokem stal jen váš výběr, nebo **Revize** pro rozhodování kopii po kopii.

## Obnovení kót (`pdfdim`)

1. Vyberte oblast s kótami.
2. Rozpoznají se:
   - **Lineární kóty**: v libovolném úhlu, se šipkami uvnitř i vně, s architektonickými značkami i řetězové kóty.
   - **Kóty poloměru a průměru**: šipka dotýkající se kružnice s textem `R…` nebo `Ø…`.
   - **Úhlové kóty**: oblouk se šipkou na každém konci.
3. Zvolte **Ano**, **Ne** nebo **Revize**, stejně jako u bloků.

Kóty používají styl `PDF_DIM`, jehož výška textu a velikost šipek odpovídají PDF. Jeho lineární měřítko se rovná měřítku výkresu přečtenému z textů, takže výkres 1:100 stále ukazuje skutečné hodnoty. Texty, které se od měření liší nebo obsahují další symboly, zůstanou tak, jak byly napsány.

::: tip
Chcete-li geometrii ve skutečné velikosti, spusťte nejprve `pdfscale`. `pdfdim` pak zjistí měřítko 1:1.
:::
