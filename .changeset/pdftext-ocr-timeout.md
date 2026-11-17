---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-paddleocr-plugin': patch
---

`pdftext` Auto no longer waits forever on a hung local OCR engine. Model CDN fetches time out, and unread lines still open in the review panel so the command can be used without PaddleOCR models cached.
