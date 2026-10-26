---
title: "Integrace komponenty Vue"
---

# Integrace komponenty Vue

**cad-viewer** je **vysoce výkonná** komponenta Vue 3 pro prohlížení a úpravy CAD souborů (DXF, DWG) **zcela v prohlížeči bez nutnosti jakéhokoli backendového serveru**. Poskytuje moderní uživatelské rozhraní, správu stavu a bezproblémovou integraci s optimalizovanými vykreslovacími enginy pro plynulé CAD pracovní postupy v prohlížeči s výjimečným výkonem.

## Klíčové vlastnosti

- **Vysoce výkonné** prohlížení a úpravy CAD s plynulým vykreslováním 60+ FPS
- **Není vyžadován backend** – soubory jsou parsovány a zpracovány zcela v prohlížeči
- **Zvýšená bezpečnost dat** – soubory nikdy neopustí vaše zařízení, což zajišťuje kompletní soukromí
- **Podpora místních souborů** – načítání souborů DWG/DXF přímo z počítače pomocí dialogu pro výběr souboru nebo přetažením
- **Podpora vzdálených souborů** – automatické načítání CAD souborů z adres URL
- **Snadná integrace** – pro integraci třetích stran není potřeba nastavení serveru ani backendové infrastruktury
- **Přizpůsobitelné UI** – ovládání viditelnosti panelů nástrojů, příkazového řádku, souřadnic a statistik výkonu
- **Přizpůsobitelné prostředky** – nastavení vlastních základních adres URL pro fonty, šablony a ukázkové soubory
- Moderní UI optimalizované pro práci s velkými CAD soubory
- Správa stavu hladin, entit a nastavení
- Integrace s optimalizovanými renderery SVG a THREE.js
- Dialogy, panely nástrojů a příkazové rozhraní
- Komponenta Vue 3 pro vložení vysoce výkonných CAD prohlížečů do vašich aplikací

## Kdy byste měli zvolit cad-viewer?

Použijte `cad-viewer`, pokud chcete **komponentu Vue 3 připravenou k použití** pro prohlížení a úpravy CAD souborů s moderním UI, dialogy, panely nástrojů a správou stavu. Tento balíček je ideální, pokud:

- Chcete rychle vložit vysoce výkonný prohlížeč/editor CAD do své aplikace Vue s minimálním nastavením.
- Potřebujete podporu načítání místních souborů (z počítače uživatele) i vzdálených souborů (z adres URL).
- Potřebujete řešení, které zvládá načítání souborů, vykreslování, správu hladin/entit a uživatelské interakce ihned po instalaci.
- Chcete bezproblémovou integraci s optimalizovanými renderery SVG a THREE.js, internacionalizací a motivy.
- **Nechcete** vytvářet vlastní UI od nuly.

**Doporučeno pro:** většinu webových aplikací, dashboardů nebo platforem, které potřebují zobrazovat CAD soubory s propracovaným uživatelským rozhraním.

## Architektura fungující pouze v prohlížeči

Tato komponenta Vue 3 pracuje zcela v prohlížeči a **nevyžaduje žádný backend**. Soubory DWG/DXF jsou zpracovávány lokálně pomocí WebAssembly a JavaScriptu, což poskytuje:

- **Nulové požadavky na server** – komponentu lze nasadit kdekoli pouze pomocí statického hostingu
- **Kompletní soukromí dat** – CAD soubory nikdy neopustí zařízení uživatele, ať už jsou načteny lokálně nebo z adres URL
- **Podpora místních souborů** – uživatelé mohou načítat soubory přímo z počítače pomocí vestavěného dialogu pro výběr souboru
- **Podpora vzdálených souborů** – automatické načítání souborů z adres URL, pokud jsou zadány
- **Okamžitá integrace** – není potřeba složité nastavení backendu ani konfigurace API
- **Funkčnost offline** – po načtení funguje bez připojení k internetu
- **Přátelský k třetím stranám** – snadné vložení do jakékoli aplikace Vue 3 bez starostí o serverovou část

## Způsoby načítání souborů

Komponenta MlCadViewer podporuje několik způsobů načítání CAD souborů:

### 1. Načítání místních souborů
Uživatelé mohou načítat soubory přímo ze svého počítače:
- **Dialog pro výběr souboru**: Klikněte na hlavní nabídku (☰) a vyberte „Otevřít“ pro procházení a výběr místních souborů DWG/DXF
- **Přetažení**: Přetáhněte CAD soubory přímo do prohlížeče (pokud je tato funkce ve vaší aplikaci implementována)
- **Vstup pro soubor**: Použijte vestavěnou komponentu pro čtení souborů pro programový výběr souboru
- **Prop komponenty**: Předejte objekt `File` přímo do prop `localFile` pro automatické načtení

