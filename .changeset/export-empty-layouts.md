---
'@mlightcad/cad-html-core': minor
'@mlightcad/cad-html-exporter': minor
'@mlightcad/cad-html-plugin': minor
'@mlightcad/cad-pdf-core': minor
'@mlightcad/cad-pdf-exporter': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/pdf-renderer': minor
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-script-plugin': minor
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-simple-viewer-cli': minor
'@mlightcad/cad-editor': minor
---

Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
