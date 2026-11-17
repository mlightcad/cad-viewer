/**
 * Builds dimension-value texts from exploded PDF text strokes so `pdfdim`
 * can run before `pdftext` has turned those strokes into TEXT entities.
 *
 * Recognition is local and lightweight: the `pdftext` glyph dictionary, then
 * a built-in digit / symbol template matcher — no LLM or network OCR.
 */

import type { AcDbEntity } from '@mlightcad/data-model'

import { pdfEntityToStroke } from './pdfEntityStrokes.js'
import { recognizePdfDimStrokeText } from './recognition/pdfDimDigitRecognition.js'
import {
  parsePdfDimensionValue,
  pdfArrowFromPolygon,
  type PdfDimInput,
  type PdfDimText,
  type PdfDimUnreadText
} from './recognition/pdfDimensionPattern.js'
import { pdfDimMedian, pdfDimUnit } from './recognition/pdfDimPrimitives.js'
import {
  pdfDimReadStrokeTexts,
  type PdfDimTextProbe
} from './recognition/pdfDimStrokeReader.js'
import {
  clusterPdfTextStrokes,
  estimatePdfTextHeight,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering.js'
import type { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary.js'
import {
  cross,
  dot,
  type PdfRecPoint,
  sub
} from './recognition/pdfRecGeometry.js'

/**
 * Clusters curve entities into text line candidates (frames and long
 * dimension lines are rejected by the clusterer).
 */
export function acapPdfCollectDimStrokeLines<Id>(
  entities: Map<Id, AcDbEntity>,
  arrowSize?: number
): PdfTextLineCandidate<Id>[] {
  const strokes: PdfTextStroke<Id>[] = []
  for (const [id, entity] of entities) {
    const stroke = pdfEntityToStroke(entity, id)
    if (stroke) strokes.push(stroke)
  }
  // On a whole page most strokes are linework, which pulls the height
  // estimate far above the text. Dimension text is about as tall as the
  // arrowheads, so only strokes up to twice that size can be glyph parts.
  const textHeight =
    arrowSize && arrowSize > 0
      ? estimatePdfTextHeight(
          strokes.filter(stroke => strokeSize(stroke) <= arrowSize * 2)
        )
      : undefined
  // Dimension lines cross their own value text; attaching long strokes to
  // text bands would swallow them.
  return clusterPdfTextStrokes(strokes, {
    attachLongStrokes: false,
    ...(textHeight && textHeight > 0 ? { textHeight } : {})
  }).lines
}

function strokeSize(stroke: PdfTextStroke): number {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of stroke.points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return Math.max(maxX - minX, maxY - minY)
}

/** Median arrowhead size among the closed shapes of a dim input. */
function medianArrowSize(input: PdfDimInput<unknown>): number | undefined {
  const sizes = input.polygons
    .map(polygon => pdfArrowFromPolygon(polygon.vertices)?.size)
    .filter((size): size is number => size !== undefined && size > 0)
    .sort((a, b) => a - b)
  return sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : undefined
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
    if (
      !fromDigits ||
      !isPlausibleDimStrokeText(fromDigits, line.glyphs.length)
    ) {
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
  if (!/^(?:[Øø⌀R⌒]|M)?-?\d+([.,]\d+)?°?$/i.test(compact)) return false
  const digits = compact.replace(/\D/g, '')
  // Outline "5"/"55" often over-segments into a run of "1" glyphs.
  if (digits.length >= 2 && /^1+$/.test(digits)) return false
  if (glyphCount > 0 && Math.abs(compact.length - glyphCount) > 1) return false
  // A short digit line with many extra glyphs is over-segmentation; a
  // prefix symbol (Ø, R, ⌒, M) or a decimal point is a real glyph.
  const symbols = compact.length - digits.length
  if (
    glyphCount >= 3 &&
    digits.length <= 2 &&
    glyphCount > digits.length + symbols
  ) {
    return false
  }
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
 * Reads exploded stroke text in `entities` and attaches recognized and
 * unread value texts to `input`.
 *
 * With arrowheads in the input, only strokes beside a possible dimension
 * line (between two opposed arrows, or past a single arrow) are read, in that
 * line's direction. That is fast on a whole page and reads rotated text
 * reliably. Without arrowheads every stroke is clustered, as before.
 */
export function acapPdfPrepareDimStrokeTexts<Id>(
  input: PdfDimInput<Id>,
  entities: Map<Id, AcDbEntity>,
  dictionary: PdfGlyphDictionary,
  texts?: Array<string | undefined>,
  fillOutlines?: Map<Id, PdfRecPoint[][]>
): {
  lines: PdfTextLineCandidate<Id>[]
  texts: Array<string | undefined>
} {
  const arrows = input.polygons
    .map(polygon => pdfArrowFromPolygon(polygon.vertices))
    .filter(arrow => arrow !== undefined)
  // Whole pages (import) read only beside arrows, which is fast. A small
  // `pdfdim` selection is read whole as well, so dimensions with ticks or
  // without terminators keep their values.
  const probeOnly = entities.size > PROBE_ONLY_ENTITIES
  if (arrows.length >= 2 && texts === undefined) {
    const arrowSize = pdfDimMedian(arrows.map(a => a.size))
    const strokes: PdfTextStroke<Id>[] = []
    for (const [id, entity] of entities) {
      const stroke = pdfEntityToStroke(entity, id)
      if (stroke) strokes.push(stroke)
    }
    // Outline fonts print glyphs as small solid fills; their contours read
    // like strokes once marked as filled.
    // Arrowheads are small fills too; they are terminators, not glyphs.
    const arrowIds = new Set(
      input.polygons
        .filter(polygon => pdfArrowFromPolygon(polygon.vertices))
        .map(polygon => polygon.id)
    )
    for (const [id, contours] of fillOutlines ?? []) {
      if (arrowIds.has(id)) continue
      for (const points of contours) strokes.push({ id, points, filled: true })
    }
    const small = strokes.filter(s => strokeSize(s) <= arrowSize * 2)
    // Hatching and symbols near the text bias a stroke-based estimate; CAD
    // dimension text is about as tall as the arrowheads (DIMTXT ≈ DIMASZ),
    // so keep the estimate only when it agrees with them.
    const estimated = estimatePdfTextHeight(small)
    const textHeight =
      estimated >= arrowSize * 0.5 && estimated <= arrowSize * 1.25
        ? estimated
        : arrowSize * 0.875
    const readings = pdfDimReadStrokeTexts(
      small,
      dimLineProbes(arrows, arrowSize),
      { textHeight, dictionary }
    )
    const recognized: PdfDimText<Id>[] = []
    const unread: PdfDimUnreadText<Id>[] = []
    for (const reading of readings) {
      const [id, ...extraIds] = reading.ids
      const value = reading.text?.trim()
      if (
        value &&
        parsePdfDimensionValue(value) !== undefined &&
        isPlausibleDimStrokeText(value, reading.line.glyphs.length)
      ) {
        recognized.push({
          id,
          text: value,
          center: reading.center,
          height: reading.height,
          rotation: reading.rotation,
          extraIds
        })
      } else {
        unread.push({
          id,
          extraIds,
          center: reading.center,
          height: reading.height,
          rotation: reading.rotation
        })
      }
    }
    acapPdfAttachDimStrokeTexts(input, recognized, unread)
    // Fills claimed as glyphs are text, never arrowheads.
    const glyphIds = new Set<Id>()
    for (const t of [...recognized, ...unread]) {
      glyphIds.add(t.id)
      for (const id of t.extraIds ?? []) glyphIds.add(id)
    }
    input.polygons = input.polygons.filter(p => !glyphIds.has(p.id))
    const result = {
      lines: readings.map(r => r.line),
      texts: readings.map(r => r.text)
    }
    if (probeOnly) return result
    // Cluster what the probes left (tick / bare dimension values).
    const rest = new Map<Id, AcDbEntity>()
    for (const [id, entity] of entities) {
      if (!glyphIds.has(id)) rest.set(id, entity)
    }
    // Only lines away from every probe: near arrows the probes read in the
    // right direction already, and a guessed direction there garbles the
    // leftovers of a label (half a "Ø40" read sideways as "8").
    const covered = (p: PdfRecPoint) =>
      readings.some(
        r =>
          Math.hypot(r.center.x - p.x, r.center.y - p.y) <=
          r.line.width / 2 + textHeight * 2
      ) ||
      arrows.some(
        a => Math.hypot(a.tip.x - p.x, a.tip.y - p.y) <= arrowSize * 1.5
      )
    const restLines = acapPdfCollectDimStrokeLines(rest, arrowSize).filter(
      line => !covered(pdfDimTextPlacement(line).center)
    )
    if (restLines.length > 0) {
      const restTexts = acapPdfLookupDimStrokeTexts(restLines, dictionary)
      const more = acapPdfDimTextsFromStrokeLines(restLines, restTexts)
      acapPdfAttachDimStrokeTexts(input, more.texts, more.unread)
      result.lines.push(...restLines)
      result.texts.push(...restTexts)
    }
    return result
  }
  const lines = acapPdfCollectDimStrokeLines(entities, medianArrowSize(input))
  if (lines.length === 0) return { lines, texts: [] }
  const resolved = texts ?? acapPdfLookupDimStrokeTexts(lines, dictionary)
  const { texts: recognized, unread } = acapPdfDimTextsFromStrokeLines(
    lines,
    resolved
  )
  acapPdfAttachDimStrokeTexts(input, recognized, unread)
  return { lines, texts: resolved }
}

/**
 * Selections larger than this are read only beside arrows; clustering every
 * stroke of a whole sheet takes seconds.
 */
const PROBE_ONLY_ENTITIES = 5000

/** Arrows after one arrow on its line that may close a dimension with it. */
const MAX_LINE_NEIGHBOURS = 6

/**
 * Spans where dimension text may sit: between two collinear, opposed arrows
 * (neighbours on one line only), and a short stretch behind and past every
 * arrow (leaders of radial dimensions and outside-arrow dimensions carry
 * their text there).
 */
function dimLineProbes(
  arrows: Array<{
    tip: { x: number; y: number }
    direction: { x: number; y: number }
    size: number
  }>,
  arrowSize: number
): PdfDimTextProbe[] {
  const probes: PdfDimTextProbe[] = []
  const sinTol = Math.sin((3 * Math.PI) / 180)
  // Arrows grouped by their axis line (direction and offset quantized), so
  // pairs are only formed with arrows on the same line, and only between
  // neighbours along it: a row of chained dimensions gives n − 1 spans,
  // not n² overlapping ones.
  const lines = new Map<string, typeof arrows>()
  for (const a of arrows) {
    // Snap the axis to a bin first, then measure the offset along the
    // bin's normal: arrows pointing at 0° and at 179.99° share one line.
    const binSize = Math.asin(sinTol)
    const bins = Math.round(Math.PI / binSize)
    let angle = Math.atan2(a.direction.y, a.direction.x)
    if (angle < 0) angle += Math.PI
    const bin = Math.round(angle / binSize) % bins
    const snapped = bin * binSize
    const n = { x: -Math.sin(snapped), y: Math.cos(snapped) }
    const offset = Math.round(
      (a.tip.x * n.x + a.tip.y * n.y) / (arrowSize * 0.25)
    )
    const key = `${bin}:${offset}`
    const list = lines.get(key)
    if (list) list.push(a)
    else lines.set(key, [a])
  }
  for (const list of lines.values()) {
    const u = pdfDimUnit(list[0].direction)
    const along = (p: { x: number; y: number }) => p.x * u.x + p.y * u.y
    list.sort((p, q) => along(p.tip) - along(q.tip))
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i]
      // A few neighbours: enough for nested dimensions on one line
      // (M20 inside Ø40) while staying linear in the arrow count.
      for (
        let j = i + 1;
        j < list.length && j <= i + MAX_LINE_NEIGHBOURS;
        j++
      ) {
        const b = list[j]
        const d = sub(b.tip, a.tip)
        if (Math.hypot(d.x, d.y) <= arrowSize * 0.1) continue
        const du = pdfDimUnit(d)
        if (Math.abs(cross(a.direction, du)) > sinTol) continue
        if (dot(a.direction, du) * dot(b.direction, du) >= 0) continue
        probes.push({ p0: a.tip, p1: b.tip })
      }
    }
  }
  for (const a of arrows) {
    // Behind the arrow (leaders, outside-arrow dimensions) and past its tip
    // (text moved outside a narrow dimension).
    for (const sign of [-1, 1]) {
      probes.push({
        p0: a.tip,
        p1: {
          x: a.tip.x + sign * a.direction.x * arrowSize * 10,
          y: a.tip.y + sign * a.direction.y * arrowSize * 10
        },
        anyDirection: true
      })
    }
  }
  // Short spans first: text between near arrows belongs to that pair.
  probes.sort(
    (p, q) =>
      Math.hypot(p.p1.x - p.p0.x, p.p1.y - p.p0.y) -
      Math.hypot(q.p1.x - q.p0.x, q.p1.y - q.p0.y)
  )
  return probes
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
