---
'@mlightcad/cad-html-plugin': patch
'@mlightcad/cad-html-core': patch
---

fix: keep the coordinate bubble anchored to its point while zooming in offline HTML

In the exported HTML viewer, measuring a point and then zooming moved the X/Y
bubble away from the picked point. The coordinate capsule is lifted above its
anchor with `translate(-50%, calc(-50% - 16px))`, but the badge also scales with
the camera (`scale(zoom / baseZoom)`). The lift stayed 16 CSS px while the
capsule grew, so the bubble drifted into the point when zooming in and floated
far above it when zooming out:

| zoom | gap: point → bubble bottom  |
| ---- | --------------------------- |
| 1x   | +3.75px                     |
| 3.4x | -25.95px (covers the point) |
| 40x  | -476px                      |

`acexOverlayTransformPrefix` now carries the lift in `em` and multiplies it by
the same view scale that is appended to the transform, so the gap stays a
constant 1.231em (16px at the 13px reference font) at every zoom level and
tracks the capsule when the user changes the text height. Every other capsule
dimension (padding, radius, border) is already `em`-based, which is why the
lift is too: a px lift would reintroduce the same drift at a different font
size.

`ACEX_COORDINATE_BADGE_LIFT_EM` lives in `cad-html-core` and is consumed by
both the `AcExHtmlShell` stylesheet (first paint) and the runtime transform, so
the two can no longer disagree.

`cad-viewer` and `cad-simple-viewer` are unaffected: their badges are anchored
by `CSS2DObject.center` (a percentage) rather than a fixed pixel offset.
