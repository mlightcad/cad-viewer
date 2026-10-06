---
title: Pomocné zobrazení
---

# Pomocné zobrazení

Pomocné zobrazení vám pomůže přesněji určovat body, směry a objekty.

## Object snap (OSNAP)

Object snap automaticky přichytí kurzor k dostupným bodům, když se k nim přiblíží, a zobrazí značku přichycení.

Podporované režimy přichycení:

| Režim | Značka | Popis |
|---|---|---|
| EndPoint | obdélník | koncový bod úsečky |
| MidPoint | trojúhelník | střed úsečky |
| Center | kruh | střed kruhu/kruhového oblouku/elipsy |
| Quadrant | kosočtverec | čtyři kvadrantové body kruhu |
| Nearest | kříž | bod nejbližší ke kurzoru |
| Intersection | × | průsečík dvou úseček |

OSNAP lze rychle zapnout/vypnout na stavovém řádku, klepnutím otevřete podrobný konfigurační panel pro výběr aktivních režimů přichycení.

## Ortogonální režim (ORTHO)

Po zapnutí omezí následující úsečku pouze na vodorovný nebo svislý směr. Vhodné pro kreslení osově zarovnaných obdélníků, rovnostranných trojúhelníků atd.

- Klávesová zkratka: `F8` (pokud je podporována)
- Přepínač na stavovém řádku

## Polar tracking (POLAR)

Po zapnutí se kurzor automaticky zarovná podél nastaveného úhlového přírůstku. Výchozí úhlový přírůstek je 90°, lze vybrat 5°, 10°, 15°, 18°, 22,5°, 30°, 45° nebo 90°.

Polar a ortogonální režim se vzájemně vylučují: zapnutí ortogonálního režimu automaticky vypne polar a naopak.

## Dynamický vstup (DYN)

Zobrazí plovoucí vstupní pole poblíž kurzoru. Během provádění příkazu lze hodnoty (vzdálenost, úhel atd.) zadávat přímo do vstupního pole, aniž byste museli obsluhovat příkazový řádek.

## Náhled pryžového vlákna

Téměř všechny kresební příkazy při pohybu kurzoru zobrazují dočasné náhledové úsečce (pryžové vlákno) od „předchozího bodu" k „aktuálnímu kurzoru", což pomáhá odhadnout směr a délku.
