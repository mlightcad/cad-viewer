/**
 * Recognizes exploded dimensions (arrowheads or ticks, dimension line,
 * extension lines and text) in imported PDF geometry.
 *
 * Pure geometry: callers describe lines, closed polylines, circles and texts
 * with plain data, so the recognizer is unit-testable without the data model.
 */

import { cross, dist, dot, type PdfRecPoint, sub } from './pdfRecGeometry'

/** A straight segment (line, or 2-vertex polyline). */
export interface PdfDimSegment<Id = unknown> {
  id: Id
  p0: PdfRecPoint
  p1: PdfRecPoint
}

/** A closed polyline that may be an arrowhead. */
export interface PdfDimPolygon<Id = unknown> {
  id: Id
  /** Vertices without the repeated closing point. */
  vertices: PdfRecPoint[]
}

/** A circle or arc a radial dimension may point at. */
export interface PdfDimCurve {
  center: PdfRecPoint
  radius: number
}

/** An arc that may be the dimension arc of an angular dimension. */
export interface PdfDimArc<Id = unknown> {
  id: Id
  center: PdfRecPoint
  radius: number
  /** Start angle in radians; the arc runs counterclockwise to `endAngle`. */
  startAngle: number
  endAngle: number
}

/** A text that may be a dimension value. */
export interface PdfDimText<Id = unknown> {
  id: Id
  text: string
  /** Center of the text box. */
  center: PdfRecPoint
  height: number
}

/** Shapes to search, in model-space coordinates. */
export interface PdfDimInput<Id = unknown> {
  segments: PdfDimSegment<Id>[]
  polygons: PdfDimPolygon<Id>[]
  curves: PdfDimCurve[]
  texts: PdfDimText<Id>[]
  /** Arcs that may carry angular dimensions. Optional. */
  arcs?: PdfDimArc<Id>[]
}

/** A recognized linear (rotated) dimension. */
export interface PdfLinearDimension<Id = unknown> {
  kind: 'linear'
  /** First extension line origin (object side). */
  xLine1: PdfRecPoint
  /** Second extension line origin (object side). */
  xLine2: PdfRecPoint
  /** A point on the dimension line. */
  dimLinePoint: PdfRecPoint
  /** Dimension line direction in radians, in `[0, π)`. */
  rotation: number
  /** Distance between the terminators. */
  measured: number
  text: PdfDimText<Id>
  /** Arrow length (or tick half-length). */
  arrowSize: number
  /** How far extension lines run past the dimension line. */
  extensionBeyond: number
  /** True when the terminators are architectural ticks. */
  ticks: boolean
  /** Source shapes the dimension replaces. */
  consumed: Id[]
}

/** A recognized radius or diameter dimension. */
export interface PdfRadialDimension<Id = unknown> {
  kind: 'radius' | 'diameter'
  center: PdfRecPoint
  /** Point on the curve the arrow touches. */
  chordPoint: PdfRecPoint
  radius: number
  /** Distance from the chord point to the text. */
  leaderLength: number
  /** Radius or diameter, matching `kind`. */
  measured: number
  text: PdfDimText<Id>
  arrowSize: number
  consumed: Id[]
}

/** A recognized angular dimension (three-point form). */
export interface PdfAngularDimension<Id = unknown> {
  kind: 'angular'
  center: PdfRecPoint
  /** A point on the first leg (object side). */
  xLine1: PdfRecPoint
  /** A point on the second leg (object side). */
  xLine2: PdfRecPoint
  /** Midpoint of the dimension arc. */
  arcPoint: PdfRecPoint
  /** Measured angle in degrees. */
  measured: number
  text: PdfDimText<Id>
  arrowSize: number
  consumed: Id[]
}

export type PdfDimensionCandidate<Id = unknown> =
  | PdfLinearDimension<Id>
  | PdfRadialDimension<Id>
  | PdfAngularDimension<Id>

/** Tuning for {@link recognizePdfDimensions}. */
export interface PdfDimensionOptions {
  /** Geometric tolerance. Default: 2 % of the median arrow size. */
  tolerance?: number
  /** Angular tolerance in radians. Default 3°. */
  angleTolerance?: number
}

/** Arrowhead or tick at one end of a dimension line. */
interface Terminator<Id> {
  ids: Id[]
  tip: PdfRecPoint
  /** Unit vector the arrow points along (toward its tip); unset for ticks. */
  direction?: PdfRecPoint
  size: number
}

