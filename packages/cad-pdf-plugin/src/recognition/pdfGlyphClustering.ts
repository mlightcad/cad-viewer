/**
 * Groups exploded text strokes (SHX line text, outlined fonts) into text
 * line candidates with a CAD placement.
 *
 * Pure geometry: strokes are plain point lists, so the algorithm is
 * unit-testable without the data model. The `pdftext` command samples
 * entities into strokes and turns candidates into `AcDbText`.
 */

import { type PdfRecPoint } from './pdfRecGeometry'

/** One stroke: a polyline sampled from a source entity. */
export interface PdfTextStroke<Id = unknown> {
  id: Id
  points: PdfRecPoint[]
}

/** One character box inside a text line, in line-local coordinates. */
export interface PdfTextGlyph<Id = unknown> {
  strokes: PdfTextStroke<Id>[]
  /** Extent along the baseline (local u). */
  minU: number
  maxU: number
  /** Extent across the baseline (local v). */
  minV: number
  maxV: number
}

/** A text line candidate recovered from strokes. */
export interface PdfTextLineCandidate<Id = unknown> {
  strokes: PdfTextStroke<Id>[]
  glyphs: PdfTextGlyph<Id>[]
  /** Baseline rotation in radians, in `(-π/2, π/2]`. */
  rotation: number
  /** Left end of the baseline in world coordinates (AcDbText position). */
  position: PdfRecPoint
  /** Estimated cap height in world units. */
  height: number
  /** Line length along the baseline in world units. */
  width: number
}

/** Tuning for {@link clusterPdfTextStrokes}. */
export interface PdfTextClusterOptions {
  /**
   * Expected text height. Omit to estimate it from stroke sizes, which works
   * when the selection is mostly text.
   */
  textHeight?: number
  /** Word gap still kept in one line, as a fraction of text height. Default 1.2. */
  wordGap?: number
  /** Gap separating two glyphs along a line, as a fraction of height. Default 0.04. */
  glyphGap?: number
}

/** Result of {@link clusterPdfTextStrokes}. */
export interface PdfTextClusterResult<Id = unknown> {
  lines: PdfTextLineCandidate<Id>[]
  /** Strokes too large to be text (frames, leaders, table lines). */
  rejected: PdfTextStroke<Id>[]
  /** Text height used for clustering. */
  textHeight: number
}

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function strokeBox(stroke: PdfTextStroke): Box {
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
  return { minX, minY, maxX, maxY }
}

function boxSize(box: Box) {
  return Math.max(box.maxX - box.minX, box.maxY - box.minY)
}

function boxGap(a: Box, b: Box) {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX)
  const dy = Math.max(0, a.minY - b.maxY, b.minY - a.maxY)
  return Math.hypot(dx, dy)
}

function percentile(sorted: number[], q: number) {
  if (sorted.length === 0) return 0
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(q * (sorted.length - 1)))
  )
  return sorted[index]
}

/**
 * Estimates text height from the sizes of glyph parts. Parts far above the
 * median are treated as non-text so a frame in the selection does not skew
 * the result.
 *
 * Strokes chained end to end are measured together: some PDFs store a glyph
 * stroke as many tiny separate segments, each far smaller than the text.
 */
export function estimatePdfTextHeight(strokes: PdfTextStroke[]): number {
  const sized = strokes.filter(stroke => boxSize(strokeBox(stroke)) > 0)
  if (sized.length === 0) return 0
  const strokeMedian = percentile(
    sized.map(stroke => boxSize(strokeBox(stroke))).sort(byNumber),
    0.5
  )
  const sizes = chainStrokes(sized, strokeMedian * 0.01)
    .map(group =>
      boxSize(strokeBox({ id: 0, points: group.flatMap(i => sized[i].points) }))
    )
    .sort(byNumber)
  const median = percentile(sizes, 0.5)
  const textLike = sizes.filter(size => size <= median * 4)
  return percentile(textLike, 0.9)
}

function byNumber(a: number, b: number) {
  return a - b
}

/**
 * Groups strokes whose end points meet within `tolerance` (a stroke split
 * into consecutive segments), using a hash grid of end points.
 */
