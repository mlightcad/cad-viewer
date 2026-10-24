---
title: "Built-in Plugins"
---

# Built-in Plugins

MLightCAD ships a set of first-party plugins. Each plugin focuses on one concern — UI chrome, an AI assistant, export/import pipelines, or cloud data sources — and can be combined as needed.

For the plugin mechanism itself (`AcApPlugin`, the plugin manager, lazy loading, and how to write your own plugin), see [Plugin System](./plugin-system). Installation, registration, and full API details live in each package's README — see the links below.

## Plugin overview

| Package | Role | Commands / capabilities |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | **Toolbar, layer manager & review palette UI** for `cad-simple-viewer` (plain DOM, no Vue/React) | `layer`, `markuppanel`, default toolbar (view, measure, export, review, theme, locale) |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **Natural-language CAD agent** (AI chat panel + drawing tool calls) | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **Manual CAD script console** (runs checked scripts against the drawing, no LLM / API key needed) | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | Export drawings to **self-contained offline HTML** | `chtml` (dialog in `cad-viewer`), `-chtml` (command-line) |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **PDF export and import** (vector pipeline) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **SVG export** and shared vector renderer (also used by PDF export) | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **OneDrive data source** — open DWG/DXF from OneDrive / SharePoint | Registers `AcApDataSource` (`onedrive`); two-step Sign in → Open (popup-safe) |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Google Drive data source** — open DWG/DXF from Google Drive | Registers `AcApDataSource` (`googledrive`); two-step Sign in → Open (popup-safe) |

All command-triggered plugins are **lazy-loaded**: a small registration stub is registered up front and the heavy bundle downloads only when the user runs the trigger command. See [Plugin System — Registering plugins](./plugin-system#registering-plugins) for the registration API.

---

## UI plugins

### `@mlightcad/cad-simple-ui-plugin` — UI chrome for the simple viewer

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) deliberately ships **no application UI** — only the canvas and CAD core. If you embed the simple viewer in your own web app and want ready-made chrome without adopting the full Vue-based [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-viewer) shell, **`cad-simple-ui-plugin` is the intended UI layer**.

It provides:

- A **configurable toolbar** (placement on any edge, default CAD commands, nested menus, custom items)
- A **dock panel** with a **layer manager** tab (layer on/off, ACI color picker, zoom-to-layer on double-click) and a **review palette** tab (markup list, status, comments)
- **Theme sync** with the `COLORTHEME` sysvar and `--ml-ui-*` CSS tokens on your host element
- **Locale sync** with `AcApI18n` (English / Chinese / Czech / Turkish)

All widgets are framework-agnostic (plain DOM). The full Vue `cad-viewer` app has its own Element Plus UI and does not require this plugin; use `cad-simple-ui-plugin` when you build on `cad-simple-viewer` directly.

→ **Quick start, toolbar customization, and options:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — AI drawing assistant

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) adds a **natural-language CAD agent** to `cad-simple-viewer`-based apps. Users describe what they want in plain language; the agent calls CAD tools to inspect the drawing and create or modify geometry.

It provides:

- A **lazy-loaded** `AcApPlugin` (trigger command: `agent`) so the AI bundle is not on the critical path
- A **Vue chat panel** (`AgentChatPanel`) built on the Vercel AI SDK (`Experimental_Agent` + `@ai-sdk/vue`)
- **Browser-side LLM configuration** — API keys for OpenAI, Anthropic, or OpenAI-compatible endpoints stay in the client (encrypted in `localStorage`)
- **Phase 1 CAD tools** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- **English / Chinese / Turkish / Czech** UI strings via the plugin i18n layer

The full Vue `cad-viewer` app registers the agent automatically when the package is installed (palette tab). `cad-simple-viewer-example` wires it into a dock tab via `cad-simple-ui-plugin`. Host apps call `registerLazyAgentPlugin` and `setAgentPaletteOpener` to mount the panel where they want.

