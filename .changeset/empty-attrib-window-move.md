---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
---

Empty TEXT/ATTRIB strings no longer contribute a logical insertion box to INSERT spatial-index children, so a left-to-right window around a stamp (including a second MOVE after relocating title-block companions) still selects the INSERT when a far empty ATTRIB would otherwise reject containment. Entity reconverts after MOVE also share the serial convert queue instead of racing parallel batchConvert runs.
