---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': patch
---

`pdfdim` opens a palette review like `pdftext` / `pdfhatch`: edit recovered values, pick or create a dim style (with the shared dim-style preview), then Apply. Value text may still be exploded strokes (before `pdftext`) — digits and CAD symbols are read with a built-in grid template matcher (no LLM), and linear dimensions fall back to the measured length when strokes cannot be read. Recovered dimensions pin paper sizes via entity overrides so an existing style with a large DIMSCALE cannot hide extension lines or blow up the text. Also preserves inside/outside arrow direction and rejects stroke misreadings such as "111".
