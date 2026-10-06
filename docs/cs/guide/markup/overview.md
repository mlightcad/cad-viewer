---
title: Přehled komentářů
---

# Přehled komentářů

Příkazy komentářů slouží k přidávání revizních značek do výkresu. Při spuštění příkazu komentáře se prohlížeč automaticky přepne do **režimu revize** (pozadí DWG/DXF je pouze pro čtení).

Všechny komentáře jsou vykresleny jako překryvná vrstva HTML, **neupravují původní soubor DWG/DXF**. Jsou nezávisle ukládány a sdíleny prostřednictvím doprovodného souboru JSON (název `výmresu.markup.json`).

## Vytvoření komentáře

Většina příkazů komentářů používá interakci krokového výběru bodů ve stylu CAD:

1. Vyberte příkaz (pás karet → skupina komentářů, nebo pravý nástrojový panel – vyskakovací panel komentářů)
2. Podle pokynů příkazu postupně klepněte na požadované body
3. Během tažení se zobrazuje náhled v reálném čase (Jig)
4. Po dokončení se komentář ihned zobrazí na plátně

## Úprava komentářů

- **Jedno klepnutí** na komentář jej vybere a zobrazí úchopové body (grip)
- **Tažením úchopového bodu** lze upravit tvar, koncové body atd.
- **Dvojklik** na komentář s textem (text, Callout, tvar s připojeným Callout) otevře vloženou úpravu textu
- Po výběru stiskněte klávesu **Delete** pro smazání

## Zpět / znovu

Operace komentářů podporují zpět a znovu. Zpět vrátí nejen vytvoření, ale i úpravy úchopových bodů, mazání atd.

## Import / export

- **Export**: exportuje všechny aktuální komentáře do souboru JSON ke stažení
- **Import**: načte dříve exportovaný soubor JSON a obnoví všechny komentáře

Doprovodný soubor JSON lze sdílet napříč výkresy a zařízeními.
