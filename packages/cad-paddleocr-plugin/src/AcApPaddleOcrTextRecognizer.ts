/**
 * Local PaddleOCR.js text recognition for exploded CAD stroke lines.
 *
 * The SDK (wasm + models) loads on the first call via dynamic import and a
 * singleton engine; later calls reuse it.
 */

import type {
  AcApTextBatchRecognitionRequest,
  AcApTextRecognitionRequest
} from '@mlightcad/cad-simple-viewer'

import { acapPaddleOcrResolvedWasmPaths } from './AcApPaddleOcrConfig.js'
import {
  acapPaddleOcrResolveModelAssets,
  PADDLE_OCR_DET_MODEL,
  PADDLE_OCR_REC_MODEL
} from './AcApPaddleOcrModelAssets.js'

/** Most line images sent to `predict` in one call. */
const BATCH_SIZE = 8

/** Minimal engine surface — keeps `@paddleocr/paddleocr-js` out of public .d.ts. */
interface AcApPaddleOcrEngine {
  predict: (
    image: Blob | Blob[],
    params?: Record<string, unknown>
  ) => Promise<Array<{ items: Array<{ text: string; score?: number }> }>>
  dispose: () => Promise<void> | void
}

let enginePromise: Promise<AcApPaddleOcrEngine> | undefined
let engineLocaleKey: string | undefined

/** Clears the cached engine (tests only). */
export async function acapPaddleOcrResetEngineForTests(): Promise<void> {
  if (enginePromise) {
    try {
      await (await enginePromise).dispose()
    } catch {
      // ignore
    }
  }
  enginePromise = undefined
  engineLocaleKey = undefined
}

/**
 * Reads one line image with PaddleOCR. Returns `undefined` when nothing is
 * legible.
 */
export async function acapPaddleOcrRecognizeText(
  request: AcApTextRecognitionRequest
): Promise<string | undefined> {
  const [text] = await acapPaddleOcrRecognizeTextBatch({
    images: [request.image],
    locale: request.locale,
    signal: request.signal
  })
  return text
}

/**
 * Reads several line images with PaddleOCR. Empty / illegible lines stay
 * `undefined` so {@link AcApTextRecognitionService} can fall back to the
 * next recognizer (typically the vision LLM).
 */
export async function acapPaddleOcrRecognizeTextBatch(
  request: AcApTextBatchRecognitionRequest
): Promise<Array<string | undefined>> {
  throwIfAborted(request.signal)
  if (request.images.length === 0) return []

  const engine = await acapPaddleOcrEnsureEngine(request.locale, request.signal)
  const results: Array<string | undefined> = request.images.map(() => undefined)

  for (let start = 0; start < request.images.length; start += BATCH_SIZE) {
    throwIfAborted(request.signal)
    const slice = request.images.slice(start, start + BATCH_SIZE)
    const blobs = slice.map(dataUrlToBlob)
    const predictions = await engine.predict(blobs)
    predictions.forEach((result, i) => {
      results[start + i] = joinOcrItems(result.items)
    })
  }

  return results
}

/**
 * Creates (or reuses) the PaddleOCR engine. Locale changes recreate it so
 * the recognition dictionary matches the UI language.
 */
export async function acapPaddleOcrEnsureEngine(
  locale?: string,
  signal?: AbortSignal
): Promise<AcApPaddleOcrEngine> {
  throwIfAborted(signal)
  const lang = localeToPaddleLang(locale)
  if (enginePromise && engineLocaleKey === lang) {
    return enginePromise
  }

  if (enginePromise) {
    try {
      const previous = await enginePromise
      await previous.dispose()
    } catch {
      // Ignore dispose failures when swapping locale.
    }
    enginePromise = undefined
  }

  engineLocaleKey = lang
  enginePromise = createEngine(lang, signal).catch(error => {
    enginePromise = undefined
    engineLocaleKey = undefined
    throw error
  })
  return enginePromise
}

async function createEngine(
  lang: string,
  signal?: AbortSignal
): Promise<AcApPaddleOcrEngine> {
  throwIfAborted(signal)
  const [{ PaddleOCR }, assets] = await Promise.all([
    import('@paddleocr/paddleocr-js'),
    acapPaddleOcrResolveModelAssets(signal)
  ])
  throwIfAborted(signal)

  const wasmPaths = acapPaddleOcrResolvedWasmPaths()
  return PaddleOCR.create({
    lang,
    ocrVersion: 'PP-OCRv5',
    textDetectionModelName: PADDLE_OCR_DET_MODEL,
    textDetectionModelAsset: assets.detection,
    textRecognitionModelName: PADDLE_OCR_REC_MODEL,
    textRecognitionModelAsset: assets.recognition,
    worker: true,
    ortOptions: {
      backend: 'wasm',
      ...(wasmPaths ? { wasmPaths } : {})
    }
  }) as Promise<AcApPaddleOcrEngine>
}

/**
 * Maps a UI locale to a PaddleOCR `lang` preset that PP-OCRv5 accepts.
 *
 * With `ocrVersion: 'PP-OCRv5'`, paddleocr-js only allows `ch`,
 * `chinese_cht`, `en`, and `japan` — other values throw even when explicit
 * det/rec model names are set. Latin UI locales (`tr`, `cs`, …) and
 * unsupported scripts (`ko`, `ar`) therefore map to `en`.
 */
export function localeToPaddleLang(locale?: string): string {
  const normalized = (locale ?? '').toLowerCase().replace(/_/g, '-')
  if (normalized.startsWith('ja')) return 'japan'
  if (
    normalized.startsWith('zh-hant') ||
    normalized.startsWith('zh-tw') ||
    normalized.startsWith('zh-hk') ||
    normalized.startsWith('zh-mo')
  ) {
    return 'chinese_cht'
  }
  if (normalized.startsWith('zh') || !normalized) return 'ch'
  if (normalized.startsWith('en')) return 'en'
  // Latin-script and other UI locales: PP-OCRv5 has no dedicated model here.
  return 'en'
}

/** Joins detection boxes on one line crop into a single string. */
export function joinOcrItems(
  items: Array<{ text: string; score?: number }> | undefined
): string | undefined {
  if (!items || items.length === 0) return undefined
  const text = items
    .map(item => item.text?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim()
  return text || undefined
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma < 0) {
    throw new Error('Expected a data URL image for PaddleOCR')
  }
  const meta = dataUrl.slice(5, comma)
  const data = dataUrl.slice(comma + 1)
  const isBase64 = /;base64$/i.test(meta)
  const mime = meta.split(';')[0] || 'image/png'
  if (isBase64) {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(data)], { type: mime })
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Aborted', 'AbortError')
  }
}
