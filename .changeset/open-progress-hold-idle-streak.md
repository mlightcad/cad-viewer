---
'@mlightcad/cad-simple-viewer': patch
---

Require two consecutive idle polls before hiding the open-file "Rendering drawing ..." overlay, so a brief gap between convert batches cannot drop the spinner early. Whether the overlay also waits for deferred text/INSERT glyphs remains controlled only by `waitForTextGeometry`. Mark layouts as loaded when the open-time entity stream enqueues work so progressive open does not double-convert the active layout and keep the spinner up after linework should have finished.
