---
"@mlightcad/cad-agent-core": patch
"@mlightcad/cad-agent-plugin": patch
"@mlightcad/cad-demo-gallery": patch
"@mlightcad/cad-diff-viewer": patch
"@mlightcad/cad-diff-viewer-example": patch
"@mlightcad/cad-google-drive-plugin": patch
"@mlightcad/cad-html-core": patch
"@mlightcad/cad-html-exporter": patch
"@mlightcad/cad-html-plugin": patch
"@mlightcad/cad-mcp-server": patch
"@mlightcad/cad-onedrive-plugin": patch
"@mlightcad/cad-pdf-plugin": patch
"@mlightcad/cad-script-plugin": patch
"@mlightcad/cad-simple-ui-plugin": patch
"@mlightcad/cad-simple-viewer": patch
"@mlightcad/cad-simple-viewer-cli": patch
"@mlightcad/cad-simple-viewer-demo": patch
"@mlightcad/cad-svg-plugin": patch
"@mlightcad/cad-viewer": patch
"@mlightcad/cad-editor-demo": patch
"@mlightcad/pdf-renderer": patch
"@mlightcad/three-renderer": patch
---

fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
