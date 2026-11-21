/**
 * Detects path strokes that sit under an already-imported PDF text run
 * (searchable text + outlined duplicate of the same glyphs).
 *
 * Conservative on purpose: dimension arrows, ticks and open leader strokes
 * often sit beside labels and must not be erased with outline-font twins.
 */

import {
  type AcDbEntity,
  AcDbHatch,
  AcDbLine,
  AcDbPolyline,
  AcDbText
} from '@mlightcad/data-model'

import { pdfEntityToStroke } from './pdfEntityStrokes.js'
import type { PdfTextLineCandidate } from './recognition/pdfGlyphClustering.js'
import type { PdfRecPoint } from './recognition/pdfRecGeometry.js'

/** CJK cells are closer to the em than capital-A height (~1.4× for simsun). */
const CJK_CELL_FACTOR = 1.55

/** Latin / digit runs stay near capital-A; little inflation. */
const LATIN_CELL_FACTOR = 1.05

/** Padding around the text band, as a fraction of the cell size. */
const BAND_PAD = 0.3

/** Strokes larger than this many cells are frames, not glyph twins. */
const MAX_STROKE_CELLS = 2.2

/** Fewest polyline vertices for a closed outline to count as a glyph. */
const MIN_GLYPH_POLY_VERTICES = 6

/** CJK Unified Ideographs and compatibility ideographs. */
const CJK_CHAR = /[\u3400-\u9fff\uf900-\ufaff]/

/** Largest baseline-angle difference still treated as the same line. */
const MAX_ANGLE_DELTA = 0.25

/** Local band of a text run in its baseline frame (u along, v across). */
export interface AcApPdfTextStrokeBand {
  originX: number
  originY: number
  cos: number
  sin: number
  minU: number
  maxU: number
  minV: number
  maxV: number
  cell: number
}

/**
 * Oriented band covering the drawn glyphs of `text`, padded so outline twins
 * still count after capital-A height scaling.
 */
export function acapPdfTextStrokeBand(text: AcDbText): AcApPdfTextStrokeBand {
  const chars = Math.max(1, [...text.textString].length)
  const factor = CJK_CHAR.test(text.textString)
    ? CJK_CELL_FACTOR
    : LATIN_CELL_FACTOR
  const cell =
    Math.max(1e-9, text.height) * factor * Math.max(0.1, text.widthFactor)
  const pad = cell * BAND_PAD
  return {
    originX: text.position.x,
    originY: text.position.y,
    cos: Math.cos(text.rotation),
    sin: Math.sin(text.rotation),
    minU: -pad,
    maxU: cell * chars + pad,
    minV: -pad,
    maxV: cell + pad,
    cell
  }
}

/** Whether `point` lies inside the text's padded glyph band. */
export function acapPdfPointInTextStrokeBand(
  band: AcApPdfTextStrokeBand,
  point: PdfRecPoint
): boolean {
  const dx = point.x - band.originX
  const dy = point.y - band.originY
  const along = dx * band.cos + dy * band.sin
  const across = -dx * band.sin + dy * band.cos
  return (
    along >= band.minU &&
    along <= band.maxU &&
    across >= band.minV &&
    across <= band.maxV
  )
}

/**
 * Whether a stroke's mass sits under `text` and is glyph-sized (not a frame).
 */
export function acapPdfTextCoversStrokePoints(
  text: AcDbText,
  points: readonly PdfRecPoint[],
  band: AcApPdfTextStrokeBand = acapPdfTextStrokeBand(text)
): boolean {
  if (points.length < 2 || !(band.cell > 0)) return false
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let sx = 0
  let sy = 0
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
    sx += p.x
    sy += p.y
  }
  const size = Math.max(maxX - minX, maxY - minY)
  if (size > band.cell * MAX_STROKE_CELLS) return false
  return acapPdfPointInTextStrokeBand(band, {
    x: sx / points.length,
    y: sy / points.length
  })
}

/**
 * Whether `line`'s strokes are the outlined twin of `text` (same baseline
 * band). Kept for line-level checks during exploded-text recovery.
 */
export function acapPdfTextCoversStrokeLine(
  text: AcDbText,
  line: Pick<
    PdfTextLineCandidate,
    'position' | 'height' | 'width' | 'rotation' | 'strokes'
  >
): boolean {
  if (!(text.height > 0) || !(line.height > 0)) return false
  const angle = normalizeAngleDelta(text.rotation - line.rotation)
  if (angle > MAX_ANGLE_DELTA) return false

  const heightRatio =
    Math.max(text.height, line.height) / Math.min(text.height, line.height)
  if (heightRatio > 2.8) return false

  const band = acapPdfTextStrokeBand(text)
  if (line.strokes?.length) {
    return line.strokes.every(stroke =>
      acapPdfTextCoversStrokePoints(text, stroke.points, band)
    )
  }
  return acapPdfPointInTextStrokeBand(band, line.position)
}

