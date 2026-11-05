---
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-plugin': patch
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
---

fix: skip in-batch selection overlays in HTML export

Mark shared INSERT and mesh-glyph highlight overlays with
`transientHighlight` so HTML export does not bake the cyan selection
tint into the offline scene.
