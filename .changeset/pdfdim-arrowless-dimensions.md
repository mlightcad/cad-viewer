---
'@mlightcad/cad-pdf-plugin': patch
---

fix(cad-pdf-plugin): recover dimensions drawn without arrowheads or ticks

PDFDIM (Recover Dims) only paired arrowheads or architectural ticks, so a
dimension line ending on its extension lines with no terminators was reported
as "no dimensions". Such dimensions are now recognized when both extension
lines run past the dimension line and a numeric value text sits beside it. The
`PDF_DIM` style uses `_NONE` arrows when most recovered linear dimensions had
no terminators, so they keep their original look.
