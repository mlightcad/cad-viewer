---
'@mlightcad/cad-simple-viewer': patch
---

Smart Blocks Search and Convert (BSEARCH/BDETECT) now matches light and heavy 2D polylines by the outline they trace instead of their vertex list. Copies of a block that a PDF round trip rebuilt with different vertices (curves or rounded corners recovered as arcs in one copy and left as short segments in another, or closed outlines starting at another vertex) are found again.
