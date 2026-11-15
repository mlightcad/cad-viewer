/**
 * Builds dimension-value texts from exploded PDF text strokes so `pdfdim`
 * can run before `pdftext` has turned those strokes into TEXT entities.
 *
 * Recognition is local and lightweight: the `pdftext` glyph dictionary, then
 * a built-in digit / symbol template matcher — no LLM or network OCR.
 */

import type { AcDbEntity } from '@mlightcad/data-model'

import { pdfEntityToStroke } from './pdfEntityStrokes'
import { recognizePdfDimStrokeText } from './recognition/pdfDimDigitRecognition'
import {
  parsePdfDimensionValue,
  type PdfDimInput,
  type PdfDimText,
  type PdfDimUnreadText
} from './recognition/pdfDimensionPattern'
import {
  clusterPdfTextStrokes,
  type PdfTextLineCandidate
} from './recognition/pdfGlyphClustering'
import type { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary'

/**
 * Clusters curve entities into text line candidates (frames and long
 * dimension lines are rejected by the clusterer).
 */
export function acapPdfCollectDimStrokeLines<Id>(
  entities: Map<Id, AcDbEntity>
): PdfTextLineCandidate<Id>[] {
  const strokes = []
  for (const [id, entity] of entities) {
    const stroke = pdfEntityToStroke(entity, id)
    if (stroke) strokes.push(stroke)
  }
  return clusterPdfTextStrokes(strokes).lines
}

/**
 * Turns clustered stroke lines into dimension texts.
 *
 * Lines whose `texts[i]` is a readable dimension value become real texts.
 * Other lines stay as unread placeholders so linear recognition can fall
 * back to the measured length and still erase the strokes.
 */
export function acapPdfDimTextsFromStrokeLines<Id>(
  lines: PdfTextLineCandidate<Id>[],
  texts: Array<string | undefined>
): {
  texts: PdfDimText<Id>[]
  unread: PdfDimUnreadText<Id>[]
  usedIds: Id[]
} {
  const recognized: PdfDimText<Id>[] = []
  const unread: PdfDimUnreadText<Id>[] = []
  const usedIds: Id[] = []
  lines.forEach((line, i) => {
    const ids = lineStrokeIds(line)
    if (ids.length === 0) return
    const value = texts[i]?.trim()
    if (value && parsePdfDimensionValue(value) !== undefined) {
      recognized.push(pdfDimTextFromLine(line, value, ids))
      usedIds.push(...ids)
      return
    }
    unread.push(pdfDimUnreadFromLine(line, ids))
    usedIds.push(...ids)
  })
  return { texts: recognized, unread, usedIds }
}

/**
 * Reads stroke lines: glyph dictionary first, then the built-in digit /
 * symbol templates for anything still unread.
 */
export function acapPdfLookupDimStrokeTexts<Id>(
  lines: PdfTextLineCandidate<Id>[],
  dictionary: PdfGlyphDictionary
): Array<string | undefined> {
  return lines.map(line => {
    const known = dictionary.lookup(line)
    if (known && parsePdfDimensionValue(known) !== undefined) return known
    const fromDigits = recognizePdfDimStrokeText(line)
    // Only keep compact dimension-like readings (digits / R / Ø / °). Fragmented
    // outline strokes often misread as a run of "1"s; leave those unread so
    // linear recognition can fall back to the measured length.
    if (!fromDigits || !isPlausibleDimStrokeText(fromDigits, line.glyphs.length)) {
      return undefined
    }
    return fromDigits
  })
}

/**
 * Dimension values are short and mostly numeric. Reject long misreadings from
 * over-segmented outline glyphs (e.g. one "5" split into many "1" strokes).
 */
function isPlausibleDimStrokeText(text: string, glyphCount: number): boolean {
  const compact = text.replace(/\s+/g, '')
  if (!/^[Øø⌀R]?-?\d+([.,]\d+)?°?$/i.test(compact)) return false
  const digits = compact.replace(/\D/g, '')
  // Outline "5"/"55" often over-segments into a run of "1" glyphs.
  if (digits.length >= 2 && /^1+$/.test(digits)) return false
  if (glyphCount > 0 && Math.abs(compact.length - glyphCount) > 1) return false
  // A short digit line with many glyphs is almost always over-segmentation.
  if (glyphCount >= 3 && digits.length <= 2) return false
  return parsePdfDimensionValue(compact) !== undefined
}

/**
 * Appends stroke-derived texts to a dim input and removes their strokes from
 * the segment list so they are not mistaken for ticks or dimension lines.
 */
export function acapPdfAttachDimStrokeTexts<Id>(
  input: PdfDimInput<Id>,
  recognized: PdfDimText<Id>[],
  unread: PdfDimUnreadText<Id>[]
): void {
  const used = new Set<Id>()
  for (const text of recognized) {
    used.add(text.id)
    for (const id of text.extraIds ?? []) used.add(id)
    input.texts.push(text)
  }
  if (unread.length > 0) {
    input.unreadTexts = [...(input.unreadTexts ?? []), ...unread]
    for (const text of unread) {
      used.add(text.id)
      for (const id of text.extraIds) used.add(id)
    }
  }
  if (used.size === 0) return
  input.segments = input.segments.filter(s => !used.has(s.id))
}

/**
 * Clusters stroke text in `entities`, reads values from the glyph dictionary
 * and the digit templates, and attaches recognized / unread texts to `input`.
 */
export function acapPdfPrepareDimStrokeTexts<Id>(
  input: PdfDimInput<Id>,
  entities: Map<Id, AcDbEntity>,
  dictionary: PdfGlyphDictionary,
  texts?: Array<string | undefined>
): {
  lines: PdfTextLineCandidate<Id>[]
  texts: Array<string | undefined>
} {
  const lines = acapPdfCollectDimStrokeLines(entities)
  if (lines.length === 0) return { lines, texts: [] }
  const resolved = texts ?? acapPdfLookupDimStrokeTexts(lines, dictionary)
  const { texts: recognized, unread } = acapPdfDimTextsFromStrokeLines(
    lines,
    resolved
  )
  acapPdfAttachDimStrokeTexts(input, recognized, unread)
  return { lines, texts: resolved }
}

/** World-space center and height of a stroke text line. */
export function pdfDimTextPlacement(line: PdfTextLineCandidate): {
  center: { x: number; y: number }
  height: number
} {
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  // Mid-baseline, raised by half the cap height (like a text box center).
  const midU = line.width / 2
  const midV = line.height / 2
  return {
    center: {
      x: line.position.x + midU * c - midV * s,
      y: line.position.y + midU * s + midV * c
    },
    height: line.height
  }
}

function lineStrokeIds<Id>(line: PdfTextLineCandidate<Id>): Id[] {
  const seen = new Set<Id>()
  const ids: Id[] = []
  for (const stroke of line.strokes) {
    if (seen.has(stroke.id)) continue
    seen.add(stroke.id)
    ids.push(stroke.id)
  }
  return ids
}

function pdfDimTextFromLine<Id>(
  line: PdfTextLineCandidate<Id>,
  text: string,
  ids: Id[]
): PdfDimText<Id> {
  const { center, height } = pdfDimTextPlacement(line)
  return {
    id: ids[0],
    text,
    center,
    height,
    extraIds: ids.slice(1)
  }
}

function pdfDimUnreadFromLine<Id>(
  line: PdfTextLineCandidate<Id>,
  ids: Id[]
): PdfDimUnreadText<Id> {
  const { center, height } = pdfDimTextPlacement(line)
  return {
    id: ids[0],
    extraIds: ids.slice(1),
    center,
    height
  }
}
