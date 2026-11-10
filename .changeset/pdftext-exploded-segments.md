---
'@mlightcad/cad-pdf-plugin': patch
---

`pdftext` (Recover Texts) now works on PDFs that store text as many tiny separate line segments. The text height is estimated from strokes chained end to end instead of single segments, so such text is no longer split into hundreds of one-glyph fragments. Long strokes of a title taller than the body text are kept with their line instead of being left behind, while underlines and frames are still skipped.
