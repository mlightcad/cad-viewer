---
"@mlightcad/cad-agent-core": patch
"@mlightcad/cad-agent-plugin": patch
"@mlightcad/cad-demo-gallery": patch
"@mlightcad/cad-diff-viewer": patch
"@mlightcad/cad-diff-viewer-example": patch
"@mlightcad/cad-editor-demo": patch
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
"@mlightcad/pdf-renderer": patch
"@mlightcad/three-renderer": patch
---

fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.
