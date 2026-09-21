---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

Enable progressive rendering by default when opening drawings so geometry paints and the camera reframes during convert; keep the "Rendering drawing ..." overlay up through deferred glyph finalize so pan/zoom stay blocked while the scene is still catching up. Pass `progressiveRendering: false` to keep the previous wait-until-fully-converted behavior.
