---
'@mlightcad/cad-simple-viewer': patch
---

Fix PLINE arc/line tangency to match AutoCAD

Default Arc mode now keeps G1 continuity with the previous segment after arcs
(exit-tangent math used the sagitta instead of the true center, and swapped
`atan2` arguments). Angle keeps that previous tangent and projects the
endpoint; Direction sets a custom start tangent; Length draws the next line
along the previous exit angle (tangent after an arc). Shared bulge/arc helpers
live in `@mlightcad/geometry-engine` (`acgeCenterFromBulge`,
`acgeBulgeFromStartEndDirection`, …); the viewer keeps only PLINE interactive
orchestration.
