/**
 * Reads exploded (SHX stroke) dimension values next to known dimension
 * lines.
 *
 * Clustering every stroke of a page into text is slow and guesses each
 * phrase's direction. Dimension text sits beside its dimension line and runs
 * along it, so each candidate line only needs the few small strokes in a
 * band around it, read in the line's own direction. Lines that share a band
 * (chained dimensions) read the same strokes once.
 */

import { recognizePdfDimStrokeText } from './pdfDimDigitRecognition.js'
import {
  PdfDimGrid,
  pdfDimMedian,
  pdfDimSegmentBox,
  pdfDimUnit
} from './pdfDimPrimitives.js'
import {
  clusterPdfTextStrokes,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './pdfGlyphClustering.js'
import type { PdfGlyphDictionary } from './pdfGlyphDictionary.js'
import { cross, dot, type PdfRecPoint, sub } from './pdfRecGeometry.js'

/** Where to look for a value text: a dimension line span. */
export interface PdfDimTextProbe {
  p0: PdfRecPoint
  p1: PdfRecPoint
  /**
   * Also read the strokes horizontally and vertically. Leaders of radial
   * dimensions are oblique while their text is usually horizontal.
   */
  anyDirection?: boolean
}

/**
 * Most strokes one band may hold. A long dimension value in SHX text is a few
 * dozen strokes per character (curves are split into short segments).
 */
const MAX_BAND_STROKES = 600

/** A stroke text line read near a probe. */
export interface PdfDimStrokeReading<Id> {
  line: PdfTextLineCandidate<Id>
  /** Text read from the strokes, or `undefined` when not readable. */
  text?: string
  /** Glyph boxes the reader could not identify. */
  unknownGlyphs: number
  center: PdfRecPoint
  height: number
  rotation: number
  ids: Id[]
}

/** Options for {@link pdfDimReadStrokeTexts}. */
export interface PdfDimStrokeTextOptions {
  /** Expected text height; strokes above twice this size are not glyphs. */
  textHeight: number
  /** Learned glyphs (`pdftext`), tried before the built-in templates. */
  dictionary?: PdfGlyphDictionary
}

function strokeBox(points: PdfRecPoint[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Reads stroke texts around each probe.
 *
 * @param strokes - Candidate strokes (every curve on the page is fine; large
 * ones are dropped).
 * @param probes - Dimension line spans to read beside.
 * @returns Readings, each listed once even when several probes found it.
 */
export function pdfDimReadStrokeTexts<Id>(
  strokes: PdfTextStroke<Id>[],
  probes: PdfDimTextProbe[],
  options: PdfDimStrokeTextOptions
): PdfDimStrokeReading<Id>[] {
  const h = options.textHeight
  if (!(h > 0) || probes.length === 0) return []
  const small = strokes.filter(stroke => {
    const b = strokeBox(stroke.points)
    return Math.max(b.maxX - b.minX, b.maxY - b.minY) <= h * 1.6
  })
  const grid = new PdfDimGrid<PdfTextStroke<Id>>(h * 4)
  for (const stroke of small) grid.add(stroke, strokeBox(stroke.points))
  // Band keys need a stable token per stroke whatever the id type is
  // (entity objects stringify alike).
  const token = new Map<PdfTextStroke<Id>, number>()
  small.forEach((stroke, i) => token.set(stroke, i))

  const readings: PdfDimStrokeReading<Id>[] = []
  const claimed = new Set<Id>()
  const seenBands = new Set<string>()
  // Spans between two arrows know their text direction for sure; read them
  // before the guesses behind single arrows, which might otherwise claim
  // half of a neighbouring label in the wrong direction.
  const ordered = [...probes].sort(
    (a, b) => Number(!!a.anyDirection) - Number(!!b.anyDirection)
  )
  for (const probe of ordered) {
    const u = pdfDimUnit(sub(probe.p1, probe.p0))
    const length = Math.hypot(probe.p1.x - probe.p0.x, probe.p1.y - probe.p0.y)
    if (!(length > 0)) continue
    // Text sits within a few heights of the line, along the span (or just
    // past an end for small dimensions).
    const reach = h * 3.2
    const alongPad = h * 8
    const box = pdfDimSegmentBox(probe.p0, probe.p1, reach + alongPad)
    const nearby = grid.query(box)
    // A dimension label is a handful of glyphs. A band packed with strokes
    // is hatching or a title block; reading it costs much and finds nothing.
    if (nearby.length > MAX_BAND_STROKES * 4) continue
    const inBand = nearby.filter(stroke =>
      stroke.points.every(p => {
        const rel = sub(p, probe.p0)
        const along = dot(rel, u)
        return (
          Math.abs(cross(u, rel)) <= reach &&
          along >= -alongPad &&
          along <= length + alongPad
        )
      })
    )
    const fresh = inBand.filter(stroke => !claimed.has(stroke.id))
    if (fresh.length === 0 || fresh.length > MAX_BAND_STROKES) continue
    const own = textAngle(u)
    // Straight strokes along the probe longer than a glyph are its own
    // dimension line (or tail); inside the band they would glue the glyphs
    // into one wide box.
    const glyphStrokes = fresh.filter(stroke => {
      const first = stroke.points[0]
      const last = stroke.points[stroke.points.length - 1]
      const along = Math.abs(dot(sub(last, first), u))
      const across = Math.abs(cross(u, sub(last, first)))
      if (along > h * 1.1 && across < h * 0.05) return false
      // A round filled dot (a point marker on an extension line) is not a
      // glyph: filled glyph parts are elongated or carry holes.
      if (stroke.filled) {
        const b = strokeBox(stroke.points)
        const w = b.maxX - b.minX
        const ht = b.maxY - b.minY
        if (
          Math.max(w, ht) < h * 0.4 &&
          Math.abs(w - ht) < Math.max(w, ht) * 0.2
        ) {
          return false
        }
      }
      // A straight stroke through an arrow tip is that end's extension line.
      if (stroke.points.length === 2 && !stroke.filled) {
        const d = sub(last, first)
        const len = Math.hypot(d.x, d.y)
        if (len > h * 0.5) {
          for (const tip of [probe.p0, probe.p1]) {
            if (Math.abs(cross(d, sub(tip, first))) / len <= h * 0.02) {
              return false
            }
          }
        }
      }
      return true
    })
    if (glyphStrokes.length === 0) continue
    const angles = probe.anyDirection
      ? [own, 0, Math.PI / 2].filter(
          (a, i, all) => all.findIndex(b => Math.abs(b - a) < 1e-6) === i
        )
      : [own]
    const idsKey = glyphStrokes
      .map(s => token.get(s)!)
      .sort((a, b) => a - b)
      .join(',')
    // Read in each direction; keep the one that reads the most glyphs.
    let best: PdfDimStrokeReading<Id>[] | undefined
    let bestScore = -Infinity
    for (const angle of angles) {
      const bandKey = `${angle.toFixed(3)}:${idsKey}`
      if (seenBands.has(bandKey)) continue
      seenBands.add(bandKey)
      const { lines } = clusterPdfTextStrokes(glyphStrokes, {
        textHeight: h,
        angle,
        attachLongStrokes: false
      })
      const found: PdfDimStrokeReading<Id>[] = []
      for (const line of lines) {
        const reading = readLine(line, options.dictionary, h)
        if (!reading) continue
        if (reading.text === undefined && !acceptableUnread(reading, h)) {
          continue
        }
        found.push(reading)
      }
      const score = found.reduce(
        (sum, r) =>
          sum +
          (r.text !== undefined ? r.line.glyphs.length * 2 : 0) -
          r.unknownGlyphs,
        0
      )
      if (found.length > 0 && score > bestScore) {
        best = found
        bestScore = score
      }
    }
    for (const reading of best ?? []) {
      // Only read text claims its strokes; an unread guess may be part of a
      // label another probe reads whole.
      if (reading.text !== undefined) {
        for (const id of reading.ids) claimed.add(id)
      }
      readings.push(reading)
    }
  }
  const joined = joinPrefixes(readings, h)
  const read = new Set<Id>()
  for (const r of joined)
    if (r.text !== undefined) r.ids.forEach(id => read.add(id))
  // Unread guesses sharing strokes with read text, or with an earlier
  // unread guess, are dropped.
  const used = new Set<Id>()
  const kept = joined.filter(r => {
    if (r.text !== undefined) return true
    if (r.ids.some(id => read.has(id) || used.has(id))) return false
    r.ids.forEach(id => used.add(id))
    return true
  })
  return dropShadowedUnread(kept)
}

/** Characters that start a dimension value ahead of its number. */
const PREFIXES = new Set(['Ø', 'R', '⌒', 'M', '±'])

/**
 * Joins a lone prefix symbol (Ø, R, ⌒, M) read by itself into the number
 * right after it on the same baseline. A span probe reads only strokes over
 * its dimension line, so a prefix sticking out past the arrow ends up in a
 * separate reading.
 */
function joinPrefixes<Id>(
  readings: PdfDimStrokeReading<Id>[],
  textHeight: number
): PdfDimStrokeReading<Id>[] {
  const removed = new Set<PdfDimStrokeReading<Id>>()
  for (const prefix of readings) {
    if (prefix.text === undefined || !PREFIXES.has(prefix.text)) continue
    const c = Math.cos(prefix.rotation)
    const s = Math.sin(prefix.rotation)
    for (const number of readings) {
      if (number === prefix || removed.has(number)) continue
      if (number.text === undefined || !/^\d/.test(number.text)) continue
      if (Math.abs(number.rotation - prefix.rotation) > 1e-3) continue
      const d = sub(number.center, prefix.center)
      const along = d.x * c + d.y * s
      const across = -d.x * s + d.y * c
      const gap = along - (prefix.line.width + number.line.width) / 2
      if (Math.abs(across) > textHeight * 0.3) continue
      if (along <= 0 || gap > textHeight * 0.6) continue
      number.text = prefix.text + number.text
      number.ids.unshift(...prefix.ids)
      number.line = {
        ...number.line,
        strokes: [...prefix.line.strokes, ...number.line.strokes],
        glyphs: [...prefix.line.glyphs, ...number.line.glyphs],
        position: prefix.line.position,
        width: prefix.line.width + gap + number.line.width
      }
      number.center = {
        x: number.center.x - (c * (prefix.line.width + gap)) / 2,
        y: number.center.y - (s * (prefix.line.width + gap)) / 2
      }
      removed.add(prefix)
      break
    }
  }
  return readings.filter(r => !removed.has(r))
}

/** Text baseline angle for a dimension along `u`, readable left-to-right. */
function textAngle(u: PdfRecPoint): number {
  let angle = Math.atan2(u.y, u.x)
  // Readable from the bottom or the right, as CAD draws dimension text.
  while (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI
  while (angle > Math.PI / 2 + 1e-9) angle -= Math.PI
  return angle
}

function readLine<Id>(
  line: PdfTextLineCandidate<Id>,
  dictionary: PdfGlyphDictionary | undefined,
  textHeight: number
): PdfDimStrokeReading<Id> | undefined {
  if (line.glyphs.length === 0) return undefined
  // Glyph boxes much taller than the text are linework, not characters.
  if (line.height > textHeight * 1.6 || line.height < textHeight * 0.35) {
    return undefined
  }
  const ids: Id[] = []
  const seen = new Set<Id>()
  for (const stroke of line.strokes) {
    if (seen.has(stroke.id)) continue
    seen.add(stroke.id)
    ids.push(stroke.id)
  }
  // One straight stroke alone is linework (an extension stub, a tick), not
  // a "1" or "-" worth reading as a dimension value.
  if (line.strokes.length === 1 && line.strokes[0].points.length <= 2) {
    return undefined
  }
  const known = dictionary?.lookup(line)
  const read = known ?? recognizePdfDimStrokeText(line)
  // A value has a digit; a lone mark (".", ",", "-", "Ø") read off a
  // fragment is part of a label another probe sees whole.
  const text =
    read !== undefined && (/\d/.test(read) || PREFIXES.has(read))
      ? read
      : undefined
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const center = {
    x: line.position.x + (line.width / 2) * c - (line.height / 2) * s,
    y: line.position.y + (line.width / 2) * s + (line.height / 2) * c
  }
  return {
    line,
    text,
    unknownGlyphs: text === undefined ? line.glyphs.length : 0,
    center,
    height: line.height,
    rotation: line.rotation,
    ids
  }
}

/**
 * An unread line is only worth keeping as a value placeholder when it looks
 * like a short label: a few glyph boxes of text height.
 */
function acceptableUnread<Id>(
  reading: PdfDimStrokeReading<Id>,
  textHeight: number
): boolean {
  const glyphs = reading.line.glyphs.length
  if (glyphs < 1 || glyphs > 10) return false
  const heights = reading.line.glyphs.map(g => g.maxV - g.minV)
  return pdfDimMedian(heights) >= textHeight * 0.5
}

/** Unread readings fully inside a read one's area are its leftovers. */
function dropShadowedUnread<Id>(
  readings: PdfDimStrokeReading<Id>[]
): PdfDimStrokeReading<Id>[] {
  const read = readings.filter(r => r.text !== undefined)
  return readings.filter(r => {
    if (r.text !== undefined) return true
    return !read.some(
      other =>
        Math.hypot(other.center.x - r.center.x, other.center.y - r.center.y) <
        other.line.width / 2
    )
  })
}
