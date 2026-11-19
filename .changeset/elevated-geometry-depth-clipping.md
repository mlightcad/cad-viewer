---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
---

Fix elevated geometry (e.g. survey contour polylines at elevation 1000+) being clipped out of plan views. The orthographic camera used a fixed depth band of WCS Z −500…500; it now grows to the Z extent of the drawing (`AcTrCamera.fitDepthRange`, `AcTrLayout.depthRange`) for the main view, paper-space viewports, the snap loupe and entity previews.