function unit(v: PdfRecPoint): PdfRecPoint {
  const len = Math.hypot(v.x, v.y)
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }
}

function lerp(a: PdfRecPoint, b: PdfRecPoint, t: number): PdfRecPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Reads an arrowhead from a closed triangle: the sharpest corner is the tip,
 * the others form the base. Rejects shapes that are not slender triangles.
 */
export function pdfArrowFromPolygon(
  vertices: PdfRecPoint[]
): { tip: PdfRecPoint; direction: PdfRecPoint; size: number } | undefined {
  const pts = [...vertices]
  if (pts.length === 4 && dist(pts[0], pts[3]) < 1e-9) pts.pop()
  if (pts.length !== 3) return undefined
  const angleAt = (i: number) => {
    const a = sub(pts[(i + 1) % 3], pts[i])
    const b = sub(pts[(i + 2) % 3], pts[i])
    return Math.atan2(Math.abs(cross(a, b)), dot(a, b))
  }
  const angles = [0, 1, 2].map(angleAt)
  const tipIndex = angles.indexOf(Math.min(...angles))
  // Dimension arrows are slender: tip angle typically 15°–40°.
  if (angles[tipIndex] > (50 * Math.PI) / 180) return undefined
  const tip = pts[tipIndex]
  const baseMid = lerp(pts[(tipIndex + 1) % 3], pts[(tipIndex + 2) % 3], 0.5)
  const size = dist(tip, baseMid)
  if (!(size > 0)) return undefined
  return { tip, direction: unit(sub(tip, baseMid)), size }
}

/** First number in a dimension text, e.g. `Ø25` → 25, `1,200` → 1200. */
export function parsePdfDimensionValue(text: string): number | undefined {
  const match = /\d+(?:[.,]\d+)*/.exec(text.replace(/\s+/g, ''))
  if (!match) return undefined
  let raw = match[0]
  if (/^\d{1,3}(,\d{3})+$/.test(raw)) raw = raw.replace(/,/g, '')
  else raw = raw.replace(',', '.')
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : undefined
}

/** Classifies a dimension text prefix. */
function radialKind(text: string): 'radius' | 'diameter' | undefined {
  const t = text.trim()
  if (/^(Ø|⌀|ø|%%c|%%C|\\U\+2205)/.test(t)) return 'diameter'
  if (/^R\s*\d/i.test(t)) return 'radius'
  return undefined
}

/**
 * Finds linear, radius and diameter dimensions.
 *
 * Linear: two terminators whose tips share their axis (arrows pointing
 * apart, or together for small dimensions), a value text beside them, and
 * optional extension lines through each tip. Pairs are taken shortest
 * first so chained dimensions sharing extension lines stay separate.
 *
 * Radial: an arrow whose tip lies on a circle and points along its radius,
 * with an `R…` or `Ø…` text nearby.
 *
 * @param input - Candidate shapes.
 * @param options - Tolerances.
 */
