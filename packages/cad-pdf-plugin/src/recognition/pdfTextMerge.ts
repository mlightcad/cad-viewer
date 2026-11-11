/**
 * Merges recovered text lines (often single characters the clustering left
 * apart) into one text block: groups them into paragraphs by baseline,
 * orders them for reading and joins their texts.
 *
 * Pure geometry, like {@link clusterPdfTextStrokes}: unit-testable without
 * the data model.
 */

import type { PdfTextGlyph, PdfTextLineCandidate } from './pdfGlyphClustering'
import type { PdfRecPoint } from './pdfRecGeometry'

/** One line taking part in a merge. */
export interface PdfTextMergePart<Id> {
  line: PdfTextLineCandidate<Id>
  text: string
}

/** One paragraph (text line) of a merged block. */
export interface PdfTextMergeParagraph {
  /** Indexes of the parts on this line, left to right. */
  parts: number[]
  /** Baseline offset across the block direction (local v). */
  baseline: number
  /** Lowest ink of the line (local v), descenders included. */
  bottom: number
  /** Extent along the baseline (local u). */
  minU: number
  maxU: number
  text: string
}

/** Result of {@link mergePdfTextLines}. */
export interface PdfTextMergeResult<Id> {
  /**
   * The merged block as one line candidate: all strokes, glyphs in reading
   * order, the block direction, the baseline-left of its first paragraph,
   * the median text height and the overall width.
   */
  line: PdfTextLineCandidate<Id>
  /** Paragraphs from top to bottom. */
  paragraphs: PdfTextMergeParagraph[]
  /** Texts of the paragraphs joined by `\n`. */
  text: string
  /** Mean baseline distance between paragraphs, 0 for one paragraph. */
  lineSpacing: number
}

/**
 * Advance width of `text` at width factor 1 and the given text height, in
 * the font the merged text is drawn with, or `undefined` when unknown.
 */
export type PdfTextMergeMeasure = (
  text: string,
  height: number
) => number | undefined

/** Options of {@link mergePdfTextLines}. */
export interface PdfTextMergeOptions {
  /**
   * Measures text in the target font, so the gaps between parts become the
   * number of spaces that keeps each part at its original place. Without it
   * a gap wider than half the text height becomes one space.
   */
  measure?: PdfTextMergeMeasure
}

/** Gap between two parts of a line (× height) that reads as a space. */
const SPACE_GAP = 0.5

/** Baseline difference (× height) that starts a new paragraph. */
const PARAGRAPH_GAP = 0.6

interface PartBox<Id> {
  index: number
  part: PdfTextMergePart<Id>
  glyphs: PdfTextGlyph<Id>[]
  minU: number
  maxU: number
  baseline: number
  bottom: number
  top: number
}

/**
 * Merges lines into one block.
 *
 * The block direction is that of the part with the most glyphs: a single
 * glyph's own direction is often a poor guess (an `I` looks vertical).
 */