#### Příklad: Použití prop localFile se vstupem pro soubor
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. Načítání vzdálených souborů
Automatické načítání souborů z adres URL:
- **Prop URL**: Zadejte prop `url` pro automatické načtení souboru při připojení komponenty
- **Dynamické načítání**: Změňte prop `url` pro načtení jiného souboru bez opětovného připojení komponenty

### 3. Podporované formáty souborů
- **Soubory DWG**: Binární formát výkresu AutoCAD (čtený jako ArrayBuffer)
- **Soubory DXF**: ASCII/binární výměnný formát výkresu AutoCAD (čtený jako text)

## Instalace

```bash
npm install @mlightcad/cad-viewer
```

## Použití

Jako příklad použijte dílčí balíček `cad-editor-demo`.

### Základní použití

Nejprve přidejte následující závislosti do souboru package.json.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

Poté vytvořte komponentu Vue následujícím způsobem.

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## Komponenta MlCadViewer

`MlCadViewer` je hlavní komponenta Vue 3, která poskytuje kompletní rozhraní pro prohlížení a úpravy CAD. Obsahuje panely nástrojů, správu hladin, příkazový řádek, stavový řádek a různé dialogy pro plnohodnotný zážitek z práce s CAD.

### Vlastnosti komponenty (Props)

Komponenta `MlCadViewer` přijímá následující props:

| Vlastnost            | Typ                        | Výchozí     | Popis                                                                                                                                              |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | `'en' | 'zh' | 'default'` | `'default'` | Jazyk UI. Hodnota `'default'` používá jazyk prohlížeče. Ovlivňuje UI prohlížeče i komponenty Element Plus.                                              |
| `url`               | `string`                    | `undefined` | Vzdálená adresa URL CAD souboru (DWG/DXF). Pokud je zadána, soubor se při připojení automaticky stáhne a otevře. Aktualizace tohoto prop znovu dynamicky načte soubor. |
| `localFile`         | `File`                      | `undefined` | Místní CAD soubor jako objekt `File`. Automaticky se otevře při připojení a znovu načte při změně. **Má přednost před `url`**, pokud jsou zadány oba.        |
| `background`        | `number`                    | `undefined` | Barva pozadí zobrazení CAD jako 24bitová hexadecimální hodnota RGB (např. `0x000000`). Při změně se dynamicky aktualizuje.                                  |
| `baseUrl`           | `string`                    | `undefined` | Základní adresa URL používaná pro načítání externích prostředků, jako jsou fonty, šablony a ukázkové soubory. Hodí se při hostování prostředků na CDN.                               |
| `useMainThreadDraw` | `boolean`                   | `false`     | Řídí režim vykreslování. Hodnota `false` používá Web Workers (doporučeno pro velké výkresy). Hodnota `true` vynucuje vykreslování v hlavním vlákně.                          |
| `theme`             | `'light' | 'dark'`         | `'dark'`    | Počáteční motiv prohlížeče. Lze dynamicky měnit pro přepínání mezi tmavým a světlým režimem.      

### Události komponenty

`MlCadViewer` vysílá události životního cyklu, aby se nadřazené komponenty mohly napojit na vytvoření a zničení prohlížeče.

| Událost     | Datová zátěž | Popis                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `create`  | `void`  | Vyslána po úplné inicializaci CAD prohlížeče, který je připraven k použití.          |
| `destroy` | `void`  | Vyslána těsně před zničením CAD prohlížeče a uvolněním interních prostředků. |

### Nastavení UI

`MlCadViewer` načítá viditelnost svého UI z globálního `AcApSettingManager` (poskytovaného balíčkem `@mlightcad/cad-simple-viewer`). Nakonfigurujte tyto příznaky kdekoli před vykreslením prohlížeče pro přizpůsobení UI.

| Nastavení                  | Typ      | Výchozí | Popis                                                                |
| ------------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `isShowToolbar`          | `boolean` | `true`  | Řídí viditelnost hlavního panelu nástrojů                                |
| `isShowMainMenu`         | `boolean` | `true`  | Řídí viditelnost hlavní nabídky                                   |
| `isShowCommandLine`      | `boolean` | `true`  | Řídí viditelnost příkazového rozhraní                      |
| `isShowCoordinate`       | `boolean` | `true`  | Řídí viditelnost zobrazení souřadnic                          |
| `isShowEntityInfo`       | `boolean` | `true`  | Řídí viditelnost karty informací o entitě                     |
| `isShowFileName`         | `boolean` | `true`  | Řídí, zda se zobrazuje název aktuálně otevřeného souboru               |
| `isShowLanguageSelector` | `boolean` | `true`  | Řídí viditelnost přepínače jazyka                           |
| `isShowStats`            | `boolean` | `false` | Řídí viditelnost statistik výkonu (FPS, doba vykreslování atd.)