export function recognizePdfDimensions<Id>(
  input: PdfDimInput<Id>,
  options: PdfDimensionOptions = {}
): PdfDimensionCandidate<Id>[] {
  const arrows: Terminator<Id>[] = []
  for (const polygon of input.polygons) {
    const arrow = pdfArrowFromPolygon(polygon.vertices)
    if (arrow) arrows.push({ ids: [polygon.id], ...arrow })
  }
  const textHeights = input.texts.map(t => t.height).filter(h => h > 0)
  const refSize = median(arrows.map(a => a.size)) || median(textHeights) || 1
  const tol = options.tolerance ?? Math.max(refSize * 0.02, 1e-6)
  const angleTol = options.angleTolerance ?? (3 * Math.PI) / 180
  const sinTol = Math.sin(angleTol)

  const usedSegments = new Set<Id>()
  const usedTexts = new Set<Id>()
  const usedArrows = new Set<Terminator<Id>>()
  // Chained dimensions share extension lines, so those may be referenced
  // again (they are consumed only once).
  const extensionIds = new Set<Id>()
  const results: PdfDimensionCandidate<Id>[] = []

  // Angular dimensions first: an arc with an arrow at each end, pointing
  // along the arc, and a value text near its middle.
  const tangentTol = Math.sin((10 * Math.PI) / 180)
  for (const arc of input.arcs ?? []) {
    if (usedSegments.has(arc.id)) continue
    const at = (angle: number) => ({
      x: arc.center.x + arc.radius * Math.cos(angle),
      y: arc.center.y + arc.radius * Math.sin(angle)
    })
    let sweep = arc.endAngle - arc.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    const ends = [at(arc.startAngle), at(arc.startAngle + sweep)]
    const endArrows = ends.map(end =>
      arrows.find(a => {
        if (usedArrows.has(a) || dist(a.tip, end) > tol * 4) return false
        const radial = unit(sub(end, arc.center))
        return Math.abs(dot(a.direction!, radial)) <= tangentTol
      })
    )
    if (!endArrows[0] || !endArrows[1] || endArrows[0] === endArrows[1]) {
      continue
    }
    const arcPoint = at(arc.startAngle + sweep / 2)
    const text = nearestText(
      input.texts,
      usedTexts,
      arcPoint,
      Math.max(arc.radius * 0.8, refSize * 6),
      t => parsePdfDimensionValue(t.text) !== undefined
    )
    if (!text) continue
    const consumed: Id[] = [
      arc.id,
      ...endArrows[0].ids,
      ...endArrows[1].ids,
      text.id
    ]
    // Radial extension lines through each end; the end nearer the center
    // is the object side.
    const leg = (end: PdfRecPoint): PdfRecPoint => {
      const radial = unit(sub(end, arc.center))
      for (const s of input.segments) {
        if (usedSegments.has(s.id) || consumed.includes(s.id)) continue
        const su = unit(sub(s.p1, s.p0))
        if (Math.abs(cross(su, radial)) > sinTol) continue
        if (Math.abs(cross(radial, sub(s.p0, arc.center))) > tol * 2) continue
        if (!pointNearSegment(end, s, refSize * 2)) continue
        consumed.push(s.id)
        return dist(s.p0, arc.center) <= dist(s.p1, arc.center) ? s.p0 : s.p1
      }
      return end
    }
    const xLine1 = leg(ends[0])
    const xLine2 = leg(ends[1])
    usedArrows.add(endArrows[0])
    usedArrows.add(endArrows[1])
    usedTexts.add(text.id)
    for (const id of consumed) usedSegments.add(id)
    results.push({
      kind: 'angular',
      center: arc.center,
      xLine1,
      xLine2,
      arcPoint,
      measured: (sweep * 180) / Math.PI,
      text,
      arrowSize: endArrows[0].size,
      consumed
    })
  }

  // Radial dimensions next: their arrows must not pair up as linear ones.
  for (const arrow of arrows) {
    for (const curve of input.curves) {
      const radial = sub(arrow.tip, curve.center)
      const r = Math.hypot(radial.x, radial.y)
      if (Math.abs(r - curve.radius) > tol * 2 || r === 0) continue
      if (Math.abs(cross(arrow.direction!, unit(radial))) > sinTol) continue
      const text = nearestText(
        input.texts,
        usedTexts,
        arrow.tip,
        refSize * 12,
        t => radialKind(t.text) !== undefined
      )
      if (!text) continue
      const kind = radialKind(text.text)!
      const leaders = input.segments.filter(
        s =>
          !usedSegments.has(s.id) &&
          (dist(s.p0, arrow.tip) <= tol * 2 ||
            dist(s.p1, arrow.tip) <= tol * 2 ||
            pointNearSegment(arrow.tip, s, tol * 2))
      )
      for (const s of leaders) usedSegments.add(s.id)
      usedTexts.add(text.id)
      usedArrows.add(arrow)
      results.push({
        kind,
        center: curve.center,
        chordPoint: arrow.tip,
        radius: curve.radius,
        leaderLength: dist(arrow.tip, text.center),
        measured: kind === 'diameter' ? curve.radius * 2 : curve.radius,
        text,
        arrowSize: arrow.size,
        consumed: [...arrow.ids, ...leaders.map(s => s.id), text.id]
      })
      break
    }
  }

  // Ticks: short oblique lines centered near the ends of a longer line.
  const ticks: Array<Terminator<Id> & { line: PdfDimSegment<Id> }> = []
  const shortLimit = Math.max(median(textHeights), refSize) * 1.5
  const shorts = input.segments.filter(s => dist(s.p0, s.p1) <= shortLimit)
  for (const line of input.segments) {
    const length = dist(line.p0, line.p1)
    if (length <= shortLimit) continue
    const u = unit(sub(line.p1, line.p0))
    for (const tick of shorts) {
      const mid = lerp(tick.p0, tick.p1, 0.5)
      if (Math.abs(cross(u, sub(mid, line.p0))) > tol * 2) continue
      const along = dot(sub(mid, line.p0), u)
      const nearEnd = Math.min(Math.abs(along), Math.abs(along - length))
      if (nearEnd > shortLimit) continue
      const tu = unit(sub(tick.p1, tick.p0))
      const angle = Math.acos(Math.min(1, Math.abs(dot(tu, u))))
      if (angle < Math.PI / 6 || angle > Math.PI / 3) continue
      ticks.push({
        ids: [tick.id],
        tip: mid,
        size: dist(tick.p0, tick.p1) / 2,
        line
      })
    }
  }

  // Linear dimensions from arrow pairs.
  type Pair = { a: Terminator<Id>; b: Terminator<Id>; length: number }
  const pairs: Pair[] = []
  const free = arrows.filter(a => !usedArrows.has(a))
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      const a = free[i]
      const b = free[j]
      if (Math.max(a.size, b.size) > Math.min(a.size, b.size) * 1.5) continue
      const d = sub(b.tip, a.tip)
      const length = Math.hypot(d.x, d.y)
      if (length <= tol * 4) continue
      const u = unit(d)
      if (Math.abs(cross(a.direction!, u)) > sinTol) continue
      if (Math.abs(cross(b.direction!, u)) > sinTol) continue
      // Pointing apart (inside arrows) or toward each other (outside arrows).
      if (dot(a.direction!, u) * dot(b.direction!, u) >= 0) continue
      pairs.push({ a, b, length })
    }
  }
  // Tick pairs share one dimension line.
  for (let i = 0; i < ticks.length; i++) {
    for (let j = i + 1; j < ticks.length; j++) {
      if (ticks[i].line !== ticks[j].line) continue
      const length = dist(ticks[i].tip, ticks[j].tip)
      if (length <= tol * 4) continue
      pairs.push({ a: ticks[i], b: ticks[j], length })
    }
  }
  pairs.sort((p, q) => p.length - q.length)

  for (const { a, b, length } of pairs) {
    if (usedArrows.has(a) || usedArrows.has(b)) continue
    if (
      a.ids.some(id => usedSegments.has(id)) ||
      b.ids.some(id => usedSegments.has(id))
    ) {
      continue
    }
    const u = unit(sub(b.tip, a.tip))
    const n = { x: -u.y, y: u.x }
    const mid = lerp(a.tip, b.tip, 0.5)
    const text = nearestText(
      input.texts,
      usedTexts,
      mid,
      Math.max(length * 0.75, refSize * 6),
      t => {
        const rel = sub(t.center, a.tip)
        const along = dot(rel, u)
        const across = Math.abs(dot(rel, n))
        return (
          parsePdfDimensionValue(t.text) !== undefined &&
          across <= t.height * 2.5 &&
          along >= -length * 0.5 - t.height * 4 &&
          along <= length * 1.5 + t.height * 4
        )
      }
    )
    if (!text) continue

    const consumed: Id[] = [...a.ids, ...b.ids, text.id]
    // Dimension line pieces: collinear segments overlapping the span.
    for (const s of input.segments) {
      if (usedSegments.has(s.id) || consumed.includes(s.id)) continue
      const r0 = sub(s.p0, a.tip)
      const r1 = sub(s.p1, a.tip)
      if (Math.abs(dot(r0, n)) > tol * 2 || Math.abs(dot(r1, n)) > tol * 2)
        continue
      const lo = Math.min(dot(r0, u), dot(r1, u))
      const hi = Math.max(dot(r0, u), dot(r1, u))
      // Overlap the span, or sit entirely in the arrow tails (outside
      // arrows); merely touching a tip is a neighbouring dimension.
      const overlap = Math.min(hi, length) - Math.max(lo, 0)
      const inTails = lo >= -refSize * 4 && hi <= length + refSize * 4
      if (overlap <= tol * 4 && !inTails) continue
      consumed.push(s.id)
    }

    // Extension lines: perpendicular segments through each tip.
    let beyond = 0
    const extension = (tip: PdfRecPoint): PdfRecPoint => {
      let best: { origin: PdfRecPoint; id: Id; beyond: number } | undefined
      for (const s of input.segments) {
        const shared = extensionIds.has(s.id)
        if ((usedSegments.has(s.id) && !shared) || consumed.includes(s.id)) {
          continue
        }
        const su = unit(sub(s.p1, s.p0))
        if (Math.abs(dot(su, u)) > sinTol) continue
        if (Math.abs(cross(su, sub(tip, s.p0))) > tol * 2) continue
        const t0 = dot(sub(s.p0, tip), n)
        const t1 = dot(sub(s.p1, tip), n)
        // The tip must lie on (or just past) the segment.
        if (Math.min(t0, t1) > tol * 2 || Math.max(t0, t1) < -tol * 2) {
          if (Math.min(Math.abs(t0), Math.abs(t1)) > refSize) continue
        }
        const far = Math.abs(t0) >= Math.abs(t1) ? s.p0 : s.p1
        const near = far === s.p0 ? t1 : t0
        const sideFar = far === s.p0 ? t0 : t1
        // Extension beyond the dimension line, on the side away from the object.
        const over = Math.sign(near) !== Math.sign(sideFar) ? Math.abs(near) : 0
        if (!best || dist(far, tip) > dist(best.origin, tip)) {
          best = { origin: far, id: s.id, beyond: over }
        }
      }
      if (!best) return tip
      if (!extensionIds.has(best.id)) consumed.push(best.id)
      extensionIds.add(best.id)
      beyond = Math.max(beyond, best.beyond)
      return best.origin
    }
    const xLine1 = extension(a.tip)
    const xLine2 = extension(b.tip)

    usedArrows.add(a)
    usedArrows.add(b)
    usedTexts.add(text.id)
    for (const id of consumed) usedSegments.add(id)
    let rotation = Math.atan2(u.y, u.x)
    if (rotation < 0) rotation += Math.PI
    if (rotation >= Math.PI - 1e-12) rotation -= Math.PI
    results.push({
      kind: 'linear',
      xLine1,
      xLine2,
      dimLinePoint: a.tip,
      rotation,
      measured: length,
      text,
      arrowSize: a.size,
      extensionBeyond: beyond,
      ticks: a.direction === undefined,
      consumed
    })
  }
  return results
}

