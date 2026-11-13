---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': patch
---

`PDFHATCH` (Recover Hatch) now reviews its results in a palette panel, like `PDFTEXT`, instead of Yes/No/Review prompts. The panel lists every recovered hatch with how well it re-draws its strokes; a hatch can be skipped, switched to another `acadiso.pat` or user-defined pattern, or given another scale and angle (each change is refitted to the strokes and scored, and only strokes the new hatch re-draws completely are replaced). **Add area** picks a point inside an area the recognition missed and fits the best pattern to the strokes there. The fitting is available to other code as `acapPdfFitHatch`, `acapPdfMatchHatch` and `acapPdfBoundaryAt`.
