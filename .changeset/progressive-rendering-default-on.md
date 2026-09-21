---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

Enable progressive rendering by default when opening drawings so geometry paints and the camera reframes during convert; pass `progressiveRendering: false` to keep the previous wait-until-fully-converted behavior.