/** Filled arrowheads import as solid hatches with 3–4 boundary vertices. */
export function acapPdfHatchLooksLikeArrowhead(hatch: AcDbHatch): boolean {
  try {
    if (!hatch.isSolidFill) return false
  } catch {
    // Hatch not in a database yet (unit tests / pre-append): still use grips.
  }
  const points = hatch.subGetGripPoints()
  return points.length >= 3 && points.length <= 4
}

/**
 * Open leaders / extension lines and filled arrowheads must survive. Only
 * closed glyph-like outlines are outline twins of searchable text.
 */
export function acapPdfEntityIsGlyphOutlineTwin(entity: AcDbEntity): boolean {
  if (entity instanceof AcDbLine) return false
  if (entity instanceof AcDbPolyline) {
    if (!entity.closed) return false
    return entity.numberOfVertices >= MIN_GLYPH_POLY_VERTICES
  }
  return false
}

/**
 * Drops path / hatch entities that duplicate already-imported PDF text runs.
 *
 * Many PDFs keep searchable `showText` plus stroked or filled glyph outlines.
 * After native text is imported, those outlines are noise — but open dimension
 * geometry and arrowheads beside labels must stay.
 */
export function acapPdfRemoveTextOutlineTwins(
  entities: AcDbEntity[],
  fillOutlines?: Map<AcDbEntity, PdfRecPoint[][]>,
  fillStrokeCompanions?: Map<AcDbEntity, AcDbEntity[]>
): AcDbEntity[] {
  const texts = entities.filter(
    (entity): entity is AcDbText => entity instanceof AcDbText
  )
  if (texts.length === 0) return entities

  const bands = texts.map(text => ({
    text,
    band: acapPdfTextStrokeBand(text)
  }))
  const consumed = new Set<AcDbEntity>()

  for (const entity of entities) {
    if (entity instanceof AcDbText) continue
    if (!acapPdfEntityIsGlyphOutlineTwin(entity)) continue
    const stroke = pdfEntityToStroke(entity, entity)
    if (!stroke) continue
    if (
      bands.some(
        ({ text, band }) =>
          acapPdfSameInk(entity, text) &&
          acapPdfTextCoversStrokePoints(text, stroke.points, band)
      )
    ) {
      consumed.add(entity)
    }
  }

  for (const [hatch, contours] of fillOutlines ?? []) {
    if (consumed.has(hatch)) continue
    if (!(hatch instanceof AcDbHatch)) continue
    if (acapPdfHatchLooksLikeArrowhead(hatch)) continue
    if (
      contours.some(
        points =>
          points.length >= MIN_GLYPH_POLY_VERTICES &&
          bands.some(
            ({ text, band }) =>
              acapPdfSameInk(hatch, text) &&
              acapPdfTextCoversStrokePoints(text, points, band)
          )
      )
    ) {
      consumed.add(hatch)
    }
  }

  for (const [hatch, outlines] of fillStrokeCompanions ?? []) {
    if (!consumed.has(hatch)) continue
    for (const outline of outlines) consumed.add(outline)
  }

  if (consumed.size === 0) return entities

  // Twin hatches must not feed later exploded-text / dimension stroke passes.
  for (const hatch of consumed) {
    fillOutlines?.delete(hatch)
    fillStrokeCompanions?.delete(hatch)
  }

  return entities.filter(entity => !consumed.has(entity))
}

/**
 * Whether `entity` is painted in the text's colour. A glyph twin repeats the
 * text in the same ink; a fill of another colour under the text is artwork
 * the text sits on (a white digit on a coloured badge), so it must survive.
 *
 * @param entity - Outline or fill that overlaps the text.
 * @param text - Imported PDF text.
 */
export function acapPdfSameInk(entity: AcDbEntity, text: AcDbText): boolean {
  try {
    return entity.color.equals(text.color)
  } catch {
    // ByLayer colours resolve through the working database; without one
    // (detached entities) keep the geometric test alone.
    return true
  }
}

function normalizeAngleDelta(delta: number): number {
  let angle = delta % (Math.PI * 2)
  if (angle < 0) angle += Math.PI * 2
  if (angle > Math.PI) angle = Math.PI * 2 - angle
  return angle
}
