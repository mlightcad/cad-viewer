---
'@mlightcad/cad-paddleocr-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-llm-plugin': minor
'@mlightcad/cad-editor': patch
'@mlightcad/cad-editor-demo': patch
'@mlightcad/cad-simple-viewer-demo': patch
---

feat(cad-paddleocr-plugin): add lazy local PaddleOCR provider for exploded text

Registers `paddleocr` in `AcApTextRecognitionService`. PDF import lists each
*available* OCR option under “Recognize exploded text”: local PaddleOCR and
every configured vision-capable LLM **model** (e.g. `kkidc — model-id`), not
a single provider row; long labels stay inside the dialog. The AI ribbon PDF
“Recover Text” control is a dropdown so you can pick Auto or a specific model
for `pdftext`. Unavailable options are omitted. Demos copy ONNX Runtime wasm
to `vendor/onnxruntime/` and resolve that path against `document.baseURI` so
PaddleOCR works with Vite `base: './'`. Wasm and ONNX models load only on
first PaddleOCR use.
