---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-llm-plugin': patch
'@mlightcad/cad-pdf-plugin': patch
---

Fix sustained high CPU (a full core) and memory use while a drawing sits idle:

- With a vision-capable LLM provider configured, the LLM OCR recognizers and the PDF Recover Text dropdown triggered each other forever: every sync re-registered unchanged recognizers, each registration fired `AcApTextRecognitionService.events.changed`, and the dropdown answered by calling `listAvailable()`, which synced again. Each pass re-derived the API-key encryption key (PBKDF2) and rebuilt the ribbon. The sync now skips unchanged recognizers, and the dropdown only rebuilds when its rows change.
- The UCS icon overlay rewrote its SVG attributes on every animation frame, forcing layout/paint 60 times per second. It now only touches the DOM when the icon's position or orientation changes.
- `newDocument()` no longer eagerly loads the full default font preset (including the ~6 MB CJK `simsun.woff`) for the blank template, which has no text. Fonts load on demand the first time text is drawn.
