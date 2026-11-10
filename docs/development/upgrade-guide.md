---
title: "Upgrading cad-simple-viewer and cad-editor"
---

# Upgrading cad-simple-viewer and cad-editor

This guide explains how to safely upgrade `@mlightcad/cad-simple-viewer` and`@mlightcad/cad-editor` — why they cannot be bumped in isolation, which related packages must move together, and two reliable ways to determine the correct compatible version set for any given release.

::: info Shared AI model settings (`@mlightcad/cad-llm-plugin`)
Starting with the release that includes this change, the LLM provider settings move out of `@mlightcad/cad-agent-plugin` into the new **`@mlightcad/cad-llm-plugin`**, so the CAD Agent and `pdftext` text recognition (OCR) share one configuration. The new package adds the **LLMSETTINGS** command, a framework-free settings dialog (also on the AI ribbon tab of `@mlightcad/cad-editor`), and `@mlightcad/cad-simple-viewer` adds `AcApLlmSettingsService` so any feature can open the dialog or check whether a vision model is configured.

Migrate hosts:

- Install `@mlightcad/cad-llm-plugin` (now a peer dependency of `@mlightcad/cad-agent-plugin`) and call `registerLazyLlmPlugin` next to `registerLazyAgentPlugin`. `@mlightcad/cad-editor` does this on its own when the package is installed.
- `registerLazyAgentPlugin` no longer registers a text recognizer. The recognizer is now `cad-llm` (was `cad-agent`) and comes from `registerLazyLlmPlugin`. `acapAgentRecognizeText` / `cleanRecognizedText` are now `acapLlmRecognizeText` / `acapLlmCleanRecognizedText` in `@mlightcad/cad-llm-plugin`.
- The agent panel's inline settings card is replaced by the dialog; its gear button opens LLMSETTINGS.
- Saved settings are kept: the `localStorage` key `cad-agent-plugin.llm-config` is unchanged.
- OCR falls back to the first image-capable configured model when the model in use is text-only.

```ts
import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'
import { registerLazyLlmPlugin } from '@mlightcad/cad-llm-plugin/register'

registerLazyLlmPlugin(pluginManager)
registerLazyAgentPlugin(pluginManager)
```
:::

::: info Smart Blocks: Search and Convert (`BSEARCH`)
Starting with the release that includes this change, `@mlightcad/cad-simple-viewer` registers **-BSEARCH** and `@mlightcad/cad-editor` adds **BSEARCH** (alias `BCONVERT`) with a review toolbar and a Convert to Block dialog (Insert and AI ribbon tabs).

Shape matching moved from `@mlightcad/cad-pdf-plugin` to `@mlightcad/cad-simple-viewer`. Migrate imports:

| `@mlightcad/cad-pdf-plugin` (deprecated) | `@mlightcad/cad-simple-viewer` |
| --- | --- |
| `findPdfShapeMatches` | `acedFindShapeMatches` |
| `applyPdfAffine` | `acedApplyAffine2d` |
| `pdfEntityToFeature` | `acedEntityToShapeFeature(entity, id, { matchLayer: false })` |
| `PdfMatchFeature` / `PdfAffine` / `PdfShapeMatch` / `PdfShapeMatchOptions` | `AcEdShapeFeature` / `AcEdAffine2d` / `AcEdShapeMatch` / `AcEdShapeMatchOptions` |

The old names still work as deprecated aliases. Text strings moved from the feature `kind` to `label` (compare with `ignoreLabels: false`, the default). `pdfblock` now runs the `-BSEARCH` prompts (Convert → New/Existing → name → insertion point → scope); scripts that answered its old prompts must follow the new order.
:::

::: info AutoCAD groups (`GROUP` / `PICKSTYLE` / `GROUPDISPLAYMODE`)
Starting with the release that includes this change, `@mlightcad/cad-simple-viewer` registers **GROUP**, **-GROUP**, **UNGROUP**, and **GROUPEDIT**, expands selection when `PICKSTYLE` is `1` or `3`, and applies `GROUPDISPLAYMODE` grips for selectable groups. `@mlightcad/cad-editor` adds **CLASSICGROUP** (Object Grouping dialog) and a Home → Groups ribbon panel.

Requires `@mlightcad/data-model` that registers `PICKSTYLE` (0–3, default `1`) and `GROUPDISPLAYMODE` (0–2, default `2`). Associative hatch co-selection (`PICKSTYLE` 2/3) remains a no-op until hatch boundary soft-pointers exist on `AcDbHatch`.
:::

