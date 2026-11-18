---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-pdf-plugin': minor
---

Add Smart Blocks: Search and Convert (AutoCAD 2026 `BSEARCH`). Select one instance; every identical copy in model space is found (rotated, mirrored and optionally scaled copies, optionally existing block references and copies whose text differs) and highlighted. Review the instances in a toolbar over the canvas, include or exclude them, then convert the selection and the included instances into a new block (text variations become attributes) or an existing block definition, in one undo step. `-BSEARCH` offers the same workflow at the command line; `BCONVERT` is an alias. The ribbon gets a Search and Convert button on the Insert and AI tabs.

Shape matching lives in `@mlightcad/cad-simple-viewer` (`acedFindShapeMatches`, `acedEntityToShapeFeature`) and handles single-shape templates under rotation and mirroring, heavy 2D/3D polylines with bulges, 2D solids, traces, points and hatches, with per-kind spatial grids for large drawings. The old `@mlightcad/cad-pdf-plugin` matching exports remain as deprecated aliases. The short-lived `pdfblock` command is removed; use `BSEARCH` / `-BSEARCH` (after PDF import, turn off Same layer).
