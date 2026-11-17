import {
  type AcApPluginManager,
  AcApTextRecognitionService
} from '@mlightcad/cad-simple-viewer'

import {
  acapPaddleOcrConfigure,
  type AcApPaddleOcrOptions
} from './AcApPaddleOcrConfig.js'
import { PADDLE_OCR_SERVICE_ID } from './constants.js'
import { paddleOcrT, registerPaddleOcrI18n } from './i18n/index.js'

/** Loads the main bundle (still without wasm) on first OCR use. */
const loadMain = () => import('@mlightcad/cad-paddleocr-plugin')

/** Options for {@link registerLazyPaddleOcrPlugin}. */
export type AcApPaddleOcrRegisterOptions = AcApPaddleOcrOptions

/**
 * Registers the local PaddleOCR text recognizer for lazy loading.
 *
 * Import from `@mlightcad/cad-paddleocr-plugin/register` so the main bundle
 * and `@paddleocr/paddleocr-js` (wasm + models) stay out of the application
 * entry chunk.
 *
 * @param _pluginManager - Accepted for API symmetry with other plugins; unused
 *   because this package registers no trigger commands.
 * @param options - Runtime options such as ORT `wasmPaths`.
 */
export function registerLazyPaddleOcrPlugin(
  _pluginManager?: AcApPluginManager,
  options: AcApPaddleOcrRegisterOptions = {}
): void {
  registerPaddleOcrI18n()

  if (options.wasmPaths) {
    acapPaddleOcrConfigure({ wasmPaths: options.wasmPaths })
  }

  AcApTextRecognitionService.register({
    id: PADDLE_OCR_SERVICE_ID,
    label: () => paddleOcrT('ocrLabel'),
    keyword: () => ({
      display: paddleOcrT('ocrKeywordDisplay'),
      local: paddleOcrT('ocrKeywordLocal'),
      global: paddleOcrT('ocrKeywordGlobal')
    }),
    // Local engine is available whenever the package is installed.
    isAvailable: () => true,
    recognize: async request =>
      (await loadMain()).acapPaddleOcrRecognizeText(request),
    recognizeBatch: async request =>
      (await loadMain()).acapPaddleOcrRecognizeTextBatch(request)
  })
}

export {
  acapPaddleOcrConfigure,
  type AcApPaddleOcrOptions
} from './AcApPaddleOcrConfig.js'
export { PADDLE_OCR_SERVICE_ID } from './constants.js'
export {
  type AcApPaddleOcrLabelKey,
  paddleOcrT,
  registerPaddleOcrI18n
} from './i18n/index.js'
