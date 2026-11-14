---
'@mlightcad/pdf-renderer': patch
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-pdf-exporter': patch
---

Fix Hangul PDF text and frozen-viewport layer plotting

Embed Hangul-capable TrueType faces without pdf-lib subsetting so Korean
glyphs stay visible in Acrobat, and keep plotting model content through
viewports whose border layer is Off/Frozen (AutoCAD frame-hide workflow).
