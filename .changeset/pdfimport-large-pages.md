---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-simple-viewer': patch
---

fix(pdfimport): import large PDF pages without freezing the browser

PDFIMPORT on dense pages (hundreds of thousands of paths) froze the tab and
threw "Maximum call stack size exceeded". The imported entities are now
committed in chunks of 5000, still as one undo record, and the view's convert
queue no longer spreads the whole batch into `push(...)`.
