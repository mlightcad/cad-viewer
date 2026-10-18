---
title: Popis funkce skriptů
---

# Popis funkce skriptů

Funkce skriptů slouží ke spouštění vlastního JavaScriptového kódu ve výkresu a umožňuje provádět dotazy, statistiky, hromadné úpravy a zvýraznění výběru. Skripty komunikují s výkresem prostřednictvím objektu `cad`, není potřeba připojovat externí model ani konfigurovat API klíč.

Funkce skriptů je poskytována pluginem `@mlightcad/cad-script-plugin`. Panel skriptů je k dispozici pouze po načtení tohoto pluginu ve vaší aplikaci.

## Otevření panelu skriptů

- Do příkazového řádku zadejte `cadscript` a stiskněte Enter
- Nebo v panelu nástrojů klikněte na záložku „Skript“

Panel skriptů obsahuje:
- **Editor skriptů**: psaní těla JavaScriptové funkce
- **Tlačítko Spustit**: spuštění skriptu (klávesová zkratka `Ctrl+Enter`)
- **Tlačítko API**: zobrazení/skrytí reference API
- **Oblast výsledků**: zobrazuje návratovou hodnotu, logy, chybová hlášení a změny entit

## Způsob spuštění skriptu

Skript běží v přísném režimu a je automaticky obalen funkcí:

```javascript
function __cadScript(cad) {
  // Sem pište svůj kód
}
```

Jediným parametrem funkce je `cad`, prostřednictvím kterého přistupujete k datům výkresu a provádíte operace.

## Omezení

- Skript má časový a krokový limit, při překročení času nebo počtu kroků se automaticky zastaví
- Je zakázán přístup ke globálním objektům stránky (`window`, `document`, `fetch` atd.)
- Je zakázána syntaxe `import` / `export` / `this` atd.
- Návratová hodnota musí být serializovatelná do JSON
- Editační operace musí být provedeny uvnitř `cad.edit.transaction` a výkres musí být v editovatelném stavu

## Uložení konceptu

Obsah editoru se automaticky ukládá do místního úložiště prohlížeče, po obnovení stránky se obnoví naposledy upravovaný skript.
