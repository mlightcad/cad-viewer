---
'@mlightcad/cad-simple-viewer': patch
---

Preload text-style fonts when the STYLE conversion stage ends so downloads overlap LAYER/BLOCK/ENTITY parse and linework convert; glyph finalize awaits the shared promise instead of starting font loads only at draw time.
