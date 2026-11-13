---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
---

Fix jig previews and pasted blocks drawing with thicker lines than the drawing. Transient previews (PASTECLIP, MOVE, COPY, grip edits, ...) used to force lineweights on, so they showed fat lines with LWDISPLAY off, and a block template built for the preview was then reused for the committed entity. Previews now follow LWDISPLAY like the entities they preview. `AcTrRenderer` also reports `cacheVariant`, so block templates built with lineweights shown are cached apart from regular ones.