function pointNearSegment(
  p: PdfRecPoint,
  s: { p0: PdfRecPoint; p1: PdfRecPoint },
  tol: number
) {
  const d = sub(s.p1, s.p0)
  const len2 = dot(d, d)
  if (len2 === 0) return dist(p, s.p0) <= tol
  const t = Math.max(0, Math.min(1, dot(sub(p, s.p0), d) / len2))
  return dist(p, lerp(s.p0, s.p1, t)) <= tol
}

function nearestText<Id>(
  texts: PdfDimText<Id>[],
  used: Set<Id>,
  near: PdfRecPoint,
  maxDistance: number,
  accept: (text: PdfDimText<Id>) => boolean
): PdfDimText<Id> | undefined {
  let best: PdfDimText<Id> | undefined
  let bestDistance = maxDistance
  for (const text of texts) {
    if (used.has(text.id) || !accept(text)) continue
    const d = dist(text.center, near)
    if (d <= bestDistance) {
      bestDistance = d
      best = text
    }
  }
  return best
}

/**
 * Most common text-value / measured-length ratio, i.e. the drawing scale the
 * PDF was printed at. Uses linear dimensions when there are any. Returns `undefined` when
 * no dimension has a numeric text.
 */
export function suggestPdfDimensionScale(
  dimensions: PdfDimensionCandidate[]
): number | undefined {
  // Linear dimensions are the reliable signal; radial texts are often
  // annotated independently of the drawing scale.
  const linear = dimensions.filter(d => d.kind === 'linear')
  const radial = dimensions.filter(
    d => d.kind === 'radius' || d.kind === 'diameter'
  )
  // Angles do not scale with the drawing, so they never vote.
  const ratios = (linear.length > 0 ? linear : radial)
    .map(d => {
      const value = parsePdfDimensionValue(d.text.text)
      return value !== undefined && d.measured > 0 ? value / d.measured : NaN
    })
    .filter(r => Number.isFinite(r) && r > 0)
  if (ratios.length === 0) return undefined
  // Cluster ratios within 1 % and take the biggest cluster's median.
  let best: number[] = []
  for (const r of ratios) {
    const cluster = ratios.filter(x => Math.abs(x - r) <= r * 0.01)
    if (cluster.length > best.length) best = cluster
  }
  return median(best)
}
