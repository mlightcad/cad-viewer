---
title: "File Open Panel (Landing UI)"
---

# File Open Panel (Landing UI)

This page explains how to build a **landing-page file picker** that keeps **`@mlightcad/cad-simple-viewer`** off the critical path via the **`/file-open-panel`** subpath.

**Prefer [`acuiCreateFileOpenSession`](#quick-start-recommended)** for DocManager hosts — it mounts the landing UI, lazily creates the viewer once, attaches cloud sources, and opens the drawing. Use [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open) when you drive open yourself (e.g. Vue `MlCadViewer` props). Use low-level [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel) only for custom menu wiring.

For implementing cloud origins (OneDrive, Google Drive, custom sources), see [Data Source Plugin](./data-source-plugin).

---

## Why a separate entry?

Importing file-open UI from the **main** `@mlightcad/cad-simple-viewer` package used to pull `AcApDocManager`, three.js, and the command/view stack into the first paint of a home / upload screen.

From **1.8.0**, use the DocManager-free subpath instead:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

The session calls your `createDocManager` only when the user opens something — typically with a dynamic import of the main package.

Reference apps:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + deferred `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## Quick start (recommended)

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

// Optional cloud sources (dynamic import keeps SDKs off the first paint):
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

On each open the session:

1. Calls `createDocManager` **once** (cached afterward)
2. `attachSourcesTo(docManager.dataSourceManager)` so MSAL / GIS clients are reused
3. Runs `openDocument` / `openUrl` / `newDocument`

Optional hooks: `onBeforeOpen`, `onPrepareOpen` (after DocManager is ready), `onAfterOpen`.

Call `session.dispose()` when tearing down the landing screen. Programmatic opens: `session.open({ kind: 'file' | 'url' | 'new', … })`.

---

## Session options

| Option | Description |
|--------|-------------|
| `host` | Element that receives the panel root |
| `createDocManager` | Returns a DocManager-like object (`dataSourceManager` + open APIs) |
| `getOpenOptions?` | Passed through to openDocument / openUrl / newDocument |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | Lifecycle hooks |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | Same chrome options as the landing facade |

Useful API: `landing`, `manager`, `registerSource()`, `open()`, `ensureDocManager()`, `dispose()`.

---

## `AcUiFileOpenLanding` (custom open)

When the host opens drawings itself (Vue store + `MlCadViewer`, custom progress UI, …):

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
    void openWithViewer(request) // your code
  }
})

// after DocManager / viewer exists:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// or: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`.

---

## What the panel UI does

Both session and landing mount `AcUiFileOpenPanel`:

| Surface | Behavior |
|---------|----------|
| Card body | Local dropzone, URL row, or cloud “Select file” / account chrome |
| Footer chevron | **Local**, **URL**, plus registered cloud sources |
| Optional | **New Drawing** button |

The panel **never** reaches into `AcApDocManager`.

---

## Lazy-loading notes

1. Landing / session code imports only `@mlightcad/cad-simple-viewer/file-open-panel`.
2. `createDocManager` (or your `onOpen` handler) dynamically imports the main package.
3. Register export plugins / OneDrive `/register` **after** createInstance; cloud plugins reuse a source already attached from the landing registry.

For Vue i18n without mounting the editor on the landing page, prefer `@mlightcad/cad-editor/locale`.

---

## Low-level `AcUiFileOpenPanel`

Advanced hosts that need custom `onDataSourceAction` / `onResult` wiring can use `AcUiFileOpenPanel` directly. Prefer the session or landing facade for new integrations.

---

## Checklist

- [ ] Landing imports `/file-open-panel`, not the main package
- [ ] DocManager hosts prefer `acuiCreateFileOpenSession`
- [ ] Custom open hosts use `AcUiFileOpenLanding` + `attachSourcesTo`
- [ ] Cloud plugin packages are dynamically imported
- [ ] Sign-in and pick stay separate user gestures

---

## Related documentation

- [Data Source Plugin](./data-source-plugin) — `AcApDataSource`, menu helpers, writing cloud plugins
- [Integrate Simple Viewer](./integrate-simple-cad-viewer) — `AcApDocManager` after the landing page
- [Integrate Vue Component](./integrate-cad-viewer-component) — `MlCadViewer`
- [Built-in Plugins](./built-in-plugins) — OneDrive / Google Drive packages
- [Localization](./localization) — `main.dataSource.*` strings
- [Upgrading](./upgrade-guide) — `/file-open-panel` and `/locale` subpaths in 1.8.0
