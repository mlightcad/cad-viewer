---
'@mlightcad/cad-script-core': minor
---

Enrich entity snapshots so scripts can read, filter, and measure real drawings without private API access.

- Every snapshot now carries the `AcDbEntity` display properties: `color`, `resolvedColor`, `lineType`, `lineWeight`, `linetypeScale`, `visibility`, `transparency`, plus `thickness` / `normal` when the type has them. ByLayer / ByBlock colors keep their flags instead of being dropped.
- `cad.entities.where(...)` still reads these lazily: only the fields a predicate touches are resolved, and only matching entities are converted into full snapshots.
- Per-type `geometry` now includes derived values: line length / midPoint / direction, arc length and endpoints, circle and ellipse area, polyline vertices with bulge and widths, spline control points / knots / weights / degree / length, text alignment and formatting, MTEXT `plainText` with control codes stripped, block attributes and dynamic-block names, table cell text, hatch boundary loops and gradient fields, and a computed dimension `measurement`.
- New `cad.measure.area(id)`; `cad.measure.length(id)` now prefers the entity's own length.
