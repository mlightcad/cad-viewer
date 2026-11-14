---
'@mlightcad/cad-simple-viewer': patch
---

Make the arc measurement pick only circles, arcs and polyline arcs

The first pick of `measurearc` now turns generic OSNAP off and ignores clicks
that miss a curve, so it no longer snaps to lines or text and no longer drops
silently into the free three-point arc (still available through the
`ThreePoint` keyword). The arc snap indicator now follows the mouse without
OSNAP markers forcing a repaint, the lock works on model-space curves seen
through a paper-space viewport, and committed arcs get a dot at each end.
