/**
 * Local PaddleOCR.js text recognition for cad-viewer.
 *
 * Registers into `AcApTextRecognitionService` (via `/register`) so
 * `@mlightcad/cad-pdf-plugin` (`pdftext` / PDF import OCR) can read exploded
 * stroke text without a vision LLM. Wasm and model archives load only on the
 * first recognition request.
 *
 * @packageDocumentation
 */

export {
  acapPaddleOcrConfigure,
  acapPaddleOcrGetOptions,
  acapPaddleOcrResolvedWasmPaths,
  type AcApPaddleOcrOptions
} from './AcApPaddleOcrConfig.js'
export {
  acapPaddleOcrResolveModelAssets,
  buildUstar,
  PADDLE_OCR_DET_MODEL,
  PADDLE_OCR_FETCH_TIMEOUT_MS,
  PADDLE_OCR_REC_MODEL,
  type AcApPaddleOcrModelAsset
} from './AcApPaddleOcrModelAssets.js'
export {
  acapPaddleOcrEnsureEngine,
  acapPaddleOcrRecognizeText,
  acapPaddleOcrRecognizeTextBatch,
  acapPaddleOcrResetEngineForTests,
  dataUrlToBlob,
  joinOcrItems,
  localeToPaddleLang
} from './AcApPaddleOcrTextRecognizer.js'
export { PADDLE_OCR_SERVICE_ID } from './constants.js'
