---
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-exporter': patch
'@mlightcad/three-renderer': patch
---

fix: embed raster and OLE images in headless HTML export

Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter now decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG.
