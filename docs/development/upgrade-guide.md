---
title: "Upgrading cad-simple-viewer and cad-viewer"
---

# Upgrading cad-simple-viewer and cad-viewer

This guide explains how to safely upgrade `@mlightcad/cad-simple-viewer` and`@mlightcad/cad-viewer` — why they cannot be bumped in isolation, which related packages must move together, and two reliable ways to determine the correct compatible version set for any given release.

## Overview

`@mlightcad/cad-simple-viewer` and `@mlightcad/cad-viewer` are **not standalone packages**. They are part of a tightly integrated ecosystem that shares a common codebase and release cycle. Each release bundles a coordinated set of updates across plugins, renderers, data-model packages, text-rendering libraries, and third-party UI frameworks.

**Upgrading only `cad-simple-viewer` or `cad-viewer` in isolation can lead to subtle runtime failures**, including:

- Plugin interfaces expecting API signatures that changed in newer (or older) core versions
- Data-model shape mismatches between what the core expects and what an older parser/renderer produces
- Missing WebAssembly or worker compatibility after a libredwg-converter bump
- Text rendering glitches when `mtext-renderer` / `mtext-parser` versions drift
- Three.js breaking- or behavioral-changes not matched across the renderer layer

Always upgrade the **entire set of related packages together**. The two reliable ways to determine the correct versions are described below.

---

## Ecosystem at a Glance

Before upgrading, it helps to know which packages belong to the coordinated release and which are third-party. The following categories are synchronized to the same cad-viewer release:

### Core viewer packages

| Package | Role |
| --- | --- |
| `@mlightcad/cad-simple-viewer` | Framework-agnostic core (document mgmt, command stack, rendering glue) |
| `@mlightcad/cad-viewer` | Vue 3 + Element Plus UI wrapper built on top of cad-simple-viewer |

### Plugins — **must match the cad-simple-viewer version exactly**

| Package | Purpose |
| --- | --- |
| `@mlightcad/cad-html-plugin` | One-click self-contained HTML export |
| `@mlightcad/cad-pdf-plugin` | PDF export and PDF underlay import |
| `@mlightcad/cad-svg-plugin` | SVG export |
| `@mlightcad/cad-simple-ui-plugin` | Plain-DOM toolbar, layer manager, dock panel |
| `@mlightcad/cad-agent-plugin` | AI-agent-powered interaction |
| `@mlightcad/cad-onedrive-plugin` | OneDrive integration |
| `@mlightcad/cad-google-drive-plugin` | Google Drive integration |

> **Rule of thumb:** every plugin in the list above should be pinned to the **exact same version number** as `cad-simple-viewer` you are upgrading to (for example, `1.7.5`).

### Internal renderer layer (same version as core, published separately)

| Package | Purpose |
| --- | --- |
| `@mlightcad/three-renderer` | THREE.js-based 2D/3D rendering engine |
| `@mlightcad/pdf-renderer` | Backend used by cad-pdf-plugin for PDF content generation |

These are consumed internally by plugins and cad-simple-viewer. You typically do **not** install them directly, but their version must be compatible with the plugins you install.

### Low-level data & text layer — **must match versions from the release**

| Package | Notes |
| --- | --- |
| `@mlightcad/data-model` | Core entity/database types; every release bumps this together with the viewer |
| `@mlightcad/libredwg-converter` | DWG parsing WebAssembly wrapper — DWG support depends on this |
| `@mlightcad/mtext-parser` | MTEXT content parser |
| `@mlightcad/mtext-renderer` | MTEXT → THREE geometry renderer |
| `@mlightcad/mtext-input-box` | In-canvas MTEXT editor widget |

### cad-viewer-only Vue UI dependencies

These appear in the `pnpm-workspace.yaml` overrides but are only needed when using `@mlightcad/cad-viewer` (the full Vue 3 UI). Cad-simple-viewer integrations do not install them directly.

| Package | Purpose |
| --- | --- |
| `@mlightcad/ribbon` | Ribbon UI component |
| `@mlightcad/ui-components` | Shared Vue UI primitives |

### Third-party peer dependencies (keep versions as pinned in the release)

| Package |
| --- |
| `three` |
| `vue` (for cad-viewer only) |
| `element-plus` (for cad-viewer only) |
| `vue-i18n` (for cad-viewer only) |
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

4. Update every `@mlightcad/cad-*-plugin` you use to the **same version** as `cad-simple-viewer` / `cad-viewer`:

   ```json
   {
     "dependencies": {
       "@mlightcad/cad-simple-viewer": "1.7.5",
       "@mlightcad/cad-viewer": "1.7.5",
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

## Method 2 — Follow the `cad-simple-viewer-example` Upgrade Commits

The [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) repository is the official minimal host for `cad-simple-viewer`. Every time the core is released, the example project receives a commit titled `feat: upgrade to cad-simple-viewer vX.Y.Z` that updates **all related dependencies together**. This commit is a practical, concrete reference that shows exactly which versions were used by the maintainers for that release.

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

A: Yes. The version coordination is the same regardless of package manager. Use `overrides` (pnpm), `resolutions` (yarn), or `overrides` (npm) with the values from `pnpm-workspace.yaml`, or simply pin the versions from the `cad-simple-viewer-example` diff in your `package.json`.


