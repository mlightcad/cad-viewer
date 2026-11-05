---
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-demo-gallery': minor
'@mlightcad/cad-diff-viewer': minor
'@mlightcad/cad-diff-viewer-example': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-editor-demo': minor
'@mlightcad/cad-google-drive-plugin': minor
'@mlightcad/cad-html-core': minor
'@mlightcad/cad-html-exporter': minor
'@mlightcad/cad-html-plugin': minor
'@mlightcad/cad-mcp-server': minor
'@mlightcad/cad-onedrive-plugin': minor
'@mlightcad/cad-pdf-core': minor
'@mlightcad/cad-pdf-exporter': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-script-plugin': minor
'@mlightcad/cad-simple-ui-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-simple-viewer-cli': minor
'@mlightcad/cad-simple-viewer-demo': minor
'@mlightcad/cad-svg-plugin': minor
'@mlightcad/pdf-renderer': minor
'@mlightcad/three-renderer': minor
---

feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed
