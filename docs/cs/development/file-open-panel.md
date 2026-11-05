---
title: "Panel otevření souboru (úvodní UI)"
---

# Panel otevření souboru (úvodní UI)

Tato stránka vysvětluje, jak sestavit **výběr souborů na úvodní stránce** a udržet **`@mlightcad/cad-simple-viewer`** mimo kritickou cestu přes **podcestu `/file-open-panel`**.

**Pro hostitele DocManageru upřednostněte [`acuiCreateFileOpenSession`](#quick-start-recommended)** — namontuje úvodní UI, lazy vytvoří prohlížeč, připojí cloudové zdroje a otevře výkres. Použijte [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open), když otevírání řídíte sami (např. Vue props `MlCadViewer`). Nízkou úroveň [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel) používejte jen pro vlastní zapojení menu.

Implementaci cloudových zdrojů (OneDrive, Google Drive, vlastní) viz [Plugin datového zdroje](./data-source-plugin).

---

## Proč samostatný vstup?

Import UI pro otevření souboru z **hlavního** balíčku `@mlightcad/cad-simple-viewer` dříve vtáhl `AcApDocManager`, three.js a zásobník příkazů/zobrazení do prvního vykreslení domovské / upload obrazovky.

Od **1.8.0** používejte podcestu bez DocManageru:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

Session volá vaši `createDocManager` až když uživatel něco otevře — typicky dynamickým importem hlavního balíčku.

Referenční aplikace:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + odložené `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## Rychlý start (doporučeno) {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// Volitelné cloudové zdroje (dynamický import drží SDK mimo první vykreslení):
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

Při každém otevření session:

1. **Jednou** zavolá `createDocManager` (poté cache)
2. `attachSourcesTo(docManager.dataSourceManager)`, aby se znovu použili klienti MSAL / GIS
3. Spustí `openDocument` / `openUrl` / `newDocument`

Volitelné hooky: `onBeforeOpen`, `onPrepareOpen` (po připravení DocManageru), `onAfterOpen`.

Při odstraňování úvodní obrazovky volejte `session.dispose()`. Programové otevření: `session.open({ kind: 'file' | 'url' | 'new', … })`.

---

## Možnosti session

| Možnost | Popis |
|--------|-------------|
| `host` | Prvek, který přijme kořen panelu |
| `createDocManager` | Vrátí objekt podobný DocManageru (`dataSourceManager` + open API) |
| `getOpenOptions?` | Předáno do openDocument / openUrl / newDocument |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | Hooky životního cyklu |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | Stejné chrome možnosti jako u landing fasády |

Užitečné API: `landing`, `manager`, `registerSource()`, `open()`, `ensureDocManager()`, `dispose()`.

---

## `AcUiFileOpenLanding` (vlastní otevření) {#acuifileopenlanding-custom-open}

Když host sám otevírá výkresy (Vue store + `MlCadViewer`, vlastní progress UI, …):

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // váš kód
  }
})

// Po existenci DocManageru / prohlížeče:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// nebo: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`.

---

## Co dělá UI panelu

Session i landing montují `AcUiFileOpenPanel`:

| Plocha | Chování |
|---------|----------|
| Tělo karty | Lokální dropzóna, řádek URL nebo cloudové „Vybrat soubor“ / chrome účtu |
| Šipka v patičce | **Lokální**, **URL** plus registrované cloudové zdroje |
| Volitelné | Tlačítko **Nový výkres** |

Panel **nikdy** nesahá na `AcApDocManager`.

---

## Poznámky k lazy loadingu

1. Kód landing / session importuje jen `@mlightcad/cad-simple-viewer/file-open-panel`.
2. `createDocManager` (nebo váš `onOpen` handler) dynamicky importuje hlavní balíček.
3. Registrujte exportní pluginy / OneDrive `/register` **po** createInstance; cloudové pluginy mohou znovu použít zdroj již připojený z landing registru.

Pro Vue i18n bez montáže editoru na úvodní stránce upřednostněte `@mlightcad/cad-editor/locale`.

---

## Nízká úroveň `AcUiFileOpenPanel` {#low-level-acuifileopenpanel}

Pokročilí hostitelé s vlastním zapojením `onDataSourceAction` / `onResult` mohou použít `AcUiFileOpenPanel` přímo. U nových integrací upřednostněte session nebo landing fasádu.

---

## Kontrolní seznam

- [ ] Úvodní stránka importuje `/file-open-panel`, ne hlavní balíček
- [ ] Hostitelé DocManageru upřednostňují `acuiCreateFileOpenSession`
- [ ] Hostitelé vlastního otevření používají `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] Cloudové plugin balíčky se dynamicky importují
- [ ] Přihlášení a výběr zůstávají oddělené uživatelské gesto

---

## Související dokumentace

- [Plugin datového zdroje](./data-source-plugin) — `AcApDataSource`, menu helpery, psaní cloudových pluginů
- [Integrace Simple Viewer](./integrate-simple-cad-viewer) — `AcApDocManager` po úvodní stránce
- [Integrace Vue komponenty](./integrate-cad-viewer-component) — `MlCadViewer`
- [Vestavěné pluginy](./built-in-plugins) — balíčky OneDrive / Google Drive
- [Lokalizace](./localization) — řetězce `main.dataSource.*`
- [Upgrade](./upgrade-guide) — podcesty `/file-open-panel` a `/locale` v 1.8.0
