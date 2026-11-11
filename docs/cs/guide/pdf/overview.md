---
title: Převod výkresů PDF
---

# Převod výkresů PDF

Výkres v PDF uchovává jen to, co bylo vytištěno: křivky jsou Bézierovy cesty, text je často složený z tahů a kóty i bloky se rozpadly na samostatné čáry. Panel **PDF** na kartě **AI** pásu karet takový výkres převede zpět na upravitelné objekty CAD. Jednoznačné případy se převedou automaticky při importu; u ostatních vyberete vzor nebo potvrdíte, co bylo nalezeno.

| Tlačítko | Příkaz | Co dělá |
|---|---|---|
| Import PDF | `pdfimport` / `-pdfimport` | Importuje stránku PDF a obnoví křivky, bloky, tloušťky a typy čar |
| Kalibrovat měřítko | `pdfscale` | Změní měřítko importu na skutečnou velikost podle jedné známé vzdálenosti |
| Obnovit text | `pdftext` | Převede rozložené tahy textu zpět na text |
| Vytvořit blok | `pdfblock` | Převede opakovanou geometrii zpět na blok |
| Obnovit kóty | `pdfdim` | Převede rozložené kóty zpět na kótovací objekty |

Příkazy vyžadují režim **Zápis**. Doporučené pořadí: `pdfimport` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim`.

## Import (`pdfimport`)

1. Vyberte soubor PDF. Otevře se dialog **Importovat PDF**.
2. V části **Stránka k importu** zvolte stránku (jen u vícestránkových souborů). Náhled zobrazí stránku; tlačítko miniatur vedle něj vypíše všechny stránky. **Procházet...** vybere jiný soubor.
3. V části **Umístění** zadejte souřadnice X/Y bodu vložení (výchozí je počátek), nebo zaškrtněte **Zadat bod vložení na obrazovce** a určete ho ve výkresu po stisku OK. **Měřítko** je jednotné měřítko použité při importu.
4. V části **Režim importu** zvolte způsob importu:
   - **Obnovit výkres** (výchozí): pokusí se obnovit původní výkres, viz níže.
   - **Zachovat vzhled PDF**: zachová PDF přesně tak, jak vypadá. Každá cesta se stane úsečkou nebo křivkou (oblouky se rozloží) a každý textový úsek samostatným textem; nic se neslučuje, neodstraňují se duplicity ani nevznikají bloky. Použijte, když obnova změní vzhled stránky.
5. Klikněte na **OK**. Umístění, měřítko a režim se zapamatují pro příští `pdfimport`.

`-pdfimport` importuje bez dialogu: po výběru souboru se na příkazovém řádku zeptá na stránku (jen u vícestránkových souborů) a poté na bod vložení s možnostmi **Měřítko** a **Režim**. Enter přijme počátek.

V režimu **Obnovit výkres** se automaticky obnoví:

- **Křivky**: Bézierovy kružnice, oblouky a elipsy se stanou kružnicemi, oblouky a elipsami. Obrysy kombinující úsečky a oblouky se stanou křivkami s obloukovými segmenty. Oblouky, které tvůrce PDF už rozdělil na krátké úsečky, se znovu proloží. Volné křivky se stanou spliny.
- **Bloky**: obsah nakreslený několikrát ze stejného formuláře PDF se stane jedním blokem (`PDF_FORM_n`) s referencí pro každou kopii, včetně otočených a zrcadlených.
- **Styly**: šířky tahů se stanou tloušťkami čar, přerušované čáry dostanou typ čáry `PDF_DASH_*` a text dostane textový styl `PDF_<písmo>`. Rozdělené úseky textu na jednom řádku se spojí.
- **Úklid**: přesně duplicitní obrysy se odstraní.

Vyplněné oblasti (barevné plochy, vyplněná loga a obrysy textu) se importují jako plné šrafy v barvě výplně, ve stejném pořadí vykreslení jako na stránce. Integrace mohou nastavit volbu `fillHatches` na `false` a importovat je jen jako obrysy.

Vzorové šrafy (ANSI31, cihly, křížové šrafování apod.) jsou v PDF uloženy jako tisíce krátkých úseček. V režimu **Obnovit výkres** se znovu sestaví jako objekty šraf: úsečky se porovnají se standardními vzory `acadiso.pat`, případně s uživatelským jednoduchým nebo křížovým vzorem, včetně měřítka, úhlu a počátku, se kterými byly nakresleny. Hranice se vezme z nakresleného uzavřeného obrysu, z ořezové cesty PDF nebo z konců úseček. Šrafa se ponechá jen tehdy, když její vykreslení odpovídá úsečkám na stránce; vše ostatní zůstane jako úsečky. Integrace mohou nastavit `recognizeHatches` na `false` a ponechat všechny úsečky.

V obou režimech se text roztáhne nebo zúží na šířku, kterou měl v PDF, protože prohlížeč ho obvykle kreslí jiným písmem. Obrázky (fotografie, loga, QR kódy) se importují jako rastrové obrázky s názvem `PDF_IMAGE_n.png`; jejich pixely zůstávají jen v otevřeném výkresu, protože DWG a DXF odkazují na obrázky jako na samostatné soubory. Černé obrázky na průhledném pozadí, například QR kódy, se umístí na bílý podklad jako na stránce PDF.

## Kalibrace měřítka (`pdfscale`)

Výkresy PDF jsou obvykle vytištěny v měřítku, například 1:50 nebo 1:100.

1. Vyberte objekty, kterým chcete změnit měřítko.
2. Určete oba konce známé vzdálenosti, například okótované hrany.
3. Zadejte skutečnou délku.

Pokud výběr obsahuje rozložené kóty, skutečná délka se předvyplní podle měřítka, které vyplývá z jejich textů; potvrďte ji klávesou Enter.

## Obnovení textu (`pdftext`)

1. Vyberte oblast s textem. Rámečky a další velké čáry se ignorují.
2. Tahy se seskupí do řádků a u každého řádku se rozpozná, zda jde o text **SHX** (otevřené čárové tahy), nebo text **TrueType** (uzavřené obrysy). Řádky složené jen z tvarů znaků, které jste dříve zadali, se přečtou hned.
3. Pokud je nastaven model AI s podporou obrázků (`LLMSETTINGS`), všechny ostatní řádky se mu odešlou najednou v několika požadavcích. Pokud rozpoznání selže, zpráva uvede důvod (například neplatný klíč API).
4. V paletě se otevře panel **Obnovit text** a výsledek se zobrazí jako náhled ve výkresu. Během otevřeného panelu můžete posouvat a zvětšovat.
   - Pro text SHX a text TrueType zvlášť vyberte existující **styl textu** nebo vytvořte nový a zkontrolujte **písmo** a **velké písmo**, které používá. Pokud neodpovídají originálu, nahraďte je; varování upozorní, když písmo chybí a čím se místo něj kreslí, nebo když změna písem existujícího stylu změní i texty, které jej již používají. Ve výchozím nastavení text SHX používá styl `PDF_SHX` (`txt` + `gbcbig`), takže si zachová vzhled i velikost textu SHX.
   - Upravte **měřítko výšky** a **faktor šířky** přizpůsobte původní šířce, nebo jej nastavte ručně.
   - Seznam zobrazuje každý řádek s textem a jeho původem (naučeno, OCR, upraveno, nerozpoznáno); nerozpoznané řádky jsou první. Kliknutím na řádek jej zobrazíte ve výkresu, opravte nebo zadejte jeho text a klávesou Enter přejděte na další nerozpoznaný řádek; zadání jednoho řádku vyplní i další řádky se stejnými znaky. Zrušením zaškrtnutí řádek přeskočíte; chybně rozpoznaný řádek lze přepnout mezi SHX a TrueType.
   - Znaky, které mají tvořit jeden text, ale byly rozpoznány jako samostatné řádky, lze sloučit do jednoho víceřádkového textu (MTEXT): vyberte řádky klepnutím s klávesou Ctrl nebo Shift a klepněte na **Sloučit do víceřádkového textu**, nebo klepněte na **Sloučit sousední** a sloučí se vše, co stojí vedle sebe na jednom účaří. Řádky na různých účařích se stanou samostatnými řádky víceřádkového textu s původním řádkováním. **Rozdělit** vrátí sloučený text zpět na řádky.
   - **Skrýt původní čáry** zobrazí jen náhled.
5. Klepnutím na **Použít** text převedete. **Zrušit** nebo zavření palety nic nezmění.

Každý napsaný tvar znaku se zapamatuje v prohlížeči, takže pomůže i u dalších výkresů se stejným písmem. Text přečtený modelem AI se nezapamatuje. Celý příkaz lze vrátit jedním krokem a převedené texty lze upravovat jako jakýkoli jiný text.

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
