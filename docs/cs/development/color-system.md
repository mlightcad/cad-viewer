---
title: "Barevný systém"
---

# Barevný systém

Barevný systém `cad-viewer` se řídí chováním AutoCAD ObjectARX a zároveň zajišťuje předvídatelné vykreslování v prostředí prohlížeče.

Podporuje jak **AutoCAD Color Index (ACI)**, tak **True Color**, sjednocené prostřednictvím abstrakce `AcCmColor`.

## Přehled

V systémech kompatibilních s AutoCADem jsou barvy reprezentovány dvěma základními způsoby:

### ACI (AutoCAD Color Index)

- Systém barev založený na celých číslech (`0–256`)
- Používá předdefinovanou paletu
- Zahrnuje **logické barvy**, které závisí na kontextu, nikoli na pevných hodnotách RGB

### True Color

- 24bitová barva RGB (`R, G, B`)
- Každý kanál nabývá hodnot `0–255`
- Poskytuje plnou barevnou flexibilitu nezávisle na ACI

## `AcCmColor`

Všechny barvy v `cad-viewer` jsou reprezentovány pomocí třídy `AcCmColor`.

Podporuje:

- index ACI
- true color (RGB)
- logické barevné režimy (ByLayer / ByBlock)

Referenční implementace:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/common/src/AcCmColor.ts>

Tato abstrakce zrcadlí ObjectARX, kde barevný objekt může představovat buď indexovanou barvu, nebo explicitní hodnotu RGB.

## Speciální hodnoty ACI

Na rozdíl od standardních hodnot ACI (`1–255`) představují následující hodnoty **logické barvy**:

### ACI = 0 → ByBlock

- Barva je určena odkazem na blok
- Chování:
  - Před vložením: používá výchozí barvu popředí
  - Po vložení: dědí z kontextu bloku

Nejde o pevnou barvu, ale o dynamický odkaz.

### ACI = 256 → ByLayer

- Barva je zděděna z hladiny entity
- Nejpoužívanější režim v CAD pracovních postupech

Chování:

- Změna barvy hladiny aktualizuje všechny entity používající ByLayer
- Umožňuje centralizovanou správu barev

### ACI = 7 → Adaptivní barva popředí

- Představuje **výchozí barvu popředí**
- Zobrazuje se jako:
  - **Bílá na tmavém pozadí**
  - **Černá na světlém pozadí**

To z ní činí **barvu závislou na kontextu**, nikoli pevnou hodnotu RGB.

V pracovních postupech AutoCADu:

- Při vytvoření nové hladiny je její výchozí barva obvykle **ACI 7**
- To zajišťuje, že nově vytvořená geometrie je vždy viditelná bez ohledu na motiv pozadí

## Rozlišení barev v `AcDbEntity`

Každá entita rozlišuje svou finální zobrazovanou barvu prostřednictvím vlastnosti `resolvedColor`.

Referenční implementace:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/entity/AcDbEntity.ts>


Vlastnost `resolvedColor` určuje finální barvu RGB použitou pro vykreslování. Rozlišení probíhá procesem založeným na prioritě:

- True Color (nejvyšší priorita): Pokud entita explicitně definuje true color, použije se přímo
- Rozlišení ByLayer: Pokud je barva ByLayer (ACI = 256), deleguje se na rozlišenou barvu hladiny
- Rozlišení ByBlock: Pokud je barva ByBlock (ACI = 0), závisí na kontextu vložení bloku a při nedostupnosti kontextu se uchýlí k výchozí barvě
- Rozlišení ACI barvy: Pro standardní hodnoty ACI (`1–255`) se použije předdefinovaná vyhledávací tabulka


## Zpracování ACI 7 v `cad-viewer`

`cad-viewer` považuje ACI 7 za sémantickou barvu, nikoli pevnou hodnotu RGB. Automaticky se přepíná, aby při změně pozadí zachoval kontrast. Jak to funguje? V zásadě takto:

- **Změna pozadí spustí aktualizaci popředí**: Když se změní barva pozadí zobrazení, renderer dostane explicitní pokyn aktualizovat barvu vykreslování „popředí“. Pravidlo je jednoduché:

  - Pokud je pozadí černé, použijte pro ACI 7 bílou.
  - Pokud je pozadí bílé, použijte pro ACI 7 černou.

- **Materiály si pamatují, zda jsou „popředí“**: Při vytváření materiálů jsou označeny metadaty určujícími, zda představují entitu popředí (ACI 7). To systému umožňuje najít *všechny uložené materiály*, které by se měly při změně popředí přepnout.

- **Centralizovaná aktualizace popředí**: Správce stylů rendereru směruje jediný požadavek „change foreground“ do všech správců materiálů (čáry, body, výplně). Každý správce prochází své uložené materiály a aktualizuje pouze ty označené jako popředí.

## Shrnutí

| Typ        | Reprezentace | Strategie rozlišení |
| ----------- | -------------- | ------------------- |
| True Color  | RGB            | Přímá              |
| ACI (1–255) | Index          | Vyhledání v paletě      |
| ByLayer     | 256            | Delegace na hladinu    |
| ByBlock     | 0              | Závislé na kontextu   |
| ACI 7       | 7              | Adaptivní kontrast   |

## Cíle designu

Barevný systém `cad-viewer` je navržen tak, aby:

- odpovídal sémantice ObjectARX
- zachoval chování logických barev (ByLayer / ByBlock)
- zajistil konzistentní vykreslování v prohlížečích
- poskytl správné zpracování adaptivní barvy popředí (ACI 7)

