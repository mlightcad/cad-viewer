---
'@mlightcad/cad-script-core': minor
---

Add `tx.drawDim*` helpers so agent scripts can create real dimension entities instead of faking them with lines and text.

- New transaction methods: `drawDimAligned`, `drawDimLinear`, `drawDimDiameter`, `drawDimRadius`, `drawDimAngular`, `drawDimArc`, and `drawDimOrdinate`.
- Diameter and radius accept either chord points or `center` + `radius` (optional `angleDeg` / `leaderLength`) so circle snapshots can feed them directly.
- Omitting `rotationDeg` on linear dims picks horizontal/vertical from dim-line placement; omitting `styleName` uses the drawing `$DIMSTYLE`.