#### Příklad (doporučeno)
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### Poznámky

- Nastavení jsou globální a `MlCadViewer` je okamžitě zohledňuje.
- Můžete je měnit za běhu pomocí stejné reference `AcApSettingManager.instance`.

### Konfigurace základní adresy URL

Vlastnost `baseUrl` umožňuje přizpůsobit, odkud CAD prohlížeč načítá fonty, šablony a ukázkové soubory. To je užitečné zejména pro:

- **Vlastní hostování prostředků**: hostování vlastních fontů a šablon na vašem CDN nebo serveru
- **Podniková prostředí**: použití interních serverů pro CAD prostředky
- **Offline nasazení**: poskytování prostředků z místních souborových systémů
- **Vlastní branding**: použití vlastních šablon a fontů

#### Výchozí chování
Pokud není zadáno `baseUrl`, prohlížeč používá výchozí adresu URL: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`

#### Struktura prostředků
Při použití vlastního `baseUrl` zajistěte, aby váš server měl následující strukturu:
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### Příklad: Vlastní základní adresa URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

Tato konfigurace provede:
- Načtení fontů z `https://my-company.com/cad-resources/fonts/`
- Načtení šablon z `https://my-company.com/cad-resources/templates/`
- Použití vlastní základní adresy URL pro všechny operace „Quick New“

### Funkce komponenty

Komponenta `MlCadViewer` obsahuje:

- **Hlavní nabídka** – operace se soubory (včetně otevření místního souboru), ovládání zobrazení a nastavení
- **Panely nástrojů** – nástroje pro kreslení, ovládání přiblížení a nástroje výběru
- **Správce hladin** – viditelnost hladin a správa vlastností
- **Příkazový řádek** – zadávání příkazů ve stylu AutoCAD
- **Stavový řádek** – aktuální pozice, úroveň přiblížení a stav systému
- **Správce dialogů** – modální dialogy pro různé operace
- **Čtečka souborů** – načítání místních souborů pomocí dialogu a podpora přetažení
- **Informace o entitě** – podrobné informace o vybraných entitách
- **Přepínač jazyka** – přepínání jazyka UI
- **Podpora motivů** – přepínání tmavého/světlého režimu

### Zpracování událostí

Komponenta automaticky zpracovává různé události:

- **Načítání souborů** – podpora načítání místních souborů (pomocí dialogu), přetažení a načítání souborů z adres URL
- **Chybové zprávy** – zobrazuje uživatelsky přívětivé chybové zprávy při neúspěšných operacích
- **Načítání fontů** – zpracovává chybějící fonty pomocí odpovídajících oznámení
- **Systémové zprávy** – zobrazuje aktualizace stavu a zpětnou vazbu k operacím

### Pokročilé použití

Pokročilé použití naleznete v části [Integrace komponenty Vue](./).

- Registrace převodníku DWG pro zobrazení výkresů ve formátu DWG
- Definice vlastního načítače fontů pro načítání fontů z vlastního serveru
- Vytváření výkresu nebo úpravy výkresu

## Dostupné exporty

### Hlavní komponenta

- `MlCADViewer` - Hlavní komponenta CAD prohlížeče

### Příkazy

- `AcApLayerStateCmd` - Příkaz stavu hladin
- `AcApLogCmd` - Příkaz protokolu
- `AcApMissedDataCmd` - Příkaz chybějících dat
- `AcApPointStyleCmd` - Příkaz stylu bodů

### Komponenty

- `MlPointStyleDlg` - Dialog stylu bodů
- `MlReplacementDlg` - Dialog nahrazení
- Různé komponenty rozvržení a UI

### Composables

- `useCommands` - Správa příkazů
- `useCurrentPos` - Sledování aktuální pozice
- `useDark` - Podpora tmavého režimu
- `useDialogManager` - Správa dialogů
- `useFileTypes` - Nástroje pro typy souborů
- `useLayers` - Správa hladin
- `useLayouts` - Správa rozvržení
- `useMissedData` - Zpracování chybějících dat
- `useSettings` - Správa nastavení
- `useSystemVars` - Systémové proměnné

### Lokalizace

- `i18n` - Instance internacionalizace
- Jazykové soubory pro angličtinu a čínštinu

### Styly

- Soubory CSS a SCSS pro stylování
- Podpora tmavého režimu
- Integrace Element Plus