→ **Installation, registration, and tool list:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — CAD script console

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) adds a **manual CAD script console** for `cad-simple-viewer`-based apps. Unlike the agent plugin, it does **not** talk to a model and needs **no API key**: the console runs the checked script host from `@mlightcad/cad-agent-core`, and each script is a function body with one argument, `cad`, giving programmatic access to the same drawing tools the agent uses.

- Lazy-loaded `AcApPlugin` (trigger command: `cadscript`)
- Reuses the CAD tools from `@mlightcad/cad-agent-core`; this package only adds the panel and the command
- Host apps call `registerLazyCadScriptPlugin` and mount `new CadScriptPanel().element` (dock tab in `cad-simple-viewer-example`, tool-palette tab in `cad-viewer`); call `destroy()` when the tab is removed

→ **Usage:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## Export / import plugins (HTML / PDF / SVG)

These plugins add export (and PDF import) commands to the same plugin manager. They are **lazy-loaded** so initial page weight stays small. The `cad-simple-viewer-example` demo registers all three export plugins plus the UI/agent/script plugins; the full `cad-viewer` app registers the export plugins and the agent/script plugins (when installed) in its bootstrap.

### HTML (`@mlightcad/cad-html-plugin`)

One-file **offline viewer** for sharing and archiving — the exported HTML embeds the drawing data and a runtime viewer, no server required.

| Item | Value |
|------|-------|
| Command | `chtml` (dialog in `cad-viewer`), `-chtml` (command-line via `cad-simple-viewer-cli`) |
| Extra config | `htmlViewerRuntimeUrl` on `AcApDocManager.createInstance()` — URL to `viewer-runtime.iife.js` (copy from package `dist/`) |
| Public API | `registerLazyHtmlPlugin`, `createHtmlPlugin`, `AcApHtmlConvertor`, `packHtml`, snapshot types |

→ **Build output and integration:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **Headless CLI using the same pipeline:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF (`@mlightcad/cad-pdf-plugin`)

**Vector PDF export and PDF-to-CAD import.**

| Item | Value |
|------|-------|
| Commands | `cpdf` (export), `ipdf` (import) |
| Public API | `registerLazyPdfPlugin`, `createPdfPlugin`, convertors |

→ **Build output and integration:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG (`@mlightcad/cad-svg-plugin`)

**Vector SVG export** and the shared vector renderer used by PDF export.

| Item | Value |
|------|-------|
| Command | `csvg` |
| Public API | `registerLazySvgPlugin`, `createSvgPlugin`, `AcApSvgConvertor`, SVG renderer utilities |

→ **Build output and integration:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## Data source plugins (OneDrive / Google Drive)

These plugins do not register commands — they register an [`AcApDataSource`](./data-source-plugin) so users can open DWG/DXF drawings directly from cloud storage. Both use a **two-step Sign in → Open flow** designed to stay popup-blocker-safe.

### `@mlightcad/cad-onedrive-plugin`

**OneDrive / SharePoint data source** built on Microsoft File Picker v8 + MSAL. Requires an Azure app registration (SPA, delegated `User.Read` + `Files.Read.All` permissions).

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Azure app setup and full integration:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) and [Data Source Plugin](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

**Google Drive data source** with the same `AcApDataSource` contract.

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Google Cloud setup and full integration:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## Which plugins does each app register?

| App | Registered plugins |
|-----|--------------------|
| `cad-simple-viewer` | None — core only, plugins are optional |
| `cad-simple-viewer-example` | Export plugins (HTML/PDF/SVG), `cad-simple-ui-plugin`, `cad-agent-plugin`, `cad-script-plugin` |
| `cad-viewer` (Vue) | Export plugins (HTML/PDF/SVG); agent and script plugins are registered automatically **when installed** (optional peers) |

---

## Related documentation

- [Plugin System](./plugin-system) — `AcApPlugin` interface, plugin manager, lazy loading, and writing your own plugin
- [Data Source Plugin](./data-source-plugin) — the `AcApDataSource` mechanism used by the OneDrive / Google Drive plugins
- [Command](./command) — command lifecycle and `AcEdCommand`
