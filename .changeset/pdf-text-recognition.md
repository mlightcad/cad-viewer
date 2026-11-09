---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-agent-plugin': minor
---

New `pdftext` command converts exploded PDF text (SHX line text, outlined fonts) back into text objects. It clusters strokes into lines, asks for each line's text, and learns glyph shapes so repeated text converts automatically. `ipdf` now merges text runs that continue one line. `AcApTextRecognitionService` lets hosts register OCR. The CAD Agent plugin registers a recognizer backed by the configured vision model, which pre-fills `pdftext` prompts.
