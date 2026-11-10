---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-llm-plugin': patch
'@mlightcad/cad-pdf-plugin': patch
---

`pdftext` (Recover Texts) now recognizes all lines at once: lines are read from the glyph dictionary, every other line goes to the AI model in a few batch requests (up to 20 line images each), and the whole selection is converted in one step without per-line confirmation. Only lines nothing could read are still prompted. When text recognition fails (invalid API key, network, quota, unexpected answer), the reason is shown instead of being silently ignored.

`AcApTextRecognitionService` gains `recognizeBatch()` and an `onError` option on `recognize()` / `recognizeBatch()`; recognizers can implement the optional `recognizeBatch` method.

Erasing many entities at once is much faster: `AcApEntityService.eraseEntities` removes them from each block in one pass instead of scanning the block per entity, and the view removes them in bulk (`AcTrBatchedGroup.removeEntities`, `AcTrScene.removeEntities`), compacting each geometry batch once instead of once per entity. Converting about 6000 PDF text strokes in a 93,000-entity drawing went from over 40 seconds of frozen UI to about half a second.
