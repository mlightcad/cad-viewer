# @mlightcad/cad-paddleocr-plugin

## 1.8.0-preview.6

### Minor Changes

- b9af87c: feat(cad-paddleocr-plugin): add lazy local PaddleOCR provider for exploded text

  Registers `paddleocr` in `AcApTextRecognitionService`. PDF import lists each
  _available_ OCR option under “Recognize exploded text”: local PaddleOCR and
  every configured vision-capable LLM **model** (e.g. `kkidc — model-id`), not
  a single provider row; long labels stay inside the dialog. The AI ribbon PDF
  “Recover Text” control is a dropdown so you can pick Auto or a specific model
  for `pdftext`. Unavailable options are omitted. Demos copy ONNX Runtime wasm
  to `vendor/onnxruntime/` and resolve that path against `document.baseURI` so
  PaddleOCR works with Vite `base: './'`. Wasm and ONNX models load only on
  first PaddleOCR use.

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

- 7b6bac6: `pdftext` Auto no longer waits forever on a hung local OCR engine. Model CDN fetches time out, and unread lines still open in the review panel so the command can be used without PaddleOCR models cached.
- Updated dependencies [2ee892d]
- Updated dependencies [663c251]
- Updated dependencies [e4d1399]
- Updated dependencies [704af08]
- Updated dependencies [9a09628]
- Updated dependencies [b9af87c]
- Updated dependencies [0dd562b]
- Updated dependencies [0ff8b62]
- Updated dependencies [7b6bac6]
- Updated dependencies [0dd562b]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.6