::: info `cad.view.capturePreview` selection preview
Starting with the release that includes this change, `CadSession.capturePreview` takes an options object instead of a bare `longSide` number (a bare positive number is still accepted as `longSide`):

```ts
capturePreview?(options?: {
  longSide?: number
  selection?: boolean
}): Promise<CaptureDrawingPreviewResult>
```

Script callers use `cad.view.capturePreview({ longSide?, selection? })`. Pass `selection: true` after `cad.selection.replace(ids)` to extract the selected entities via the same batch-preview path as ENTPREVIEW (scene bounds, not database `geometricExtents`) and attach a PNG to the tool result. Empty selection returns `reason: 'no-selection'`. Headless `createDatabaseSession` still skips previews (no renderer).
:::

::: info `cad.view.capturePreview` layer preview
Starting with the release that includes this change, `CadCapturePreviewOptions` adds `layers?: string | string[]`, and `CaptureDrawingPreviewFailure` adds `'no-layers'`:

```ts
cad.view.capturePreview({ layers: ['WALL', 'DOOR'], longSide: 1024 })
```

Only model-space geometry on those layers is rendered (an INSERT contributes just its fragments on those layers), framed to the combined extents of the layers instead of the whole drawing. Names are case-insensitive; unknown names throw while the script runs; `layers` cannot be combined with `selection: true`. `normalizeCadCapturePreviewOptions` now returns `NormalizedCadCapturePreviewOptions` (with `layers` as a de-duplicated `string[]`). Custom `CadSession.capturePreview` implementations should honor `options.layers` or return `reason: 'no-layers'`. The viewer implementation uses the new `AcApEntityPreviewConvertor.captureLayers(layerNames, longSide)`.
:::

::: info Lightweight file-open landing entry
Starting with **1.8.0**, `@mlightcad/cad-simple-viewer` exposes a DocManager-free subpath for landing pages. Prefer **`acuiCreateFileOpenSession`** (lazy `createDocManager` + auto open / `attachSourcesTo`). Use `AcUiFileOpenLanding` when you open drawings yourself (e.g. Vue `MlCadViewer`):

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

Use this on the home / file-picker screen so the full viewer stays lazy until a drawing opens. The Vue editor counterpart is `@mlightcad/cad-editor/locale` for i18n without mounting `MlCadViewer`.

Full walkthrough: [File Open Panel](./file-open-panel). Cloud source contracts: [Data Source Plugin](./data-source-plugin).
:::

::: warning Package renamed: `@mlightcad/cad-viewer` → `@mlightcad/cad-editor`
Starting with **1.8.0**, the package previously published as `@mlightcad/cad-viewer` is now `@mlightcad/cad-editor`, so that its name matches what it actually does.

- **The old package is frozen.** `@mlightcad/cad-viewer` stops at 1.7.x and no release after that will appear on the registry, so `pnpm add @mlightcad/cad-viewer@1.8.0` fails with a 404. The project is still maintained — just under the new name.
- **Nothing else changed.** Only the package name and the emitted artifact filenames moved; the exports (`MlCadViewer`, `i18n`, …) and their usage are identical.
- **Rename as part of the same upgrade**, so the viewer stays on the same version as the rest of the package set:

```diff
  {
    "dependencies": {
-     "@mlightcad/cad-viewer": "1.7.8",
+     "@mlightcad/cad-editor": "1.8.0",
      "@mlightcad/cad-simple-viewer": "1.8.0"
    }
  }
```

```diff
- import { MlCadViewer, i18n } from '@mlightcad/cad-viewer'
+ import { MlCadViewer, i18n } from '@mlightcad/cad-editor'
```

If you pin CDN files by version (jsDelivr, unpkg, …), update the filenames as well:

```diff
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.js
- https://cdn.jsdelivr.net/npm/@mlightcad/cad-viewer@1.7.8/dist/cad-viewer.css
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.js
+ https://cdn.jsdelivr.net/npm/@mlightcad/cad-editor@1.8.0/dist/cad-editor.css
```

