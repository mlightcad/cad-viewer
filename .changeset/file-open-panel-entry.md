---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': patch
'@mlightcad/cad-editor-demo': patch
'@mlightcad/cad-simple-viewer-demo': patch
---

Add `@mlightcad/cad-simple-viewer/file-open-panel` so landing pages can load the file picker and data-source registry without pulling `AcApDocManager` / three-renderer. Demo apps lazy-load the full viewer after a drawing is chosen; `@mlightcad/cad-editor/locale` exposes i18n without mounting `MlCadViewer`.
