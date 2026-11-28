---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-html-core': patch
---

Ignore absurd WCS Z values (~1e83) when fitting the orthographic depth band so corrupt model-space vertices no longer blank paper-space opens.
