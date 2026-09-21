---
'@mlightcad/cad-simple-viewer': patch
---

Require two consecutive idle polls before hiding the open-file "Rendering drawing ..." overlay, so a brief gap between convert batches cannot drop the spinner early. Whether the overlay also waits for deferred text/INSERT glyphs remains controlled only by `waitForTextGeometry`.
