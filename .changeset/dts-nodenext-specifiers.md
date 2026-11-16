---
'@mlightcad/cad-simple-viewer': patch
---

Fix published type declarations under `moduleResolution: node16`/`nodenext` (#930). Relative imports in package sources now use explicit Node-ESM paths (`./foo.js`, `./foo/index.js`), so the emitted `lib/*.d.ts` resolve and exports such as `AcApDocManager` no longer disappear or degrade to `any`. `@mlightcad/cad-editor` now ships a single bundled `dist/cad-editor.d.ts` (its per-file declarations re-exported `.vue` modules, which Node-ESM resolution cannot follow), so `MlCadViewer` and the other editor exports resolve as well.
