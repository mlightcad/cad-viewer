---
'@mlightcad/cad-svg-converter': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-editor-demo': patch
'@mlightcad/cad-simple-viewer-demo': patch
---

Add `@mlightcad/cad-svg-converter` so File → Open can load `.svg` as editable CAD entities (basic vector subset). `cad-simple-viewer` routes the `svg` converter key and accepts `.svg` in open UI; `cad-editor` registers the converter in `initializeCadViewer`.
