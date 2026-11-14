---
'@mlightcad/cad-simple-viewer': patch
---

fix: keep Insert gallery block thumbnails from leaking title-block text into the drawing

Opening the block dropdown regenerates geometry thumbnails through the live
renderer. TrueType MTEXT in large blocks (for example TITLE-BLOCK) no longer
enqueues scene-level mesh-glyph instances that later flush when inserting an
unrelated stamp such as CARTANG.
