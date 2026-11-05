---
'@mlightcad/cad-agent-core': patch
'@mlightcad/cad-agent-plugin': patch
'@mlightcad/cad-demo-gallery': patch
'@mlightcad/cad-diff-viewer': patch
'@mlightcad/cad-diff-viewer-example': patch
'@mlightcad/cad-editor': patch
'@mlightcad/cad-editor-demo': patch
'@mlightcad/cad-google-drive-plugin': patch
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-exporter': patch
'@mlightcad/cad-html-plugin': patch
'@mlightcad/cad-mcp-server': patch
'@mlightcad/cad-onedrive-plugin': patch
'@mlightcad/cad-pdf-core': patch
'@mlightcad/cad-pdf-exporter': patch
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-script-core': patch
'@mlightcad/cad-script-plugin': patch
'@mlightcad/cad-simple-ui-plugin': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-simple-viewer-cli': patch
'@mlightcad/cad-simple-viewer-demo': patch
'@mlightcad/cad-svg-plugin': patch
'@mlightcad/pdf-renderer': patch
'@mlightcad/three-renderer': patch
---

feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
