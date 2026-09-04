---
title: Režim kontroly
---

# Režim kontroly

Režim kontroly přidává nad rámec režimu pouze pro čtení plné možnosti značkování. Pozadí DWG/DXF zůstává pouze pro čtení; všechny značky jsou kresleny jako překryvy HTML a nezávisle ukládány/sdíleny prostřednictvím doprovodných souborů JSON.

Při vstupu do režimu kontroly rozhraní automaticky zobrazí nástroje a panely související se značkami.

## Desktop

### Celkové rozložení

Stejné jako v režimu pouze pro čtení: žádný Ribbon a žádný stavový panel. Rozhraní je orientováno na plátno, příkazy jsou přístupné prostřednictvím pravého panelu nástrojů a ukotvených panelů. Rozdíl spočívá v tom, že pravý panel nástrojů získává skupinu nástrojů pro značky a ukotvené panely získávají panel kontroly.

### Pravý panel nástrojů

Kromě nástrojů režimu pouze pro čtení je k dispozici vyskakovací panel **Skupina nástrojů pro značky** obsahující: šipku, text, cloud, obdélník, kružnici, Callout, razítko a další příkazy pro značky.

### Ukotvené panely

Kromě panelů režimu pouze pro čtení je k dispozici **Panel kontroly (značky)**:

| Panel | Popis |
|---|---|
| Kontrola (značky) | Zobrazí všechny značky, včetně ikony, tvůrce, času a shrnutí podle typu. Podporuje kliknutí k přejití na místo, úpravu metadat (Komentář / Stav) a vymazání |

Všechny ostatní panely (Vrstvy, Měření, Informace o entitě, Statistiky, Chybějící prostředky) jsou stejné jako v režimu pouze pro čtení.

## Tablet (Pad)

Stejné rozložení tabletu jako v režimu pouze pro čtení, ale:

- Pravý panel nástrojů získává vyskakovací tlačítko skupiny nástrojů pro značky
- Seznam ukotvených panelů získává položku panelu „Kontrola“

## Mobil

**Tlačítko Review** v mobilní spodní liště karet je v tomto režimu aktivní a dostupné.

### Spodní lišta karet

| Tlačítko | Stav |
|---|---|
| Zoom | K dispozici |
| Measure | K dispozici |
| Review | **K dispozici** — kliknutím otevřete panel nástrojů pro značky |
| Layers | K dispozici |
| Layout | K dispozici |
| Setting | K dispozici |

### Tlačítko Review

Klepnutím na tlačítko Review se ze spodní části otevře panel nástrojů pro značky, který vypisuje: šipku, text, cloud, obdélník, kružnici, Callout, razítko atd. Výběrem jedné z možností se přímo vstoupí do příkazu pro značky s náhledem v reálném čase na plátně a interaktivním vytvářením.

### Seznam značek

Ve spodní části panelu Review nebo v sekundárním zobrazení uvidíte všechny značky v aktuálním výkresu. Kliknutím na položku seznamu můžete:

- Přiblížit plátno na místo značky
- Přepnout viditelnost značky
- Otevřít úpravu metadat značky (Komentář / Stav)

### Import / Export značek

V horní části panelu Review jsou tlačítka pro export a import. Doprovodné soubory JSON lze sdílet napříč výkresy a zařízeními.

## Rozdíly oproti režimu pouze pro čtení

| Komponenta | Pouze pro čtení | Kontrola |
|---|---|---|
| Pravý panel nástrojů · Skupina nástrojů pro značky | ✗ | ✓ |
| Ukotvený panel · Kontrola (značky) | ✗ | ✓ |
| Mobil · Spodní tlačítko Review | Zakázáno (šedě) | K dispozici |
| Vytváření / úprava značek | ✗ | ✓ |
| Import / export značek | ✗ | ✓ |