function chainStrokes(strokes: PdfTextStroke[], tolerance: number): number[][] {
  const uf = new UnionFind(strokes.length)
  const cell = Math.max(tolerance, 1e-12)
  const grid = new Map<string, Array<{ index: number; p: PdfRecPoint }>>()
  strokes.forEach((stroke, index) => {
    const ends = [stroke.points[0], stroke.points[stroke.points.length - 1]]
    for (const p of ends) {
      const gx = Math.floor(p.x / cell)
      const gy = Math.floor(p.y / cell)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const other of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
            if (Math.hypot(other.p.x - p.x, other.p.y - p.y) <= tolerance) {
              uf.union(index, other.index)
            }
          }
        }
      }
      const key = `${gx},${gy}`
      const bucket = grid.get(key)
      if (bucket) bucket.push({ index, p })
      else grid.set(key, [{ index, p }])
    }
  })
  const groups = new Map<number, number[]>()
  strokes.forEach((_, i) => {
    const root = uf.find(i)
    const group = groups.get(root)
    if (group) group.push(i)
    else groups.set(root, [i])
  })
  return [...groups.values()]
}

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]]
      i = this.parent[i]
    }
    return i
  }
  union(a: number, b: number) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[ra] = rb
  }
}

/** Joins items whose boxes are within `gap`, using a uniform grid. */
function clusterBoxes(boxes: Box[], gap: number): number[][] {
  const uf = new UnionFind(boxes.length)
  const cell = Math.max(gap * 2, 1e-9)
  const grid = new Map<string, number[]>()
  boxes.forEach((box, i) => {
    const x0 = Math.floor((box.minX - gap) / cell)
    const x1 = Math.floor((box.maxX + gap) / cell)
    const y0 = Math.floor((box.minY - gap) / cell)
    const y1 = Math.floor((box.maxY + gap) / cell)
    const seen = new Set<number>()
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const key = `${gx},${gy}`
        const bucket = grid.get(key)
        if (bucket) {
          for (const j of bucket) {
            if (seen.has(j)) continue
            seen.add(j)
            if (boxGap(box, boxes[j]) <= gap) uf.union(i, j)
          }
          bucket.push(i)
        } else {
          grid.set(key, [i])
        }
      }
    }
  })
  const groups = new Map<number, number[]>()
  boxes.forEach((_, i) => {
    const root = uf.find(i)
    const group = groups.get(root)
    if (group) group.push(i)
    else groups.set(root, [i])
  })
  return [...groups.values()]
}

/**
 * Baseline direction of a text cluster, in `(-π/2, π/2]`.
 *
 * Uses the direction of the minimum-height oriented bounding box (rotating
 * calipers over the convex hull): along a text line the extent across the
 * baseline is smallest. Principal axes would be skewed by asymmetric glyphs.
 * Returns `undefined` when the cluster is not elongated enough to tell.
 */
function principalAngle(points: PdfRecPoint[]): number | undefined {
  const hull = convexHull(points)
  if (hull.length < 2) return undefined
  let bestAngle = 0
  let bestHeight = Infinity
  let bestLength = 0
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]
    const b = hull[(i + 1) % hull.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len === 0) continue
    const ux = (b.x - a.x) / len
    const uy = (b.y - a.y) / len
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const p of hull) {
      const u = p.x * ux + p.y * uy
      const v = -p.x * uy + p.y * ux
      minU = Math.min(minU, u)
      maxU = Math.max(maxU, u)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
    const height = maxV - minV
    if (height < bestHeight - 1e-12) {
      bestHeight = height
      bestLength = maxU - minU
      bestAngle = Math.atan2(uy, ux)
    }
  }
  // A single glyph or a square block of text has no reliable direction.
  if (!(bestLength > bestHeight * 1.8)) return undefined
  return normalizeTextAngle(bestAngle)
}

