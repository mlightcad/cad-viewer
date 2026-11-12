---
'@mlightcad/cad-pdf-plugin': patch
---

`pdfhatch` and PDF import now recover ANSI35 and other patterns whose lines
sit evenly inside the pattern repeat (a solid and a dashed line half a repeat
apart). Their strokes repeat at a shorter spacing than the pattern's line
spacing, so these patterns were never tried.
