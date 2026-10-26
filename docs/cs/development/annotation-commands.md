---
title: "Anotační příkazy"
---

# Anotační příkazy

Tato stránka představuje, jak jsou v `cad-viewer` implementovány **anotační příkazy**, a to jak ve **vrstvě příkazů**, tak ve **vrstvě interakce uživatelského rozhraní**.  
Návrh úzce vychází z konceptů podobných AutoCADu, jako jsou *systémové proměnné*, *aktuální hladina* a *styly kreslení entit*.

## Přehled

Anotace v `cad-viewer` (například anotační kružnice, obdélníky, oblačné obdélníky, skici atd.) jsou implementovány jako:

-   Specializované **příkazy** odvozené od společné základní třídy
-   **Entity** vytvářené dynamicky na vyhrazené anotační hladině
-   **Styly kreslení** řízené systémovými proměnnými namísto stylů hladin
-   **Dočasný panel nástrojů uživatelského rozhraní**, který během provádění příkazu upravuje systémové proměnné

Tento přístup zajišťuje:

-   Konzistentní chování všech anotačních příkazů
-   Snadné zobrazení/skrytí všech anotací
-   Známý pracovní postup ve stylu AutoCADu

## Část s příkazy

### Základní třída příkazu

Všechny příkazy související s anotacemi dědí ze stejné základní třídy:

-   [`AcApBaseRevCmd`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApBaseRevCmd.ts)

Tato základní třída centralizuje společné chování, například:

-   Správu anotační hladiny
-   Zálohování a obnovu systémových proměnných
-   Zpracování životního cyklu příkazu (spuštění / konec / zrušení)

Díky dědění z `AcApBaseRevCmd` všechny anotační příkazy dodržují stejný vzor provádění a stejné chování systémových proměnných.

### Správa anotační hladiny

Všechny anotační entity jsou vytvářeny na **vyhrazené anotační hladině**, která je:

-   **Vytvořena dynamicky**, pokud neexistuje
-   Používána pouze během provádění anotačního příkazu

V zákulisí je toho dosaženo manipulací se systémovou proměnnou:

-   `clayer` (aktuální hladina)

#### Pracovní postup

1.  Před vytvořením anotační entity:

    -   Původní hodnota `clayer` je uložena
    -   `clayer` je přepnuta na anotační hladinu

1.  Anotační entity jsou vytvořeny

1.  Po dokončení příkazu (nebo jeho zrušení):

    -   `clayer` je obnovena na původní hodnotu

To zaručuje:

-   Anotace jsou vždy umístěny na správné hladině
-   Stav hladin uživatele není trvale změněn

### Zobrazení / skrytí anotací

Skrytí nebo zobrazení anotací je implementováno jednoduše:

-   **Skrytím nebo zobrazením anotační hladiny**

Není potřeba žádná logika viditelnosti pro jednotlivé entity.  
To činí správu viditelnosti anotací efektivní a konzistentní.

### Rozlišení stylu kreslení entity

Anotační entity **nepoužívají pro svůj vzhled styly hladin**.

Jejich styly kreslení se místo toho odvozují od **systémových proměnných**, včetně:

-   `cecolor` — aktuální barva entity
-   `celweight` — aktuální tloušťka čáry entity

Tento návrh umožňuje:

-   Každá anotace si zachová svůj vizuální styl v okamžiku vytvoření
-   Změny stylů hladin neovlivňují existující anotace

## Část uživatelského rozhraní

### Panel nástrojů stylu kreslení entity

Při vytváření anotační entity se zobrazí následující komponenta uživatelského rozhraní:

-   [`MlEntityDrawStyleToolbar`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-editor/src/component/layout/MlEntityDrawStyleToolbar.vue)

#### Chování

-   Zobrazuje se v **horní části prohlížeče uprostřed**

-   Umožňuje uživatelům upravovat:

    -   Barvu
    -   Tloušťku čáry
    -   Další styly kreslení entit

Protože se tento panel nástrojů překrývá se zobrazením názvu souboru:

-   **Název souboru je dočasně skryt**, dokud je panel nástrojů viditelný

### Vazba na systémové proměnné

Interakce uživatele s `MlEntityDrawStyleToolbar` přímo upravuje systémové proměnné, například:

-   `cecolor`
-   `celweight`

Tyto systémové proměnné poté anotační entity používají při vytvoření, což zajišťuje:

-   To, co uživatel vidí v panelu nástrojů, odpovídá tomu, co je nakresleno
-   Chování anotací je konzistentní s pracovními postupy ve stylu AutoCADu

### Obnova systémových proměnných

Po dokončení anotačního příkazu (úspěšně nebo ne):

-   Upravené systémové proměnné (`cecolor`, `celweight` atd.) jsou obnoveny na původní hodnoty

To zajišťuje:

-   Anotační příkazy trvale neovlivňují globální stav výkresu
-   Uživatelé mohou bezpečně přepínat mezi anotačními a běžnými kreslicími příkazy

## Shrnutí

Anotační systém v `cad-viewer` je postaven na třech klíčových myšlenkách:

1.  **Dědičnost příkazů**

    -   Všechny anotační příkazy sdílejí společnou základní implementaci

1.  **Organizace podle hladin**

    -   Všechny anotace žijí na dynamicky spravované anotační hladině

1.  **Styly řízené systémovými proměnnými**

    -   Styly kreslení jsou řízeny systémovými proměnnými, nikoli styly hladin

Tato architektura poskytuje:

-   Předvídatelné chování příkazů
-   Snadnou správu anotací
-   Známé uživatelské prostředí podobné CADu
