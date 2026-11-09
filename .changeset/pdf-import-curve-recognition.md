---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
---

PDF import (`ipdf`) now rebuilds CAD curves instead of flattening them: Bézier circles, arcs and ellipses become `AcDbCircle` / `AcDbArc` / `AcDbEllipse`, mixed line–arc outlines become bulged polylines, free-form curves become exact splines, and arcs already flattened into short lines are refitted. `ipdf` now asks for the page, insertion point, scale and whether to recognize curves; stroke widths map to line weights and duplicate outlines are dropped. New `pdfscale` command calibrates imported geometry from a known distance.
