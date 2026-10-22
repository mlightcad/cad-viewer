---
title: "Ladění se změnami ve více repozitářích"
---

# Ladění se změnami ve více repozitářích

Repozitář `cad-viewer` závisí na balíčcích z jiných repozitářů MLight, například:

- Repo **`cad-viewer`**
  - balíček: `@mlightcad/cad-simple-viewer`
- Repo **`realdwg-web`**
  - balíčky: `@mlightcad/data-model`, `@mlightcad/libredwg-converter`
- Repo **`mtext-renderer`**
  - balíčky: `@mlightcad/mtext-renderer`, `@mlightcad/mtext-input-box`, `@mlightcad/mtext-parser`

Příklad řetězce závislostí:

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

Během vývoje mohou existovat chyby v `realdwg-web` nebo `mtext-renderer`, které je nutné okamžitě opravit a otestovat uvnitř `cad-viewer`.

## Problém s `pnpm link`

Používání `pnpm link` napříč více monorepozitáři přináší několik problémů:

- Složité nastavení a zrušení
- Snadno zapomenete kroky pro odlinkování
- Stav `node_modules` je obtížné rozumně vysvětlit
- Narušuje CI / reprodukovatelnost
- Pro nové vývojáře je obtížné to sledovat

Pro zjednodušení lokálního ladění používáme přístup **závislosti na lokální adresář** s pnpm overrides.

## Řešení: Použití závislostí na lokální adresář s pnpm overrides

Namísto publikování nebo linkování balíčků dočasně změníme `overrides` v `pnpm-workspace.yaml` tak, aby přímo odkazovaly na cestu v lokálním souborovém systému k balíčkům v jiných repozitářích.

Centralizovaná správa verzí žije v `pnpm-workspace.yaml`:

- Publikované semver rozsahy (například `^1.8.3`) jsou zdrojem pravdy pro vydání
- `pnpm sync:versions` přenáší tyto hodnoty do každého `packages/*/package.json`
- CI a skript pro vydání spouštějí `pnpm sync:versions:check`, aby zajistily, že vše zůstává sladěné

Pro krátkodobé ladění nahraďte semver override cestou `file:`. Tento přístup:

✅ Funguje přirozeně s `pnpm`  
✅ Nevyžaduje žádné globální linkování  
✅ Je explicitní a snadno vratný  
✅ Je vhodný pro krátkodobé ladění  
✅ Udržuje předvídatelné rozlišení závislostí  
✅ Platí pro všechny balíčky v monorepu

## Rozvržení adresářů (doporučeno)

Umístěte repozitáře vedle sebe:

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ Toto rozvržení **není povinné**, ale relativní cesty bude snazší spravovat.

## Podrobný postup

### 1. Přidejte lokální `file:` overrides do `pnpm-workspace.yaml`

V `cad-viewer/pnpm-workspace.yaml` dočasně nahraďte semver položky, které chcete ladit, lokálními cestami.

Běžné (publikované) overrides vypadají takto:

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

Pro lokální ladění změňte pouze balíčky, které potřebujete testovat:

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> Upravte relativní cesty, pokud máte jinou strukturu adresářů.  
> **Nevkládejte** overrides do kořenového `package.json`; patří do `pnpm-workspace.yaml`.

### 2. Nainstalujte závislosti

Z **kořene `cad-viewer`**:

```
pnpm install
```

pnpm provede:

- Rozlišení přepsaných balíčků z lokálních adresářů
- Vytvoření symlinků uvnitř `node_modules`
- Jejich sledování jako závislostí založených na souborech

### 3. Sestavte závislosti (pokud je potřeba)

Pokud upstream balíček vyžaduje krok sestavení (TypeScript, bundlování atd.):

```
cd ../realdwg-web
pnpm install
pnpm build
```

Pro aktivní vývoj můžete také spustit:

```
pnpm dev
```

nebo režim sledování, pokud je podporován. Stejné kroky opakujte v `mtext-renderer`, když ladíte balíčky z tohoto repozitáře.

### 4. Ladění jako obvykle

Nyní můžete:

- Upravovat kód v upstream repozitáři (například `realdwg-web/packages/data-model`)
- Znovu sestavit (nebo nechat režim sledování sestavit)
- Okamžitě testovat změny v `cad-viewer`

Žádné linkování, žádné publikování, žádná reinstalace.

## Návrat k publikovaným balíčkům

Po dokončení ladění:

1. Obnovte semver overrides v `cad-viewer/pnpm-workspace.yaml` (odeberte všechny cesty `file:`).
2. Synchronizujte verze závislostí do balíčků workspace:

```
pnpm sync:versions
```

3. Znovu nainstalujte závislosti:

```
pnpm install
```

4. Commitujte všechny změny `package.json` vytvořené pomocí `pnpm sync:versions` spolu s obnoveným `pnpm-workspace.yaml`.

To zajišťuje:

- Konzistenci CI
- Čistý graf závislostí
- Žádné omylem commitnuté lokální cesty

## Synchronizace verzí před vydáním nebo PR

Před otevřením PR nebo spuštěním vydání se ujistěte, že jsou verze závislostí sladěné:

```
pnpm sync:versions
```

Tento příkaz načte `overrides` z `pnpm-workspace.yaml` a aktualizuje odpovídající položky v každém `packages/*/package.json`.

Pro ověření bez zápisu souborů:

```
pnpm sync:versions:check
```

Skript pro vydání (`pnpm release`) i CI spouštějí kontrolu automaticky. Pokud jsou verze nesynchronizované, opravte je pomocí `pnpm sync:versions`, commitněte a zkuste to znovu.

Typický pracovní postup při navýšení externí závislosti:

1. Aktualizujte semver v `overrides` v `pnpm-workspace.yaml`
2. Spusťte `pnpm sync:versions`
3. Spusťte `pnpm install`
4. Otestujte, commitněte a otevřete PR

## ⚠️ Důležité poznámky

### Nekomitujte lokální cesty

Lokální overrides `file:` jsou **pouze pro vývojáře**.

Před commitnutím:

- Ujistěte se, že `pnpm-workspace.yaml` **neobsahuje** cesty `file:`
- Spusťte `pnpm sync:versions`, aby každý `package.json` odpovídal publikovaným semver overrides
- Pro PR a vydání používejte publikované verze

### Kdy tento přístup použít

✅ Oprava chyb napříč repozitáři  
✅ Ladění problémů s integrací  
✅ Rychlá iterace bez publikování  
❌ Dlouhodobá správa závislostí  
❌ CI / produkční sestavení

## Srovnání: `pnpm link` vs lokální cesta s pnpm overrides

| Aspekt           | pnpm link | Lokální cesta s pnpm overrides |
| ---------------- | --------- | ------------------------------- |
| Složitost nastavení | Vysoká      | Nízká                             |
| Explicitnost     | Implicitní  | Explicitní                        |
| Snadný návrat    | ❌         | ✅                               |
| Bezpečné pro CI  | ❌         | ❌ (pouze pro vývoj)                    |
| Vhodné pro tým   | ❌         | ✅                               |

## Shrnutí

Pro ladění problémů, které zasahují **`cad-viewer`** a upstream repozitáře, jako **`realdwg-web`** nebo **`mtext-renderer`**, dočasně použijte **`file:` overrides v `pnpm-workspace.yaml`**.

Je to:

- Jednoduché
- Transparentní
- Snadno naučitelné
- Snadno vratné
- Platí pro všechny balíčky v monorepu

Až ladění dokončíte — nebo před jakýmkoli vydáním — obnovte semver overrides, spusťte **`pnpm sync:versions`** a commitněte synchronizované soubory `package.json`.
