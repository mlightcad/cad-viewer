/**
 * Shared exploded-text recognition: cluster strokes into lines, read known
 * glyphs from the dictionary, optionally OCR the rest via
 * {@link AcApTextRecognitionService}.
 *
 * Used by `pdftext` and by import-time recovery. Callers never depend on a
 * specific OCR backend — only on the service registry.
 */

import {
  AcApI18n,
  AcApTextRecognitionService
} from '@mlightcad/cad-simple-viewer'

import type { PdfTextRowSource } from './AcApPdfTextSession.js'
import {
  clusterPdfTextStrokesMultiScale,
  isImplausiblePdfTextLine,
  type PdfTextClusterOptions,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering.js'
import type { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary.js'
import {
  classifyPdfTextLineFont,
  type PdfTextFontKind
} from './recognition/pdfTextFontKind.js'

/** Height of the rendered text line image sent to a recognizer, in pixels. */
export const PDF_OCR_IMAGE_TEXT_HEIGHT = 48

/** Longest recognizer error message shown to the user. */
const OCR_ERROR_MESSAGE_LIMIT = 200

/** One clustered line with optional recognized text. */
export interface AcApPdfExplodedTextLine<Id = unknown> {
  line: PdfTextLineCandidate<Id>
  kind: PdfTextFontKind
  /** Recognized string when known; empty when unread. */
  text: string
  source: PdfTextRowSource
}

/** Options for {@link acapPdfRecognizeExplodedTextLines}. */
export interface AcApPdfRecognizeExplodedTextOptions {
  dictionary: PdfGlyphDictionary
  /**
   * `'local'` — dictionary only.
   * `'ocr'` — dictionary, then {@link AcApTextRecognitionService} for unread
   * lines (falls back to local when no recognizer is registered).
   */
  mode: 'local' | 'ocr'
  /**
   * When `mode` is `'ocr'`, only this recognizer is used. When omitted, every
   * registered recognizer is tried in order (e.g. `pdftext`).
   */
  recognizerId?: string
  /** Clustering tuning (import passes `attachLongStrokes: false`). */
  cluster?: PdfTextClusterOptions
  /** UI locale passed to the recognizer. Defaults to the current locale. */
  locale?: string
  /**
   * Runs the OCR batch behind a busy indicator (or any host wrapper).
   * When omitted, OCR runs without a wrapper.
   */
  withBusy?: <T>(work: () => Promise<T>, message: string) => Promise<T>
  /** Message shown while OCR runs (`{count}` = number of line images). */
  recognizingMessage?: (count: number) => string
  /** Called once per recognizer failure (bad key, network, ...). */
  onOcrError?: (error: unknown) => void
  /**
   * Longest wait for the OCR batch, in milliseconds. After this, unread
   * lines stay unread so the review panel can still open. `0` waits
   * forever. Defaults to {@link PDF_OCR_BATCH_TIMEOUT_MS}.
   */
  timeoutMs?: number
}

/**
 * Longest wait for exploded-text OCR. A hung local engine (model CDN /
 * wasm worker) would otherwise keep `pdftext` from opening the palette.
 */
export const PDF_OCR_BATCH_TIMEOUT_MS = 8_000

/**
 * Clusters strokes into text lines and fills what the dictionary (and
 * optionally OCR) can read. Unread lines keep an empty `text` and
 * `source: 'unread'`.
 */
export async function acapPdfRecognizeExplodedTextLines<Id>(
  strokes: PdfTextStroke<Id>[],
  options: AcApPdfRecognizeExplodedTextOptions
): Promise<AcApPdfExplodedTextLine<Id>[]> {
  // Whole-page import mixes body text with taller SHX titles; one height
  // estimate would reject the titles as frames. Multi-scale recovers them.
  const { lines } = clusterPdfTextStrokesMultiScale(strokes, options.cluster)
  const texts: Array<string | undefined> = lines.map(line =>
    options.dictionary.lookup(line)
  )
  const sources: PdfTextRowSource[] = texts.map(text =>
    text ? 'dictionary' : 'unread'
  )

  if (options.mode === 'ocr') {
    await recognizeUnreadLines(lines, texts, options)
    texts.forEach((text, i) => {
      if (text && sources[i] === 'unread') sources[i] = 'ocr'
    })
  }

  return lines.map((line, i) => ({
    line,
    kind: classifyPdfTextLineFont(line),
    text: texts[i] ?? '',
    source: sources[i]
  }))
}

/**
 * Sends every line `texts` has no entry for to OCR in one batch and fills
 * `texts` in place. No-op when no recognizer is registered or no images can
 * be rendered.
 *
 * OCR answers are not taught to the glyph dictionary.
 *
 * @returns How many lines OCR read.
 */
export async function acapPdfOcrExplodedTextLines<Id>(
  lines: PdfTextLineCandidate<Id>[],
  texts: Array<string | undefined>,
  options: Pick<
    AcApPdfRecognizeExplodedTextOptions,
    | 'locale'
    | 'recognizerId'
    | 'withBusy'
    | 'recognizingMessage'
    | 'onOcrError'
    | 'timeoutMs'
  > = {}
): Promise<number> {
  return recognizeUnreadLines(lines, texts, options)
}

async function recognizeUnreadLines<Id>(
  lines: PdfTextLineCandidate<Id>[],
  texts: Array<string | undefined>,
  options: Pick<
    AcApPdfRecognizeExplodedTextOptions,
    | 'locale'
    | 'recognizerId'
    | 'withBusy'
    | 'recognizingMessage'
    | 'onOcrError'
    | 'timeoutMs'
  >
): Promise<number> {
  if (options.recognizerId) {
    if (!AcApTextRecognitionService.has(options.recognizerId)) return 0
  } else if (!AcApTextRecognitionService.hasRecognizer) {
    return 0
  }
  const pending: number[] = []
  const images: string[] = []
  lines.forEach((line, i) => {
    if (texts[i]) return
    // Mega / glued linework images are useless for OCR and inflate the
    // busy-indicator count (e.g. “recognizing 146 lines” with garbage).
    if (isImplausiblePdfTextLine(line)) return
    const image = acapPdfRenderTextLineImage(line)
    if (!image) return
    pending.push(i)
    images.push(image)
  })
  if (images.length === 0) return 0

  const locale = options.locale ?? AcApI18n.currentLocale
  const message =
    options.recognizingMessage?.(images.length) ??
    `Recognizing ${images.length} text line(s)…`
  const controller = new AbortController()
  const work = () =>
    AcApTextRecognitionService.recognizeBatch(
      { images, locale, signal: controller.signal },
      {
        onError: error => options.onOcrError?.(error),
        ...(options.recognizerId ? { recognizerId: options.recognizerId } : {})
      }
    )
  const run = () =>
    options.withBusy ? options.withBusy(work, message) : work()
  const results = await raceOcrBatch(
    run,
    options.timeoutMs ?? PDF_OCR_BATCH_TIMEOUT_MS,
    controller,
    images.length
  )

  let recognized = 0
  pending.forEach((lineIndex, i) => {
    if (!results[i]) return
    texts[lineIndex] = results[i]
    recognized++
  })
  return recognized
}

/**
 * Resolves unread placeholders when OCR does not finish in `timeoutMs`.
 * `0` waits forever. Aborts the in-flight request so a hung engine can
 * stop; `Promise.race` still wins if the engine ignores abort.
 */
async function raceOcrBatch(
  work: () => Promise<Array<string | undefined>>,
  timeoutMs: number,
  controller: AbortController,
  imageCount: number
): Promise<Array<string | undefined>> {
  const unread = (): Array<string | undefined> =>
    Array.from({ length: imageCount }, () => undefined)
  if (!(timeoutMs > 0)) return work()

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<Array<string | undefined>>(resolve => {
    timer = setTimeout(() => {
      controller.abort()
      resolve(unread())
    }, timeoutMs)
  })
  try {
    return await Promise.race([work(), timeout])
  } catch {
    return unread()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Renders a text line upright, dark on white, as a PNG data URL for OCR.
 *
 * Near-horizontal underlines under the letters are omitted so they do not
 * confuse the recognizer; they stay in {@link PdfTextLineCandidate.strokes}
 * so Apply can still erase them with the glyphs.
 *
 * @returns The data URL, or `undefined` outside a browser.
 */
export function acapPdfRenderTextLineImage(
  line: PdfTextLineCandidate
): string | undefined {
  if (typeof document === 'undefined') return undefined
  if (!(line.height > 0.5) || isImplausiblePdfTextLine(line)) return undefined
  const scale = PDF_OCR_IMAGE_TEXT_HEIGHT / line.height
  const pad = PDF_OCR_IMAGE_TEXT_HEIGHT * 0.5
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const local = (x: number, y: number) => {
    const dx = x - line.position.x
    const dy = y - line.position.y
    return { u: dx * c + dy * s, v: -dx * s + dy * c }
  }
  const ink = line.strokes.filter(
    stroke => !isUnderlineStroke(stroke, local, line)
  )
  if (ink.length === 0) return undefined
  let minV = 0
  let maxV = line.height
  for (const stroke of ink) {
    for (const p of stroke.points) {
      const { v } = local(p.x, p.y)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(line.width * scale + pad * 2)
  canvas.height = Math.ceil((maxV - minV) * scale + pad * 2)
  // Cap canvas size — glued mega-lines would allocate tens of megapixels.
  if (canvas.width > 4096 || canvas.height > 1024) return undefined
  const g = canvas.getContext('2d')
  if (!g) return undefined
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.strokeStyle = '#000000'
  g.lineWidth = Math.max(1.5, PDF_OCR_IMAGE_TEXT_HEIGHT / 16)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const stroke of ink) {
    g.beginPath()
    stroke.points.forEach((p, i) => {
      const { u, v } = local(p.x, p.y)
      const px = pad + u * scale
      const py = pad + (maxV - v) * scale
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    })
    g.stroke()
  }
  return canvas.toDataURL('image/png')
}

/** True for a long, flat stroke sitting on the baseline (an underline). */
function isUnderlineStroke(
  stroke: { points: Array<{ x: number; y: number }> },
  local: (x: number, y: number) => { u: number; v: number },
  line: PdfTextLineCandidate
): boolean {
  if (stroke.points.length < 2) return false
  let minU = Infinity
  let maxU = -Infinity
  let minV = Infinity
  let maxV = -Infinity
  for (const p of stroke.points) {
    const { u, v } = local(p.x, p.y)
    minU = Math.min(minU, u)
    maxU = Math.max(maxU, u)
    minV = Math.min(minV, v)
    maxV = Math.max(maxV, v)
  }
  const du = maxU - minU
  const dv = maxV - minV
  // Flat, longer than a glyph, and in the bottom quarter of the line box.
  return (
    du > line.height * 1.2 &&
    dv < line.height * 0.2 &&
    du > dv * 8 &&
    minV < line.height * 0.25
  )
}

/** One-line, length-limited description of a recognizer error. */
export function acapPdfOcrErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : String(error ?? 'unknown error')
  const text = raw.replace(/\s+/g, ' ').trim() || String(error)
  return text.length > OCR_ERROR_MESSAGE_LIMIT
    ? `${text.slice(0, OCR_ERROR_MESSAGE_LIMIT - 1)}…`
    : text
}
