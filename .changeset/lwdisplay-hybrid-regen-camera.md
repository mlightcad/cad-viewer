---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/three-renderer': patch
---

fix: keep the camera when regenerating for LWDISPLAY, and toggle lineweights without a full rebuild after the first fat-line upgrade

LWDISPLAY used to call `clear()` + regen on every toggle, which snapped the view back to the origin. REGEN now preserves layout cameras via `clearForRegen()`, and after the scene has fat-line geometry later toggles only flip `linewidth` (including batch-owned material clones).
