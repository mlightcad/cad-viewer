---
title: "Vlastní hostování fontů a šablon"
---

# Vlastní hostování fontů a šablon

Tato příručka vysvětluje, jak nasadit fonty a šablony DWG/DXF na vlastním serveru.

## Přehled

**CAD prohlížeč** očekává určitou strukturu adresářů pro načítání fontů a šablon. Dodržením této struktury můžete hostovat vlastní fonty a šablony namísto používání [výchozího serveru na GitHubu](https://github.com/mlightcad/cad-data/).

Funkční příklad pro Next.js, který poskytuje fonty a šablony z místní kopie projektu [cad-data](https://github.com/mlightcad/cad-data) (git submodule) a nastavuje `baseUrl` jak pro živý prohlížeč, tak pro headless CLI, naleznete v projektu [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo).

## Struktura adresářů

Váš server by měl dodržovat stejnou strukturu jako [repozitář mlightcad/cad-data](https://github.com/mlightcad/cad-data):

```
your-base-url/
├── fonts/                    # Font files directory
│   ├── arial.ttf
│   ├── simkai.ttf
│   ├── custom-font.shx
│   └── ...
├── templates/                # DWG/DXF template files directory
│   ├── acadiso.dxf
│   ├── custom-template.dwg
│   └── ...
└── fonts.json               # Font metadata configuration file
```

## Konfigurace

### Nastavení základní adresy URL

Nakonfigurujte vlastnost `baseUrl` ve své aplikaci tak, aby ukazovala na váš server:

#### V komponentě Vue
```vue
<template>
  <MlCadViewer 
    locale="en" 
    :base-url="'https://your-server.com/cad-data/'"
  />
</template>
```

#### V TypeScript/JavaScript
```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Set the base URL for resource loading
AcApDocManager.instance.baseUrl = 'https://your-server.com/cad-data/'
```

#### V cad-simple-viewer-cli (headless CLI)

> **Dostupné od verze `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-simple-viewer-cli` 1.7.2.**

Pokud spouštíte headless CLI proti serveru s vlastními fonty a šablonami, musíte předat svou základní adresu URL. Jinak CLI nadále používá výchozí CDN adresu `cad-data` a nenačte fonty ani šablony z vašeho serveru.

**Příkazový řádek** (`--base-url`):

```bash
cad-simple-viewer-cli \
  -i ./drawing.dwg \
  -s ./export-png.scr \
  -o ./out \
  --base-url https://your-server.com/cad-data/
```

**Programové API** (`runHeadless`):

```typescript
import { runHeadless } from '@mlightcad/cad-simple-viewer-cli'

await runHeadless({
  inputPath: './drawing.dwg',
  scriptPath: './export-png.scr',
  outputDir: './out',
  baseUrl: 'https://your-server.com/cad-data/'
})
```

Fonty se načítají z `<base-url>/fonts/` (například `https://your-server.com/cad-data/fonts/`). Adresa URL musí používat protokol `http` nebo `https`.

### Výchozí chování

Pokud není zadáno `baseUrl`, prohlížeč používá výchozí adresu URL: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

## Správa fontů

### Adresář fontů

Umístěte všechny soubory fontů do adresáře `fonts/`. Podporované formáty fontů zahrnují:
- **TTF** (TrueType Font) – soubory `.ttf`
- **SHX** (AutoCAD Shape Font) – soubory `.shx`
- **OTF** (OpenType Font) – soubory `.otf`

### Konfigurace fonts.json

Soubor `fonts.json` je pole JSON obsahující metadata pro každý dostupný font. Tento soubor musí být umístěn v kořeni vaší základní adresy URL.

#### Struktura souboru

```json
[
  {
    "name": ["Arial"],
    "file": "arial.ttf",
    "type": "mesh",
    "description": "Standard Arial font for text rendering"
  },
  {
    "name": ["SimKai"],
    "file": "simkai.ttf", 
    "type": "mesh",
    "description": "Chinese Kai font for CJK text support"
  },
  {
    "name": ["Custom SHX Font"],
    "file": "custom.shx",
    "type": "shx",
    "description": "Custom AutoCAD shape font",
    "encoding": "gbk"
  }
]
```

#### Popis polí

| Pole | Typ | Povinné | Popis |
|-------|------|----------|-------------|
| `name` | pole řetězců | Ano | Název fontu používaný v souborech DWG/DXF. Jeden font může mít více názvů. |
| `file` | řetězec | Ano | Název souboru fontu umístěného v adresáři `fonts/`. Musí přesně odpovídat. |
| `type` | řetězec | Ano | Typ/formát fontu. Běžné hodnoty: `"mesh"` a `"shx"`. Hodnota `"mesh"` označuje fonty `"ttf"`, `"otf"` a `"woff"`. |
| `description` | řetězec | Ne | Volitelný popis účelu nebo vlastností fontu. |
| `encoding` | řetězec | Ne | Volitelný popis kódování fontu, které může být jednou z hodnot dostupných ve vlastnosti [TextDecoder: encoding property](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding). Tato vlastnost je nutná pouze v případě, že jde o [shx big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-CDAF6EAF-85D1-48FC-9A78-43514E0132D5) nebo [shx extended big font](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-00ED0CC6-A4BE-4591-93FA-598CC40AA43D). |

### Přidání nových fontů

Chcete-li na server přidat nový font:

1. **Nahrajte soubor fontu** do adresáře `fonts/`
2. **Aktualizujte `fonts.json`** přidáním nového záznamu:

```json
[
  // ... existing fonts ...
  {
    "name": "My Custom Font",
    "file": "my-custom-font.ttf",
    "type": "mesh",
    "description": "Custom font for specific project needs"
  }
]
```

3. **Otestujte načítání fontu** ve své aplikaci:

```typescript
// Load the new font
await AcApDocManager.instance.loadFonts(['My Custom Font'])

// Or load default fonts (includes your new font if it's in the list)
await AcApDocManager.instance.loadDefaultFonts()
```

## Správa šablon

### Adresář šablon

Umístěte soubory šablon DWG a DXF do adresáře `templates/`. Tyto šablony se používají při vytváření nových dokumentů.

### Výchozí šablona

Knihovna očekává výchozí šablonu s názvem `acadiso.dxf` v adresáři `templates/`. Tuto šablonu používá příkaz „Quick New“ (`AcApQNewCmd`).

### Přidání vlastních šablon

1. **Nahrajte soubory šablon** do adresáře `templates/`
2. **Odkazujte na šablony** ve své aplikaci:

```typescript
// Open a custom template
const templateUrl = AcApDocManager.instance.baseUrl + 'templates/my-custom-template.dxf'
await AcApDocManager.instance.openUrl(templateUrl)
```

## Požadavky na server

### Konfigurace CORS

Zajistěte, aby váš server povoloval požadavky z jiných domén, aby CAD Viewer mohl načítat prostředky:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### MIME typy

Nakonfigurujte server tak, aby poskytoval soubory fontů se správnými MIME typy:

- `.ttf` → `font/ttf`
- `.otf` → `font/otf` 
- `.shx` → `application/octet-stream`
- `.dwg` → `application/dwg`
- `.dxf` → `application/dxf`

### Příklad konfigurace Nginx

```nginx
location /cad-data/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    location ~* \.(ttf|otf|shx)$ {
        add_header Content-Type font/ttf;
    }
    
    location ~* \.(dwg|dxf)$ {
        add_header Content-Type application/octet-stream;
    }
}
```

## Zpracování chyb

Knihovna poskytuje obslužné rutiny událostí pro problémy s načítáním fontů:

```typescript
import { eventBus } from '@mlightcad/cad-simple-viewer'

// Handle fonts that cannot be found
eventBus.on('fonts-not-found', (params) => {
  console.warn('Fonts not found:', params.fonts)
  // Implement fallback logic or user notification
})

// Handle fonts that fail to load
eventBus.on('fonts-not-loaded', (params) => {
  console.error('Fonts failed to load:', params.fonts)
  // Implement error handling or user notification
})
```

## Osvědčené postupy

1. **Verzování**: Uchovávejte soubor `fonts.json` ve verzovacím systému, abyste mohli sledovat přidání a změny fontů
2. **Optimalizace fontů**: Pokud je to možné, používejte komprimované formáty fontů (`woff`) pro zkrácení doby načítání
3. **Testování**: Testujte načítání fontů s různými CAD soubory pro ověření kompatibility
4. **Dokumentace**: Dokumentujte vlastní fonty a šablony pro členy týmu

## Řešení potíží

### Běžné problémy

1. **Fonty se nenačítají**: Zkontrolujte, zda je `fonts.json` dostupný na adrese `{baseUrl}/fonts.json`
2. **Chyby CORS**: Ujistěte se, že váš server povoluje požadavky z jiných domén
3. **Chyby 404**: Ověřte, zda cesty k souborům v `fonts.json` odpovídají skutečným názvům souborů
4. **Problémy s MIME typy**: Nakonfigurujte server tak, aby poskytoval fonty se správnými MIME typy

### Ladění

Zapněte nástroje pro vývojáře v prohlížeči ke sledování síťových požadavků a zkontrolujte:
- úspěšné načtení `fonts.json`
- stahování souborů fontů
- hlavičky CORS
- stavové kódy HTTP

## Příklad implementace

Zde je kompletní příklad nastavení serveru s vlastními fonty a šablonami:

```typescript
// Initialize the CAD viewer with custom base URL
const docManager = AcApDocManager.createInstance(canvas)
docManager.baseUrl = 'https://my-cdn.com/cad-resources/'

// Load custom fonts
await docManager.loadDefaultFonts(['Arial', 'My Custom Font'])

// Open a document from a custom template
await docManager.openUrl(docManager.baseUrl + 'templates/custom-template.dxf')
```

Toto nastavení vám umožňuje plně přizpůsobit fonty a šablony dostupné vaší aplikaci při zachování kompatibility s očekávanou strukturou.