export function mergePdfTextLines<Id>(
  parts: PdfTextMergePart<Id>[],
  options: PdfTextMergeOptions = {}
): PdfTextMergeResult<Id> {
  const angle = dominantRotation(parts.map(part => part.line))
  const boxes = parts.map((part, index) => partBox(part, index, angle))
  const height = median(boxes.map(box => box.top - box.baseline)) || 1e-9

  // Paragraphs: parts sharing a baseline, from top to bottom.
  const byBaseline = [...boxes].sort((a, b) => b.baseline - a.baseline)
  const groups: PartBox<Id>[][] = []
  for (const box of byBaseline) {
    const group = groups[groups.length - 1]
    if (
      group &&
      Math.abs(median(group.map(item => item.baseline)) - box.baseline) <=
        PARAGRAPH_GAP * height
    ) {
      group.push(box)
    } else {
      groups.push([box])
    }
  }
  const paragraphs = groups.map(group => {
    const ordered = [...group].sort((a, b) => a.minU - b.minU)
    const spaces = spaceCounter(ordered, height, options.measure)
    let text = ''
    let previous: PartBox<Id> | undefined
    for (const box of ordered) {
      const piece = box.part.text.trim()
      if (!piece) continue
      if (previous && text) text += ' '.repeat(spaces(previous, box))
      text += piece
      previous = box
    }
    return {
      parts: ordered.map(box => box.index),
      baseline: median(group.map(box => box.baseline)),
      bottom: Math.min(...group.map(box => box.bottom)),
      minU: Math.min(...group.map(box => box.minU)),
      maxU: Math.max(...group.map(box => box.maxU)),
      text,
      boxes: ordered
    }
  })

  const minU = Math.min(...paragraphs.map(item => item.minU))
  const maxU = Math.max(...paragraphs.map(item => item.maxU))
  const spacings = paragraphs
    .slice(1)
    .map((item, i) => paragraphs[i].baseline - item.baseline)
  return {
    line: {
      strokes: parts.flatMap(part => part.line.strokes),
      glyphs: paragraphs.flatMap(item => item.boxes.flatMap(box => box.glyphs)),
      rotation: angle,
      position: toWorld(minU, paragraphs[0].baseline, angle),
      height,
      width: maxU - minU
    },
    paragraphs: paragraphs.map(({ boxes: _boxes, ...rest }) => rest),
    text: paragraphs.map(item => item.text).join('\n'),
    lineSpacing:
      spacings.length > 0
        ? spacings.reduce((sum, value) => sum + value, 0) / spacings.length
        : 0
  }
}

/**
 * Returns how many spaces go between two parts of a paragraph.
 *
 * With a measurer, the spaces fill the distance from the start of one part
 * to the start of the next, less the advance of the first part's text, at
 * the width factor that makes the parts' text span their ink (the median
 * over the parts). Starts are used rather than the gap between the parts'
 * boxes: a stroke the clustering put into the wrong part can widen a box,
 * but hardly moves where a part begins.
 *
 * Without a measurer, a gap wider than half the text height is one space
 * (also between CJK characters: letter-spaced titles such as "标   高"
 * would otherwise lose their gaps).
 */
function spaceCounter<Id>(
  boxes: PartBox<Id>[],
  height: number,
  measure: PdfTextMergeMeasure | undefined
): (previous: PartBox<Id>, next: PartBox<Id>) => number {
  const fallback = (previous: PartBox<Id>, next: PartBox<Id>) =>
    next.minU - previous.maxU > SPACE_GAP * height ? 1 : 0
  if (!measure) return fallback
  const advance = (text: string) => {
    const value = measure(text, height)
    return value !== undefined && Number.isFinite(value) && value > 0
      ? value
      : undefined
  }
  const fits = boxes.flatMap(box => {
    const text = box.part.text.trim()
    const natural = text ? advance(text) : undefined
    return natural ? [(box.maxU - box.minU) / natural] : []
  })
  const widthFactor = median(fits)
  const space = advance(' ')
  if (!(widthFactor > 0) || !space) return fallback
  return (previous, next) => {
    const natural = advance(previous.part.text.trim())
    if (natural === undefined) return fallback(previous, next)
    const free = next.minU - previous.minU - natural * widthFactor
    return Math.max(0, Math.round(free / (space * widthFactor)))
  }
}

/**
 * Whether two lines read as one: same direction (or a single glyph), similar
 * height, the same baseline and close together along it.
 *
 * @param maxGap - Largest gap along the baseline, × text height.
 */
