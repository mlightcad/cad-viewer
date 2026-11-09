---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

PDF block recovery:
- `ipdf` turns Form XObjects that are painted repeatedly with identical content into blocks with one reference per paint.
- New `pdfblock` command: select one instance of a repeated symbol, and every rotated or mirrored (optionally scaled) copy is found, highlighted and replaced by block references.
- New Make Block button in the AI > PDF ribbon panel.

Small circles far from the page origin are now recognized as circles; Float32 rounding used to leave them as two-arc polylines. `pdftext` and `pdfblock` pre-fill their default answers.
