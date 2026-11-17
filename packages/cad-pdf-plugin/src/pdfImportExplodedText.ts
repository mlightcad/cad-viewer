/**
 * Import-time recovery of exploded PDF text (SHX strokes / outlined fonts).
 *
 * Clear-cut lines become `AcDbText`; unread strokes stay for `pdftext`.
 */

import {
  AcApDocManager,
  AcApFontUtil,
  AcApI18n,
  AcApLlmSettingsService,
  AcApTextRecognitionService
} from '@mlightcad/cad-simple-viewer'
import type { AcDbDatabase, AcDbEntity } from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n.js'
import {
  AcApPdfTextSession,
  type PdfTextMeasurer
} from './AcApPdfTextSession.js'
import { pdfEntityToStroke } from './pdfEntityStrokes.js'
import {
  acapPdfOcrErrorMessage,
  acapPdfRecognizeExplodedTextLines
} from './pdfExplodedTextRecognition.js'
import type { PdfTextStroke } from './recognition/pdfGlyphClustering.js'
import type { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary.js'
import type { PdfRecPoint } from './recognition/pdfRecGeometry.js'
import type { PdfTextFontKind } from './recognition/pdfTextFontKind.js'

/** What {@link acapPdfRecognizeImportExplodedText} changed. */
export interface AcApPdfImportExplodedText {
  /** Paint-ordered entities with recovered texts in place of their strokes. */
  entities: AcDbEntity[]
  /** Lines converted to text. */
  converted: number
  /** Source stroke entities replaced. */
  replaced: number
  /** Lines clustered but left unread (still strokes). */
  unread: number
}

/** Options for {@link acapPdfRecognizeImportExplodedText}. */
export interface AcApPdfRecognizeImportExplodedTextOptions {
  /** `'local'` or `'ocr'` (see {@link AcApPdfImportOptions.recognizeExplodedText}). */
  mode: 'local' | 'ocr'
  /**
   * Notifies once when OCR was requested but no recognizer / no vision model
   * is available.
   */
  onOcrUnavailable?: () => void
  /** Notifies when a recognizer throws. */
  onOcrError?: (message: string) => void
}

/**
 * Recognizes exploded text among freshly imported entities and replaces
 * readable stroke groups with `AcDbText`.
 *
 * Nobody reviews the result, so only lines the dictionary (and optionally
 * OCR) can read are converted. Unread strokes stay as imported.
 *
 * @param db - Database receiving `PDF_SHX` / mesh text styles.
 * @param entities - Imported entities in paint order (not yet appended).
 * @param dictionary - Learned glyphs (`pdftext`).
 * @param options - Local vs OCR and notify hooks.
 * @param fillOutlines - Outlines of solid fills (filled outline-font glyphs).
 */
export async function acapPdfRecognizeImportExplodedText(
  db: AcDbDatabase,
  entities: AcDbEntity[],
  dictionary: PdfGlyphDictionary,
  options: AcApPdfRecognizeImportExplodedTextOptions,
  fillOutlines?: Map<AcDbEntity, PdfRecPoint[][]>
): Promise<AcApPdfImportExplodedText> {
  const strokes: PdfTextStroke<AcDbEntity>[] = []
  for (const entity of entities) {
    const stroke = pdfEntityToStroke(entity, entity)
    if (stroke) strokes.push(stroke)
  }
  // Outline fonts print glyphs as small solid fills; their contours read
  // like strokes once marked as filled (same as dimension stroke reading).
  for (const [id, contours] of fillOutlines ?? []) {
    for (const points of contours) {
      if (points.length >= 2) strokes.push({ id, points, filled: true })
    }
  }
  if (strokes.length === 0) {
    return { entities, converted: 0, replaced: 0, unread: 0 }
  }

  let ocrMode = options.mode
  if (ocrMode === 'ocr' && !AcApTextRecognitionService.hasRecognizer) {
    options.onOcrUnavailable?.()
    ocrMode = 'local'
  } else if (ocrMode === 'ocr') {
    // Soft hint when settings report no vision model (LLM plugin installed
    // but not configured). Still attempt OCR — another recognizer may work.
    const status = await AcApLlmSettingsService.getStatus()
    if (status && !status.vision) options.onOcrUnavailable?.()
  }

  let ocrErrorShown = false
  const recognized = await acapPdfRecognizeExplodedTextLines(strokes, {
    dictionary,
    mode: ocrMode,
    // Whole-page import mixes linework with text; do not pull long strokes
    // into text bands (same as dimension stroke reading).
    cluster: { attachLongStrokes: false },
    locale: AcApI18n.currentLocale,
    withBusy: (work, message) =>
      AcApDocManager.instance.withBusyIndicator(work, message),
    recognizingMessage: count =>
      acapPdfT('jig.pdftext.recognizing', { count }),
    onOcrError: error => {
      if (ocrErrorShown) return
      ocrErrorShown = true
      options.onOcrError?.(acapPdfOcrErrorMessage(error))
    }
  })

  const readable = recognized.filter(row => row.text.trim())
  if (readable.length === 0) {
    return {
      entities,
      converted: 0,
      replaced: 0,
      unread: recognized.length
    }
  }

  const session = new AcApPdfTextSession({
    db,
    fontKind: styleFontKind,
    rows: readable.map(row => ({
      line: row.line,
      kind: row.kind,
      text: row.text,
      source: row.source,
      included: true
    }))
  })

  const fonts = session.syncStyles()
  await loadFonts(fonts)
  const measure = await prepareMeasure(fonts)
  const texts = session.readyRows.map(row => {
    const text = session.createEntity(row, measure)
    const source = row.line.strokes[0]?.id
    if (source) {
      text.layer = source.layer
      text.color = source.color.clone()
    }
    return { text, row }
  })

  const position = new Map<AcDbEntity, number>()
  entities.forEach((entity, i) => position.set(entity, i))
  const consumed = new Set<AcDbEntity>()
  // Several lines may share the same earliest paint-order stroke (one solid
  // hatch holding multiple outline-font glyphs). Keep every text index.
  const firstOf = new Map<AcDbEntity, number[]>()
  texts.forEach(({ row }, index) => {
    let first: AcDbEntity | undefined
    let firstIndex = Infinity
    for (const stroke of row.line.strokes) {
      consumed.add(stroke.id)
      const at = position.get(stroke.id) ?? -1
      if (at >= 0 && at < firstIndex) {
        first = stroke.id
        firstIndex = at
      }
    }
    if (!first) return
    const list = firstOf.get(first)
    if (list) list.push(index)
    else firstOf.set(first, [index])
  })

  const next: AcDbEntity[] = []
  for (const entity of entities) {
    if (consumed.has(entity)) {
      const indices = firstOf.get(entity)
      if (indices) {
        for (const index of indices) next.push(texts[index].text)
      }
      continue
    }
    next.push(entity)
  }

  return {
    entities: next,
    converted: texts.length,
    replaced: consumed.size,
    unread: recognized.length - readable.length
  }
}

/** Loads the catalog fonts in `fonts` that are not loaded yet. */
async function loadFonts(fonts: string[]) {
  const missing = fonts.filter(
    font =>
      AcApFontUtil.findFontInfoByName(font) && !AcApFontUtil.isFontLoaded(font)
  )
  if (missing.length === 0) return
  try {
    await AcApDocManager.instance.loadFonts(missing)
  } catch (error) {
    console.warn('[PdfImport] Could not load text style fonts:', error)
  }
}

async function prepareMeasure(
  fonts: string[]
): Promise<PdfTextMeasurer | undefined> {
  try {
    await AcApFontUtil.prepareTextMeasurement(fonts)
  } catch (error) {
    console.warn(
      '[PdfImport] Could not load fonts to fit text widths:',
      error
    )
    return undefined
  }
  return (text, font, height, bigFont) =>
    AcApFontUtil.measureTextWidth(text, font, height, bigFont || undefined)
}

function styleFontKind(font: string): PdfTextFontKind | undefined {
  if (!font) return undefined
  const direct =
    AcApFontUtil.getFontType(font) ?? AcApFontUtil.getCatalogFontType(font)
  if (direct) return direct
  const replacement = AcApFontUtil.getReplacementFontName(font)
  if (!replacement || replacement === font) return undefined
  return (
    AcApFontUtil.getFontType(replacement) ??
    AcApFontUtil.getCatalogFontType(replacement)
  )
}