export function arePdfTextLinesAdjacent(
  a: PdfTextLineCandidate,
  b: PdfTextLineCandidate,
  maxGap = 1.5
): boolean {
  const angle = dominantRotation([a, b])
  if (!sameDirection(a, angle) || !sameDirection(b, angle)) return false
  const boxA = partBox({ line: a, text: '' }, 0, angle)
  const boxB = partBox({ line: b, text: '' }, 1, angle)
  const ha = boxA.top - boxA.baseline
  const hb = boxB.top - boxB.baseline
  const height = Math.max(ha, hb)
  if (height <= 0) return false
  // Single glyphs vary a lot in height (`-` vs `M`): only compare heights
  // of real lines.
  if (
    a.glyphs.length > 1 &&
    b.glyphs.length > 1 &&
    Math.min(ha, hb) < height * 0.6
  ) {
    return false
  }
  if (Math.abs(boxA.baseline - boxB.baseline) > 0.3 * height) return false
  const gap = Math.max(boxA.minU, boxB.minU) - Math.min(boxA.maxU, boxB.maxU)
  return gap <= maxGap * height
}

/** A line keeps the direction unless it is a single glyph (unreliable). */
function sameDirection(line: PdfTextLineCandidate, angle: number) {
  if (line.glyphs.length <= 1) return true
  let diff = Math.abs(line.rotation - angle) % Math.PI
  if (diff > Math.PI / 2) diff = Math.PI - diff
  return diff < (5 * Math.PI) / 180
}

/**
 * Direction of a merged block: that of the line with the most glyphs when
 * one has several. Single glyphs only: their own directions are guesses, so
 * the candidate (0, or one of theirs) giving the flattest block wins, like
 * the minimum-height box of the clustering.
 */
function dominantRotation(lines: PdfTextLineCandidate[]): number {
  let best = lines[0]
  for (const line of lines) {
    if (line.glyphs.length > best.glyphs.length) best = line
  }
  if (!best) return 0
  if (best.glyphs.length > 1) return best.rotation
  const points = lines.flatMap(line =>
    line.strokes.flatMap(stroke => stroke.points)
  )
  const candidates = [0, ...lines.map(line => line.rotation)]
  let bestAngle = 0
  let bestHeight = Infinity
  for (const angle of candidates) {
    let minV = Infinity
    let maxV = -Infinity
    for (const p of points) {
      const { v } = toLocal(p, angle)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
    // Prefer the earlier candidate (0 first) unless clearly flatter.
    if (maxV - minV < bestHeight - 1e-9) {
      bestHeight = maxV - minV
      bestAngle = angle
    }
  }
  return bestAngle
}

/** Glyph boxes, extent and baseline of a part in the block frame. */
function partBox<Id>(
  part: PdfTextMergePart<Id>,
  index: number,
  angle: number
): PartBox<Id> {
  const source =
    part.line.glyphs.length > 0
      ? part.line.glyphs
      : [{ strokes: part.line.strokes, minU: 0, maxU: 0, minV: 0, maxV: 0 }]
  const glyphs = source.map(glyph => {
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const stroke of glyph.strokes) {
      for (const p of stroke.points) {
        const { u, v } = toLocal(p, angle)
        minU = Math.min(minU, u)
        maxU = Math.max(maxU, u)
        minV = Math.min(minV, v)
        maxV = Math.max(maxV, v)
      }
    }
    return { strokes: glyph.strokes, minU, maxU, minV, maxV }
  })
  const ordered = glyphs
    .filter(glyph => Number.isFinite(glyph.minU))
    .sort((a, b) => a.minU - b.minU)
  // Like the clustering: descenders hang below, most glyphs sit on the line.
  const baseline = median(ordered.map(glyph => glyph.minV))
  const tops = ordered.map(glyph => glyph.maxV).sort((a, b) => a - b)
  return {
    index,
    part,
    glyphs: ordered,
    minU: Math.min(...ordered.map(glyph => glyph.minU)),
    maxU: Math.max(...ordered.map(glyph => glyph.maxU)),
    baseline,
    bottom: Math.min(...ordered.map(glyph => glyph.minV)),
    top: tops[Math.min(tops.length - 1, Math.floor(tops.length * 0.9))]
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function toLocal(p: PdfRecPoint, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { u: p.x * c + p.y * s, v: -p.x * s + p.y * c }
}

function toWorld(u: number, v: number, angle: number): PdfRecPoint {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: u * c - v * s, y: u * s + v * c }
}
