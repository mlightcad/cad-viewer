---
'@mlightcad/pdf-renderer': patch
'@mlightcad/cad-pdf-plugin': patch
---

PDF export no longer drops hatch pattern lines whose offset points to the right of the line direction. AR-CONC and AR-SAND, and any mirrored hatch, lost about half their line families on export (`tessellateHatchPattern` counted no lines when the spacing was negative).

Hatch recognition (`pdfimport` and `pdfhatch`):
- **AR-CONC style patterns:** recognized even though their dot-only lines leave no strokes in the PDF, and their lines are placed one by one when no single translation fits all of them.
- **Patterns spread over several rooms:** split into patches when the whole is too large to bound.
- **Touching hatches of one pattern:** kept apart. Their strokes stop on the shared edge instead of crossing it, while axis lines drawn across one hatch still keep it whole.
- **Face boundaries:** large faces holding only stray strokes are no longer pulled into a boundary.