::: tip The repository name did not change
The GitHub repository is still [`mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer), and the docs site and live demos keep their existing paths. Only the **npm package name** changed, so every repository and issue link in this guide still works.
:::
:::

::: warning HTML export public API renamed (`AcExHtml` / `acexHtml`)
Starting with **1.8.0**, the public types and functions of `@mlightcad/cad-html-core` (re-exported by `@mlightcad/cad-html-plugin`) use the layer prefixes `AcExHtml*` (types) and `acexHtml*` (functions), matching the convention used elsewhere in the monorepo.

Behavior is unchanged; only the symbol names moved. Update imports when you upgrade from 1.7.x:

```diff
  import {
-   type AcExSnapshot,
-   buildAcExPackage,
-   zipAcExPackageFiles,
-   unzipAcExPackageFiles,
-   packHtml,
-   packHtmlPackage
+   type AcExHtmlSnapshot,
+   acexHtmlBuildPackage,
+   acexHtmlZipPackageFiles,
+   acexHtmlUnzipPackageFiles,
+   acexHtmlPackHtml,
+   acexHtmlPackHtmlPackage
  } from '@mlightcad/cad-html-plugin'
```

The same rename applies to other HTML-core helpers (for example `captureAcExSavedViewExtents` → `acexHtmlCaptureSavedViewExtents`, `buildOsnapCatalog` → `acexHtmlBuildOsnapCatalog`). Command-level APIs such as `AcApHtmlConvertor` and `chtml` / `-chtml` are unaffected. Development guides that show the new names target **1.8.0+**; on 1.7.x keep using the old symbols.
:::

::: tip Script host: create real dimension entities (`drawDim*`)
Starting with the release that follows **1.8.0-preview.2**, `cad.edit.transaction` in `@mlightcad/cad-script-core` can create dimension entities — not only read their snapshots:

- `drawDimAligned`, `drawDimLinear`, `drawDimDiameter`, `drawDimRadius`
- `drawDimAngular`, `drawDimArc`, `drawDimOrdinate`

Agents and scripts should call these instead of approximating dimensions with lines, arrows, and text. Diameter/radius accept `center` + `radius` so a circle snapshot can feed them directly. See [Script API](../guide/script/api.md).
:::

::: tip Script host: per-block tallies on `cad.blocks`
In the release that includes this change, `cad.blocks` exposes per-block `entityCount` / `typeCounts` metadata — no embedded entity arrays. Prefer those fields / `count(pred)` for tallies. Snapshot with `where` / `inBlock(id, pred)` — bare whole-space snapshots stop at ~500 matches (`too_many_matches`). `where` / `count` / `inBox` scan model and paper spaces only (use `inBlock` for block definitions). Block references use `type === 'BlockReference'`.
:::

::: info SVG File → Open
Starting with **1.8.0**, `.svg` can be opened as a drawing through the normal File → Open / `openDocument` / `openUrl` path. Vector conversion lives in the new package [`@mlightcad/cad-svg-converter`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-converter) (depends only on `@mlightcad/data-model`).

**Integrators using `@mlightcad/cad-editor`:** `initializeCadViewer` registers the converter automatically. Install `@mlightcad/cad-svg-converter` next to the other fixed-group packages (same version).

**Integrators using only `@mlightcad/cad-simple-viewer`:** call once at startup:

```ts
import { registerSvgConverter } from '@mlightcad/cad-svg-converter'

registerSvgConverter()
```

Supported subset (v1): `line`, `polyline` / `polygon` / `rect`, `circle`, `ellipse` (polyline approx when non-uniform), `path` (tessellated), `text`, nested `g` + transforms. Export remains `csvg` in `@mlightcad/cad-svg-plugin`. Save after editing is still DXF (`cdxf`) or re-export SVG — there is no native SVG save.
:::

::: info PDF export split into a shared core (browser + Node)
Starting with **1.8.0**, PDF export uses the same layering as HTML export. Shared logic lives in `@mlightcad/cad-pdf-core` (option model and database → PDF pipeline, **no** `cad-simple-viewer` / DOM dependency). Two front ends consume it:

| Package | Role |
| --- | --- |
| `@mlightcad/cad-pdf-plugin` | Browser `cpdf` / `-cpdf` / `ipdf` (and the Vue export dialog) |
| `@mlightcad/cad-pdf-exporter` | Headless Node DXF/DWG → PDF — **no browser** |

**Browser integrators — mostly unchanged.** Keep using `cpdf` / `-cpdf` / `ipdf`, `AcApPdfConvertor`, `AcApPdfExportOptions`, and `resolveAcApPdfExportOptions`. Install the new peer `@mlightcad/cad-pdf-core` next to the plugin (same version as `cad-simple-viewer`).

**User-facing API / behaviour deltas:**

- New option `colorMode: 'color' | 'monochrome'` (default `'color'`). Available in the `cpdf` dialog, as the **last** `-cpdf` prompt (`Color` / `Monochrome`), and on `AcApPdfExportOptions`. Existing `-cpdf` scripts must answer that prompt (or send an empty line for the default) after the text-mode answer.
- Headless / CI without a browser: use `@mlightcad/cad-pdf-exporter` (`exportFileToPdf`, `convertDatabaseToPdf`) instead of driving `cpdf` through Playwright.

```ts
// Browser (names unchanged)
import {
  AcApPdfConvertor,
  resolveAcApPdfExportOptions
} from '@mlightcad/cad-pdf-plugin'

await new AcApPdfConvertor().convert(
  context,
  resolveAcApPdfExportOptions({ colorMode: 'monochrome' })
)

// Node, no browser
import { exportFileToPdf } from '@mlightcad/cad-pdf-exporter'

await exportFileToPdf('drawing.dwg', 'drawing.pdf', {
  colorMode: 'monochrome'
})
```

Advanced callers that talk to the shared pipeline directly use `acexPdfExportDatabase` / `acexPdfResolveExportOptions` from `@mlightcad/cad-pdf-core`. See the package READMEs for fonts, layouts, and text mode.
:::

## Overview

`@mlightcad/cad-simple-viewer` and `@mlightcad/cad-editor` are **not standalone packages**. They are part of a tightly integrated ecosystem that shares a common codebase and release cycle. Each release bundles a coordinated set of updates across plugins, renderers, data-model packages, text-rendering libraries, and third-party UI frameworks.

**Upgrading only `cad-simple-viewer` or `cad-editor` in isolation can lead to subtle runtime failures**, including:

- Plugin interfaces expecting API signatures that changed in newer (or older) core versions
- Data-model shape mismatches between what the core expects and what an older parser/renderer produces
- Missing WebAssembly or worker compatibility after a libredwg-converter bump
- Text rendering glitches when `mtext-renderer` / `mtext-parser` versions drift
- Three.js breaking- or behavioral-changes not matched across the renderer layer

Always upgrade the **entire set of related packages together**. The two reliable ways to determine the correct versions are described below.

---

## Ecosystem at a Glance

Before upgrading, it helps to know which packages belong to the coordinated release and which are third-party. The following categories are synchronized to the same cad-editor release:

### Core viewer packages

| Package | Role |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | Framework-agnostic core (document mgmt, command stack, rendering glue) |
| `@mlightcad/cad-editor` | Vue 3 + Element Plus UI wrapper built on top of cad-simple-viewer |

### Plugins — **must match the cad-simple-viewer version exactly**

| Package | Purpose |
| --- | --- |
| `@mlightcad/cad-html-plugin` | One-click self-contained HTML export |
| `@mlightcad/cad-pdf-plugin` | Browser PDF export and PDF-to-CAD import |
| `@mlightcad/cad-svg-plugin` | SVG export |
| `@mlightcad/cad-svg-converter` | SVG File → Open (vector → AcDb entities) |
| `@mlightcad/cad-simple-ui-plugin` | Plain-DOM toolbar, layer manager, dock panel |
| `@mlightcad/cad-agent-plugin` | AI-agent-powered interaction |
| `@mlightcad/cad-onedrive-plugin` | OneDrive integration |
| `@mlightcad/cad-google-drive-plugin` | Google Drive integration |

> **Rule of thumb:** every plugin in the list above should be pinned to the **exact same version number** as `cad-simple-viewer` you are upgrading to (for example, `1.7.5`).

### Shared export cores and headless exporters (same version as core)

| Package | Purpose |
| --- | --- |
| `@mlightcad/cad-html-core` | Shared HTML snapshot / packaging pipeline (no viewer / DOM) |
| `@mlightcad/cad-html-exporter` | Headless Node HTML export |
| `@mlightcad/cad-pdf-core` | Shared PDF option model and database → PDF pipeline (no viewer / DOM) |
| `@mlightcad/cad-pdf-exporter` | Headless Node DXF/DWG → PDF (no browser) |

### Internal renderer layer (same version as core, published separately)

| Package | Purpose |
| --- | --- |
| `@mlightcad/three-renderer` | THREE.js-based 2D/3D rendering engine |
| `@mlightcad/pdf-renderer` | PDF content backend used by `cad-pdf-core` |

These are consumed internally by plugins and cad-simple-viewer. You typically do **not** install them directly, but their version must be compatible with the plugins you install.

### Low-level data & text layer — **must match versions from the release**

| Package | Notes |
| --- | --- |
| `@mlightcad/data-model` | Core entity/database types; every release bumps this together with the viewer |
| `@mlightcad/libredwg-converter` | DWG parsing WebAssembly wrapper — DWG support depends on this |
| `@mlightcad/mtext-parser` | MTEXT content parser |
| `@mlightcad/mtext-renderer` | MTEXT → THREE geometry renderer |
| `@mlightcad/mtext-input-box` | In-canvas MTEXT editor widget |

### cad-editor-only Vue UI dependencies

These appear in the `pnpm-workspace.yaml` overrides but are only needed when using `@mlightcad/cad-editor` (the full Vue 3 UI). Cad-simple-viewer integrations do not install them directly.

| Package | Purpose |
| --- | --- |
| `@mlightcad/ribbon` | Ribbon UI component |
| `@mlightcad/ui-components` | Shared Vue UI primitives |

### Third-party peer dependencies (keep versions as pinned in the release)

| Package |
| --- |
| `three` |
| `vue` (for cad-editor only) |
| `element-plus` (for cad-editor only) |
| `vue-i18n` (for cad-editor only) |
| `lodash-es` |

---

## Method 1 — Read `pnpm-workspace.yaml` at the Target Version

The canonical source of truth for every release is the monorepo's `pnpm-workspace.yaml` `overrides` section at the corresponding Git tag. It lists the **exact versions** of every `@mlightcad/*` package and third-party peer dependency that the release was tested against.

### Steps

1. Find the tag for the version you want to upgrade to. Tags follow the pattern `vX.Y.Z` (for example, `v1.7.5`). All tags are in the main repository:

   ```
   https://github.com/mlightcad/cad-viewer/tags
   ```

2. Open `pnpm-workspace.yaml` at that tag. The URL template is:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/vX.Y.Z/pnpm-workspace.yaml
   ```

   Replace `vX.Y.Z` with the real version tag, for example:

   ```
   https://raw.githubusercontent.com/mlightcad/cad-viewer/v1.7.5/pnpm-workspace.yaml
   ```

3. Copy the `overrides:` block into your own project's `pnpm-workspace.yaml`. It will look similar to this (abbreviated example):

   ```yaml
   overrides:
     '@mlightcad/data-model': '^1.15.4'
     '@mlightcad/libredwg-converter': '^3.15.4'
     '@mlightcad/mtext-input-box': '^0.3.3'
     '@mlightcad/mtext-parser': '^1.5.3'
     '@mlightcad/mtext-renderer': '^0.13.3'
     '@mlightcad/ribbon': '^0.1.13'
     '@mlightcad/ui-components': '^0.1.11'
     element-plus: '^2.12.0'
     lodash-es: '4.17.21'
     three: '^0.172.0'
     vue: '^3.4.21'
     vue-i18n: '^11.4.4'
   ```

4. Update every `@mlightcad/cad-*-plugin` you use to the **same version** as `cad-simple-viewer` / `cad-editor`:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-editor": "1.7.5",
       "@mlightcad/cad-html-plugin": "1.7.5",
       "@mlightcad/cad-pdf-plugin": "1.7.5",
       "@mlightcad/cad-svg-plugin": "1.7.5",
       "@mlightcad/cad-simple-ui-plugin": "1.7.5",
       "@mlightcad/cad-agent-plugin": "1.7.5",
       "@mlightcad/cad-onedrive-plugin": "1.7.5",
       "@mlightcad/cad-google-drive-plugin": "1.7.5"
     }
   }
   ```

5. Run `pnpm install` (or `npm install`) and verify the app loads without peer-dependency warnings.

> If your project is a plain `npm` or `yarn` workspace, copy the same `overrides` into a `pnpm.overrides` / `resolutions` block respectively — the version values are what matter, not the file format.

---

## Method 2 — Follow the `cad-simple-viewer-demo` Upgrade Commits

The [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) repository is the official minimal host for `cad-simple-viewer`. Every time the core is released, the example project receives a commit titled `feat: upgrade to cad-simple-viewer vX.Y.Z` that updates **all related dependencies together**. This commit is a practical, concrete reference that shows exactly which versions were used by the maintainers for that release.

### Steps

1. Open the package.json file's commit history:

   ```
   https://github.com/mlightcad/cad-simple-viewer-example/commits/main/package.json
   ```

2. Find the commit whose message says `feat: upgrade to cad-simple-viewer vX.Y.Z` for your target version.

3. Click the commit to view the diff. The diff will show a coordinated bump across:
   - All plugins (to the same version as `cad-simple-viewer`)
   - `data-model`
   - `libredwg-converter`
   - `mtext-parser`
   - `mtext-renderer`
   - and any third-party packages that changed

4. Transcribe the versions from the diff into your own `package.json`.

### Concrete Example — v1.7.3 → v1.7.4 Upgrade

The following real diff was taken from [commit `492680a`](https://github.com/mlightcad/cad-simple-viewer-example/commit/492680a6b18d7683c457dbc6e689e035ac636fff) in the example repo. Notice how **every single `@mlightcad/*` package moved in lockstep**:

```diff
 dependencies:
-    "@mlightcad/cad-html-plugin": "1.7.3",
-    "@mlightcad/cad-pdf-plugin": "1.7.3",
-    "@mlightcad/cad-svg-plugin": "1.7.3",
-    "@mlightcad/cad-simple-ui-plugin": "1.7.3",
-    "@mlightcad/cad-simple-viewer": "1.7.3",
-    "@mlightcad/data-model": "1.15.0",
-    "@mlightcad/libredwg-converter": "^3.15.0",
+    "@mlightcad/cad-html-plugin": "1.7.4",
+    "@mlightcad/cad-pdf-plugin": "1.7.4",
+    "@mlightcad/cad-svg-plugin": "1.7.4",
+    "@mlightcad/cad-simple-ui-plugin": "1.7.4",
+    "@mlightcad/cad-simple-viewer": "1.7.4",
+    "@mlightcad/data-model": "1.15.1",
+    "@mlightcad/libredwg-converter": "^3.15.1",
     "@mlightcad/mtext-parser": "^1.5.3",
-    "@mlightcad/mtext-renderer": "^0.13.1"
+    "@mlightcad/mtext-renderer": "^0.13.2"
```

> This is exactly the kind of coordinated update you should make in your own project. Note that `mtext-parser` stayed at `^1.5.3` (no change was needed), while `mtext-renderer` moved from `0.13.1` to `0.13.2`. These decisions are made per release and you should follow them rather than guessing.

---

## After Upgrading — Quick Sanity Checks

1. **Install** — run a clean install to ensure no stale `node_modules` interfere:

   ```bash
   rm -rf node_modules pnpm-lock.yaml && pnpm install
   ```

2. **Open a drawing** — verify both DXF and DWG files load, pan/zoom work, and no console errors appear.

3. **Export** — if you use export plugins, test HTML, PDF, and SVG export on a sample drawing.

4. **Check peer-dependency warnings** — `pnpm` will warn if any `peerDependencies` are unmet. Treat these as must-fix issues; they are usually caused by drifting a plugin's version away from the core.

5. **Build your app** — a full `vite build` (or equivalent) is the fastest way to catch type mismatches between the viewer types and your own integration code.

---

## FAQ

**Q: Can I mix `cad-simple-viewer@1.7.5` with `cad-html-plugin@1.7.3`?**

A: Generally no. Plugins are released together with the core and often depend on internal APIs that changed between minor versions. Even if TypeScript compiles, you may hit runtime failures (e.g., export silently producing empty output, or plugin registration failing with a misleading error).

**Q: What if I only use `cad-simple-viewer` with no plugins?**

A: You still need `data-model` and (if you load DWG files) `libredwg-converter` at compatible versions. The `pnpm-workspace.yaml` at your target tag still applies.

**Q: Does semantic versioning protect me?**

A: Semver ranges (`^`, `~`) work fine for patch-level bumping *within* a release series (for example, `^1.7.0` will pick up `1.7.5` automatically), but **the coordinated plugin/data-model/libredwg-converter versions** are not discoverable from semver alone — they are set by the release maintainers. You still need one of the two methods above to know which versions go together for any given minor bump.

**Q: I use npm/yarn instead of pnpm. Does this still apply?**

A: Yes. The version coordination is the same regardless of package manager. Use `overrides` (pnpm), `resolutions` (yarn), or `overrides` (npm) with the values from `pnpm-workspace.yaml`, or simply pin the versions from the `cad-simple-viewer-demo` diff in your `package.json`.


