---
'@mlightcad/cad-pdf-plugin': minor
---

PDFIMPORT now finds hatch boundaries among the faces of the surrounding line work (lines, arcs and polylines that cross, meet in T-junctions or run past the hatch), so about twice as many pattern hatches come back as hatch objects on a typical architectural page. Face boundary finding is several times faster: the planar arrangement is built once per region and shared by its pattern hypotheses, and its spatial indexes use numeric cells. `faceBoundaries` in `acapPdfRecognizeHatches` now defaults to `true`; pass `false` to keep only closed outlines, clip paths and stroke ends as boundary sources. `acapPdfFaceArrangement` and `acapPdfFaceBoundaryIn` split `acapPdfFaceBoundary` for callers that test several hit sets against the same line work.
