---
title: "Objektové snapping (OSNAP)"
---

# Objektové snapping (OSNAP)

Tato stránka vysvětluje, jak OSNAP funguje v **cad-viewer** s daty z **realdwg-web**.

## Pozadí

V AutoCADu/ObjectARX může každá entita přepsat `getOsnapPoints(...)` a vrátit kandidátské snap body pro konkrétní režim snappingu.

V `realdwg-web` používáme podobný vzor s `subGetOsnapPoints(...)` na každé třídě entity.  
`cad-viewer` tyto vrácené body spotřebovává a provádí snapping v uživatelském rozhraní.

Reference:
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## Základní API v realdwg-web

Základní definice:
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

Parametry:

- `osnapMode`: jeden režim při každém volání
- `pickPoint`: aktuální světový bod kurzoru
- `lastPoint`: předchozí potvrzený bod v toku příkazu
- `snapPoints`: výstupní pole, do kterého se připojují kandidátské body
- `gsMark` (volitelný): ID podřízené entity, aktuálně důležité pro snapping podřízených entit `INSERT` (`AcDbBlockReference`)

## Podporované režimy OSNAP

Definováno v `AcDbOsnapMode`:
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

Důležité:

- Tyto hodnoty jsou ordinální ID, nikoli bitové příznaky.
- Pro převod masky používejte `acdbOsnapModesToMask(...)` a `acdbMaskToOsnapModes(...)`.

## Aktuální nabídka v uživatelském rozhraní cad-viewer

Stavový řádek (`MlOsnapButton.vue`) aktuálně nabízí:

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

V uživatelském rozhraní zatím nejsou nabízeny (zakomentováno):

- Perpendicular
- Tangent
- Nearest
- Centroid

Výchozí povolená maska v nastavení (`AcApSettingManager`):

- EndPoint + MidPoint + Center

## Běhový tok v cad-simple-viewer

1. `AcEdFloatingInput.getPosition()` volá `getOsnapPoint()`.
2. `getOsnapPoint()` volá `getOsnapPoints()`.
3. `getOsnapPoints()` spouští `view.pick(point, hitRadius)`.
4. Pro každou vybranou položku:
- rozpoznejte entitu v modelovém prostoru podle `item.id`
- pokud existuje `item.children`, zavolejte osnap entity s `gsMark = child.id`
- jinak zavolejte osnap entity bez `gsMark`
5. Pro každý aktivní režim v aktuální masce zavolejte `entity.subGetOsnapPoints(...)`.
6. Vyberte nejbližší vrácený bod ke kurzoru.
7. Aplikujte prahovou hodnotu světové vzdálenosti převedenou ze obrazovkového `hitRadius` (výchozí 20 px).
8. Pokud je bod přijat, přichyťte kurzor a zobrazte značku.

## Přehled implementace entit (z kódu realdwg-web)

- `AcDbLine`: EndPoint, MidPoint, Nearest, Perpendicular (větev `Tangent` existuje, ale bez bodu)
- `AcDbArc`: EndPoint, MidPoint, Nearest, Tangent (větev `Perpendicular` existuje, ale bez bodu)
- `AcDbCircle`: Center, Centroid, Quadrant, Nearest, Tangent
- `AcDbEllipse`: EndPoint (pouze otevřený oblouk), MidPoint (pouze otevřený oblouk), Quadrant (pouze uzavřená elipsa)
- `AcDbPolyline`: EndPoint
- `AcDb2dPolyline`: EndPoint
- `AcDb3dPolyline`: EndPoint
- `AcDbPoint`: Node
- `AcDbText`: Insertion
- `AcDbMText`: Insertion
- `AcDbBlockReference` (`INSERT`): Insertion + delegovaný snapping podřízených entit přes `gsMark`
- Další entity s omezenou podporou:
- `AcDbRay`: EndPoint (základní bod)
- `AcDbFace`: EndPoint (vrcholy)
- `AcDbTrace`: EndPoint (vrcholy)
- `AcDbSpline`: EndPoint

## Logika OSNAP pro INSERT (`AcDbBlockReference`)

`subGetOsnapPoints` má dvě cesty:

1. Režim `Insertion`:
- přímo přidá bod vložení blokové reference (`this._position`)

2. Ostatní režimy:
- funguje pouze tehdy, je-li zadán `gsMark`
- deleguje na `subEntityGetOsnapPoints(...)`

Tok delegace (`subEntityGetOsnapPoints`):

1. Ochrana: pokud `gsMark === this.objectId`, vraťte se (vyhněte se rekurzi)
2. Rozpoznejte entitu pomocí `blockTable.getEntityById(gsMark)`
3. Zavolejte `subGetOsnapPoints(...)` této podřízené entity
4. Transformujte vrácené body pomocí `blockTransform` této blokové reference
5. Připojte transformované body do výstupu

## Proč snapping pro INSERT může selhat (současné chování)

1. Žádný `gsMark`:
- Pro režimy jiné než `Insertion` nevrací `AcDbBlockReference` nic, pokud `gsMark` chybí.

2. Model `gsMark` je zjednodušený:
- Aktuální `gsMark` je ID objektu podřízené entity z prostorových zásahů potomků, nikoli plná sémantika GS markerů AutoCADu.

3. Vykreslování INSERT seskupené podle hladin:
- Vykreslování může rozdělit jeden INSERT do více skupin vykreslování podle hladin se stejným ID rodičovského objektu.
- Výběr se spoléhá na hierarchické boxy potomků při zpětném zjišťování ID podřízených entit.

4. Složité/vnořené/okrajové transformace:
- Delegace aplikuje `blockTransform` aktuálního INSERT.
- Okrajové případy (například scénáře s vnořenými bloky nebo nestandardní případy normály/extruze) mohou stále produkovat nesprávné nebo chybějící snap body.

To odpovídá známé poznámce v plánu vývoje v `README.md`:
- Snapping koncových bodů pro INSERT zatím není plně spolehlivý.

## Známá omezení / TODO

- Pokrytí OSNAP závisí na entitě; mnoho kombinací režimu a entity záměrně zatím není implementováno.
- Snapping INSERT mimo bod vložení závisí na správném šíření zásahu potomka -> `gsMark`.
- Aktuální mechanismus značek je založen na ID objektu a nejde o plné chování GS markerů AutoCADu.
- Je potřeba více regresních testů pro INSERT, zejména pro vnořené bloky a transformované bloky.

## Doporučený směr přispívání

- Zlepšit robustnost mapování zásahu potomka na `gsMark` pro INSERT.
- Přidat regresní testy vnořených bloků pro případy EndPoint/MidPoint/Center/Nearest/Tangent.
- Postupně rozšiřovat pokrytí režimů pro jednotlivé entity.
- Pokud je to proveditelné, přiblížit model značek sémantice GS markerů AutoCADu.
