---
'@mlightcad/three-renderer': patch
---

fix(three-renderer): repair hatch loops that draw an edge twice

`resolveSelfIntersectingHatchLoop` now runs the PolyBool segments through a
union selection before rebuilding rings, so edges without fill on either side
are dropped. A spike drawn out and back no longer makes the repair fail (and
leak fill outside the boundary), and a notch reached along a doubled edge is no
longer filled in.
