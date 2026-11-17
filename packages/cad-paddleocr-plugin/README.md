# @mlightcad/cad-paddleocr-plugin

Local [PaddleOCR.js](https://www.npmjs.com/package/@paddleocr/paddleocr-js) text
recognition for [cad-viewer](https://github.com/mlightcad/cad-viewer).

Registers a recognizer (`paddleocr`) into `AcApTextRecognitionService` so
`pdftext` / PDF import OCR in
[`@mlightcad/cad-pdf-plugin`](../cad-pdf-plugin/README.md) can read exploded
stroke text in the browser without a vision LLM. Hosts typically register this
**before** `@mlightcad/cad-llm-plugin` so unread lines still fall back to the
configured vision model.

## Features

- Lazy load: import `@mlightcad/cad-paddleocr-plugin/register` at startup; the
  main package and `@paddleocr/paddleocr-js` (wasm + ONNX models) load only on
  the first OCR request
- Singleton PP-OCRv5 mobile engine in a Worker
- Model archives fetched once (Cache Storage), with Baidu BOS → Hugging Face
  fallback when CORS fails
- Host-configurable ONNX Runtime `wasmPaths` (same-origin copy of
  `onnxruntime-web` wasm files)

## Usage

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazyPaddleOcrPlugin } from '@mlightcad/cad-paddleocr-plugin/register'

registerLazyPaddleOcrPlugin(AcApDocManager.instance.pluginManager, {
  wasmPaths: './vendor/onnxruntime/'
})
```

Serve the ORT wasm files from that path (for example copy
`node_modules/onnxruntime-web/dist/ort-wasm*` into `public/vendor/onnxruntime/`).
`@mlightcad/cad-editor` and the demos do this automatically when the package is
installed.

## Notes

- This package does **not** replace the LLM recognizer; it adds a local path.
- Dimension digit reading in `pdfdim` stays on the built-in local templates and
  does not use PaddleOCR or the LLM.
