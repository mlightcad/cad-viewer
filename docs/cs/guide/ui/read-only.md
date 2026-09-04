---
title: Režim pouze pro čtení
---

# Režim pouze pro čtení

Režim pouze pro čtení slouží výhradně k prohlížení a měření výkresů. Pozadí DWG/DXF je zcela neupravitelné; příkazy pro značky, kreslení a úpravy jsou nedostupné.

Při vstupu do režimu pouze pro čtení se rozhraní automaticky přizpůsobí svému rozložení podle typu zařízení.

## Desktop

### Celkové rozložení

Režim pouze pro čtení nemá Ribbon ani stavový panel. Rozhraní je orientováno na plátno, přičemž všechny příkazy jsou přístupné prostřednictvím pravého panelu nástrojů a ukotvených panelů:

<ReviewModeLayout mode="readonly" />

### Pravý panel nástrojů

Svislý panel nástrojů plovoucí na pravé straně plátna — hlavní vstupní bod pro příkazy v režimu pouze pro čtení:

- Vybrat / Zrušit výběr
- Posun (ruka)
- Přiblížit na rozsah
- Přiblížit oknem
- Správa vrstev (otevře panel)
- Skupina měřicích nástrojů (otevře panel měření)
- Režim čtení (vstoupit do režimu celoobrazovkového zaměření)
- Přepnout světlé/tmavé pozadí

### Ukotvené panely

| Panel | Popis |
|---|---|
| Vrstvy | Zobrazí všechny vrstvy; podporuje zapnutí/vypnutí, uzamčení, zmrazení, izolaci |
| Měření | Zobrazí všechna měření v aktuálním výkresu; kliknutím přejdete na místo |
| Informace o entitě | Zobrazí typ, souřadnice, vrstvu a vlastnosti vybrané entity |
| Statistiky | Statistiky používání bloků |
| Chybějící prostředky | Upozornění na chybějící písma nebo externí odkazy |

## Tablet (Pad)

Rozložení tabletu je kompaktní design mezi desktopem a mobilem:

- Pravý panel nástrojů je zachován, ale rozestupy tlačítek jsou zvětšeny pro dotyk
- Ukotvené panely jsou ve výchozím stavu sbalené do lišty ikon; kliknutím rozbalíte jako postranní zásuvku

## Mobil

Mobil používá design **spodní lišta karet + zásuvkový panel**, který soustředí veškerou interakci do dolní části obrazovky a horní část nechává pro plátno.

### Spodní lišta karet

V dolní části obrazovky se zobrazuje šest tlačítek s ikonami:

<MobileBottomTabBar mode="readonly" />

| Tlačítko | Funkce |
|---|---|
| Zoom | Skupina nástrojů přiblížení: přiblížit, oddálit, přiblížit na rozsah, přiblížit oknem |
| Measure | Skupina měřicích nástrojů: vzdálenost, průběžná vzdálenost, plocha, souřadnice, délka oblouku, úhel |
| Review | Vstup do značek (v režimu pouze pro čtení zakázán, zobrazen šedě) |
| Layers | Otevře zásuvku panelu vrstev |
| Layout | Přepne rozložení |
| Setting | Nabídka nastavení: motiv, simulovaná myš, OSNAP atd. |

### Zásuvkový panel

Klepnutím na tlačítko Layers se ze spodní části otevře panel vrstev, který zobrazuje název, viditelnost (zapnuto/vypnuto), barvu atd. každé vrstvy. Klepnutím na plátno nebo oblast mimo panel zásuvku zavřete.

### Oblast plátna

Plátno vyplňuje horní část obrazovky. Při výběru měření se na plátně zobrazí odznak měření.

### Rozdíly oproti desktopu

Mobil nezobrazuje pravý panel nástrojů ani ukotvené panely; jejich funkce jsou nahrazeny spodní lištou karet + zásuvkovými panely.
