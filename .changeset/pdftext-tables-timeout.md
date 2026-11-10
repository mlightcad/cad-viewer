---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-llm-plugin': patch
---

`pdftext` (Recover Texts) on tables: grid lines that the PDF splits into short segments are no longer taken for text strokes, so table cells are no longer glued into tall blocks read as vertical text, one glyph per line. The text direction of each phrase is now chosen by glyph spacing (tight along the baseline), which also handles widely spaced titles and narrow table columns; short ambiguous phrases such as `Q1` follow the rest of the drawing.

AI text recognition requests now time out after 120 seconds, so a provider that never answers no longer leaves the command loading forever; the timeout is reported like other recognition errors.
