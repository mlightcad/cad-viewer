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

fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
