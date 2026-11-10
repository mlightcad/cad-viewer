---
'@mlightcad/cad-pdf-plugin': minor
---

feat(cad-pdf-plugin): recover pattern hatches on PDF import

AutoCAD and other CAD programs write a pattern hatch to PDF as thousands of
short strokes, so `ipdf` used to import ANSI31, brick or cross-hatch areas as
loose lines. In `recover` mode the import now finds groups of regularly spaced
strokes and rebuilds them as `AcDbHatch` entities. It matches the strokes
against the `acadiso.pat` library, or makes a user-defined single or double
hatch when no library pattern fits. It recovers the scale, angle and origin,
and finds the boundary from a drawn closed outline, the PDF clip path, or the
stroke ends. A hatch is kept only when re-drawing it reproduces the source
strokes; anything else stays as lines. Turn it off with
`recognizeHatches: false` or tune it with `hatchRecognition`.
