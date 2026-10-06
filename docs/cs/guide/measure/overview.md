---
title: Přehled měření
---

# Přehled měření

Měřicí příkazy slouží k dočasnému měření na výkresu. Všechny výsledky měření se zobrazují jako překryvná vrstva HTML, **nezapisují se do souboru DWG/DXF**, lze je nezávisle exportovat a sdílet.

## Vytvoření měření

Po výběru příkazu postupujte podle pokynů a klepejte na požadované body. Během tažení se zobrazuje náhled v reálném čase (pryžové vlákno + odznak měřené hodnoty).

## Úprava měření

- **Jedno klepnutí** na měřený objekt jej vybere a zobrazí úchopové body
- **Tažením úchopových bodů** upravte měření, hodnota se aktualizuje v reálném čase

## Zpět / znovu

Operace měření podporují zpět a znovu.

## Jednotky a přesnost

Zobrazovací jednotky a přesnost měřených hodnot lze upravit v nastavení, podporuje mm / cm / m / ft / in atd. Tato nastavení neovlivňují původní soubor DWG/DXF, pouze zobrazení měření.

## Import / export

Data měření lze exportovat do doprovodného souboru JSON (`název_výkresu.measurement.json`), což usnadňuje sdílení napříč výkresy a zařízeními. Při importu se automaticky obnoví všechny měřené objekty včetně jejich stylů.
