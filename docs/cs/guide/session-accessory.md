---
title: Příslušenství relace
---

# Příslušenství relace

**Příslušenství relace** je malá skupina ovládacích prvků, která se dynamicky připojuje k uživatelskému rozhraní v určitých chvílích a poskytuje uživateli další vstupní body pro operace. Její hlavní vlastností je, že se **zobrazuje pouze v případě potřeby a poté automaticky zmizí**.

Příslušenství relace se především používá ve dvou situacích:

- **Na mobilu**: Mobil nemá pás karet (Ribbon) jako plocha, takže mnoho voleb příkazů, které na pásu jsou, nelze přímo zobrazit. Příslušenství relace přináší tyto volby k uživateli během provádění příkazu nebo při výběru objektů.
- **V prostředích bez pásu karet**: Některá vestavěná nebo lehká prostředí nesoučástí komponentu pásu karet a příslušenství relace může v nich sloužit jako doplňkové uživatelské rozhraní.

Existují dva druhy příslušenství relace —— **příslušenství relace příkazu** a **příslušenství relace výběru**.

## Příslušenství relace příkazu

Příslušenství relace příkazu je **připojeno příkazem během jeho provádění** a poskytuje další ovládací prvky specifické pro daný příkaz. Jakmile příkaz skončí nebo je zrušen, příslušenství se automaticky skryje.

Kanonickým příkladem je **příslušenství stylu kresby**, které připojují příkazy měření a poznámek —— během měření nebo přidávání poznámek se v prvním řádku panelu relace objeví tlačítka pro barvu a výšku textu, takže uživatel může upravovat vzhled během práce, aniž by musel přerušit příkaz a hledat to na pásu karet.

V ukázce níže je červeně zvýrazněná oblast příslušenství relace příkazu:

<MobileSessionPanel highlightAccessory />

> ⚠️ Ne každý příkaz připojuje příslušenství relace příkazu. Jednoduché kreslicí příkazy jako Čára nebo Kruh nemají žádné další volby k vystavení, takže se žádné příslušenství neobjeví. V takovém případě se v levé části prvního řádku panelu zobrazí přímo text výzvy příkazu.

## Příslušenství relace výběru

Příslušenství relace výběru se objeví **při výběru jednoho nebo více grafických objektů** a je připevněno k levé straně **lišty zkratek (Shortcut Toolbar)**, odděleno svislým oddělovačem od tlačítek rychlých akcí vpravo. Při zrušení výběru příslušenství relace výběru automaticky zmizí.

Úloha příslušenství relace výběru je podobná příslušenství relace příkazu —— poskytuje kontextové vstupní body pro vybrané objekty. Například při výběru textu poznámky může příslušenství relace výběru zobrazit ovládací prvky pro nastavení barvy a výšky textu.

V ukázce níže je červeně zvýrazněná oblast příslušenství relace výběru. Oddělovač a skupina kruhových tlačítek vpravo patří samotné liště zkratek:

<ShortcutToolbar highlightAccessory />

## Porovnání druhů příslušenství relace

| Vlastnost | Příslušenství relace příkazu | Příslušenství relace výběru |
|---|---|---|
| **Kdy se objeví** | Během provádění příkazu | Při výběru jednoho nebo více objektů |
| **Kde je připojeno** | Mobil: první řádek panelu relace<br/>bez pásu: oblast UI příkazu | Levá strana lišty zkratek |
| **Kdy zmizí** | Příkaz skončí nebo je zrušen | Výběr je zrušen |
| **Typické ovládací prvky** | Barva, výška textu, další volby příkazu | Barva, výška textu, editor vlastností objektu |
| **Vždy přítomné?** | Ne, záleží na příkazu | Ne, záleží na typu vybraného objektu |

## Vztah k pásu karet na ploše

Na ploše jsou volby související s příkazy obvykle seskupeny v "kontextových kartách" na pásu karet —— když se stane nějaký příkaz aktivním, pás automaticky přepne na kartu odpovídající tomuto příkazu. Příslušenství relace je v podstatě **lehkou náhradou za kontextové karty na mobilu / v prostředích bez pásu karet**:

| Plocha | Mobil / bez pásu |
|---|---|
| Kontextová karta pásu | Příslušenství relace příkazu (uvnitř panelu relace) |
| Panel vlastností objektu na běžné kartě | Příslušenství relace výběru (uvnitř lišty zkratek) |
