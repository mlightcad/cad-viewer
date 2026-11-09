---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
---

PDF conversion follow-ups:
- `ipdf` gives dashed strokes `PDF_DASH_*` linetypes and imported text `PDF_<font family>` text styles. With the `fillHatches` option it turns filled areas into solid hatches, with holes from even-odd fills.
- `pdfdim` also recognizes angular dimensions.
- `pdfscale` pre-fills the real length from the scale that dimension texts in the selection imply.
- `pdftext` remembers confirmed glyph shapes across sessions.
- A new user guide page, "Converting PDF Drawings", is available in all seven languages.
