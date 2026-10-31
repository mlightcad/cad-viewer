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

fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.