/** Andrew's monotone chain convex hull (counterclockwise). */
function convexHull(points: PdfRecPoint[]): PdfRecPoint[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (pts.length < 3) return pts
  const cross = (o: PdfRecPoint, a: PdfRecPoint, b: PdfRecPoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: PdfRecPoint[] = []
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: PdfRecPoint[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Folds an angle into `(-π/2, π/2]` and snaps near-orthogonal angles. */
function normalizeTextAngle(angle: number) {
  let a = angle
  while (a <= -Math.PI / 2) a += Math.PI
  while (a > Math.PI / 2) a -= Math.PI
  const snapped = Math.round(a / (Math.PI / 2)) * (Math.PI / 2)
  if (Math.abs(a - snapped) < (2 * Math.PI) / 180) a = snapped
  if (a <= -Math.PI / 2 + 1e-12) a += Math.PI
  return a
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

interface LocalStroke<Id> {
  stroke: PdfTextStroke<Id>
  minU: number
  maxU: number
  minV: number
  maxV: number
}

function localStrokes<Id>(
  strokes: PdfTextStroke<Id>[],
  angle: number
): LocalStroke<Id>[] {
  return strokes.map(stroke => {
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const p of stroke.points) {
      const { u, v } = toLocal(p, angle)
      minU = Math.min(minU, u)
      maxU = Math.max(maxU, u)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
    return { stroke, minU, maxU, minV, maxV }
  })
}

/** Splits strokes into groups separated by gaps along one local axis. */
function splitByGaps<Id>(
  items: LocalStroke<Id>[],
  axis: 'u' | 'v',
  gap: number
): LocalStroke<Id>[][] {
  const lo = axis === 'u' ? 'minU' : 'minV'
  const hi = axis === 'u' ? 'maxU' : 'maxV'
  const sorted = [...items].sort((a, b) => a[lo] - b[lo])
  const groups: LocalStroke<Id>[][] = []
  let current: LocalStroke<Id>[] = []
  let reach = -Infinity
  for (const item of sorted) {
    if (current.length > 0 && item[lo] - reach > gap) {
      groups.push(current)
      current = []
      reach = -Infinity
    }
    current.push(item)
    reach = Math.max(reach, item[hi])
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return percentile(sorted, 0.5)
}

interface LineBand {
  minU: number
  maxU: number
  minV: number
  maxV: number
}

function lineBand<Id>(items: LocalStroke<Id>[]): LineBand {
  return {
    minU: Math.min(...items.map(item => item.minU)),
    maxU: Math.max(...items.map(item => item.maxU)),
    minV: Math.min(...items.map(item => item.minV)),
    maxV: Math.max(...items.map(item => item.maxV))
  }
}

/**
 * Whether a stroke fits a text line: inside its band (with a quarter-height
 * margin) and no larger than about the line height.
 */
function fitsBand(item: LineBand, band: LineBand) {
  const height = band.maxV - band.minV
  const margin = height * 0.25
  const size = Math.max(item.maxU - item.minU, item.maxV - item.minV)
  return (
    size <= height * 1.5 &&
    item.minU >= band.minU - margin &&
    item.maxU <= band.maxU + margin &&
    item.minV >= band.minV - margin &&
    item.maxV <= band.maxV + margin
  )
}

interface Row<Id> {
  angle: number
  items: LocalStroke<Id>[]
}

/**
 * Merges rows lying inside the band of a taller row into it: pieces of a
 * large glyph that were split off where a long stroke, rejected at first,
 * joined them to the rest.
 */
function mergeFragments<Id>(rows: Row<Id>[]): Row<Id>[] {
  const height = (row: Row<Id>) => {
    const band = lineBand(row.items)
    return band.maxV - band.minV
  }
  const order = [...rows].sort((a, b) => height(a) - height(b))
  const removed = new Set<Row<Id>>()
  order.forEach((row, i) => {
    const strokes = row.items.map(item => item.stroke)
    for (let j = order.length - 1; j > i; j--) {
      const target = order[j]
      if (!(height(target) > height(row))) continue
      const local = localStrokes(strokes, target.angle)
      if (!fitsBand(lineBand(local), lineBand(target.items))) continue
      target.items.push(...local)
      removed.add(row)
      return
    }
  })
  return rows.filter(row => !removed.has(row))
}

function buildLine<Id>(
  items: LocalStroke<Id>[],
  angle: number,
  textHeight: number,
  glyphGap: number
): PdfTextLineCandidate<Id> {
  const glyphs: PdfTextGlyph<Id>[] = splitByGaps(
    items,
    'u',
    glyphGap * textHeight
  ).map(group => ({
    strokes: group.map(item => item.stroke),
    minU: Math.min(...group.map(item => item.minU)),
    maxU: Math.max(...group.map(item => item.maxU)),
    minV: Math.min(...group.map(item => item.minV)),
    maxV: Math.max(...group.map(item => item.maxV))
  }))
  // Descenders (g, p, y) hang below the baseline: most glyphs sit on it.
  const baseline = median(glyphs.map(glyph => glyph.minV))
  const tops = glyphs.map(glyph => glyph.maxV).sort((a, b) => a - b)
  const top = percentile(tops, 0.9)
  const minU = Math.min(...glyphs.map(glyph => glyph.minU))
  const maxU = Math.max(...glyphs.map(glyph => glyph.maxU))
  return {
    strokes: items.map(item => item.stroke),
    glyphs,
    rotation: angle,
    position: toWorld(minU, baseline, angle),
    height: Math.max(top - baseline, 1e-9),
    width: maxU - minU
  }
}

/**
 * Clusters strokes into text line candidates.
 *
 * 1. Strokes much larger than text are rejected.
 * 2. Strokes closer than `wordGap · height` join into phrases.
 * 3. Each phrase gets a baseline direction (minimum-height bounding box,
 *    or the dominant direction when the phrase is a single glyph).
 * 4. Each phrase is split into rows at gaps across the baseline, and rows
 *    into lines at gaps along it wider than `wordGap · height`.
 *
 * @param strokes - Candidate strokes in world coordinates.
 * @param options - Height hint and gap factors.
 */
export function clusterPdfTextStrokes<Id>(
  strokes: PdfTextStroke<Id>[],
  options: PdfTextClusterOptions = {}
): PdfTextClusterResult<Id> {
  const usable = strokes.filter(stroke => stroke.points.length > 0)
  const textHeight = options.textHeight ?? estimatePdfTextHeight(usable)
  const wordGap = options.wordGap ?? 1.2
  const glyphGap = options.glyphGap ?? 0.04
  if (!(textHeight > 0)) {
    return { lines: [], rejected: usable, textHeight: 0 }
  }

  const accepted: PdfTextStroke<Id>[] = []
  const rejected: PdfTextStroke<Id>[] = []
  for (const stroke of usable) {
    if (boxSize(strokeBox(stroke)) > textHeight * 1.5) rejected.push(stroke)
    else accepted.push(stroke)
  }

  // Phrases: strokes within a word gap. Lines of a paragraph may join into
  // one phrase; they are split into rows below once the direction is known.
  const boxes = accepted.map(strokeBox)
  const phrases = clusterBoxes(boxes, wordGap * textHeight).map(group =>
    group.map(i => accepted[i])
  )

  // Direction per phrase; round phrases borrow the dominant direction.
  const angles = phrases.map(phrase =>
    principalAngle(phrase.flatMap(stroke => stroke.points))
  )
  const known = angles.filter((a): a is number => a !== undefined)
  const dominant = known.length > 0 ? median(known) : 0

  const merged: Row<Id>[] = []
  phrases.forEach((phrase, i) => {
    const angle = angles[i] ?? dominant
    const local = localStrokes(phrase, angle)
    // Rows: gaps across the baseline. Lines: word gaps along it.
    for (const row of splitByGaps(local, 'v', textHeight * 0.1)) {
      for (const line of splitByGaps(row, 'u', wordGap * textHeight)) {
        merged.push({ angle, items: line })
      }
    }
  })

  // Strokes too long for the estimated height may belong to taller text (a
  // title above body text): keep those lying inside the band of such a line.
  const bands = merged.map(row => lineBand(row.items))
  const stillRejected = rejected.filter(stroke => {
    const index = merged.findIndex((row, i) =>
      fitsBand(localStrokes([stroke], row.angle)[0], bands[i])
    )
    if (index < 0) return true
    merged[index].items.push(...localStrokes([stroke], merged[index].angle))
    return false
  })
  const rows = mergeFragments(merged)

  const lines = rows.map(row =>
    buildLine(row.items, row.angle, textHeight, glyphGap)
  )
  // Reading order: top to bottom, then left to right.
  lines.sort((a, b) => {
    const dy = b.position.y - a.position.y
    if (Math.abs(dy) > Math.min(a.height, b.height) * 0.5) return dy
    return a.position.x - b.position.x
  })
  return { lines, rejected: stillRejected, textHeight }
}
