---
'@mlightcad/cad-pdf-exporter': patch
'@mlightcad/cad-html-exporter': patch
---

fix: headless PDF/HTML export now omits non-plottable layers by default (matching cad-editor), so no-plot markup like `不打印` / `仪表确认层` no longer appears as misplaced geometry
