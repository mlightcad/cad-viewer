---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

PDF import Form block recovery:

- `pdfimport` turns Form XObjects that are painted repeatedly with identical content into blocks with one reference per paint.

Small circles far from the page origin are now recognized as circles; Float32 rounding used to leave them as two-arc polylines. `pdftext` pre-fills its default answers.
