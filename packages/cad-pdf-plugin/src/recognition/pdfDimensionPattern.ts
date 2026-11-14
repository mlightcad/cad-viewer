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
  /**
   * Extra entity ids that form exploded stroke text beyond {@link id}
   * (each stroke is its own line/polyline).
   */
  extraIds?: Id[]
}

/**
 * Exploded stroke text whose characters are not yet known. Linear recognition
 * may still claim it and use the measured length as the value.
 */
export interface PdfDimUnreadText<Id = unknown> {
  id: Id
  extraIds: Id[]
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
  /**
   * Stroke clusters that look like dimension text but have no readable
   * value yet. Used only as a linear-dimension fallback.
   */
  unreadTexts?: PdfDimUnreadText<Id>[]
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
  /** Arrow length (or tick half-length); 0 without terminators. */
  arrowSize: number
  /** How far extension lines run past the dimension line. */
  extensionBeyond: number
  /** True when the terminators are architectural ticks. */
  ticks: boolean
  /**
   * True when the arrowheads sit outside the extension lines (tips point
   * toward each other). False for the usual inside arrows (pointing apart).
   */
  arrowsOut: boolean
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
      ...pdfDimTextIds(text)
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
    for (const id of pdfDimTextIds(text)) usedTexts.add(id)
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
      for (const id of pdfDimTextIds(text)) usedTexts.add(id)
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
        consumed: [
          ...arrow.ids,
          ...leaders.map(s => s.id),
          ...pdfDimTextIds(text)
        ]
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
    const acceptLinearText = (t: {
      center: PdfRecPoint
      height: number
      text?: string
    }) => {
      if (
        t.text !== undefined &&
        parsePdfDimensionValue(t.text) === undefined
      ) {
        return false
      }
      const rel = sub(t.center, a.tip)
      const along = dot(rel, u)
      const across = Math.abs(dot(rel, n))
      return (
        across <= t.height * 2.5 &&
        along >= -length * 0.5 - t.height * 4 &&
        along <= length * 1.5 + t.height * 4
      )
    }
    let text = nearestText(
      input.texts,
      usedTexts,
      mid,
      Math.max(length * 0.75, refSize * 6),
      t => acceptLinearText(t)
    )
    if (!text) {
      text = claimUnreadText(
        input.unreadTexts,
        usedTexts,
        mid,
        Math.max(length * 0.75, refSize * 6),
        length,
        t => acceptLinearText(t)
      )
    }
    if (!text) continue
    text = reconcileLinearDimText(text, length)

    // Inside arrows point apart (away from the span centre); outside arrows
    // point toward each other.
    const arrowsOut =
      a.direction !== undefined && dot(a.direction, u) > 0

    const consumed: Id[] = [
      ...a.ids,
      ...b.ids,
      ...pdfDimTextIds(text)
    ]
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
    // Rank 0: tip-near stubs with real object reach (full PDF extension length).
    // Rank 1: mid-crossing edges — keep the text-side endpoint (object side).
    // Rank 2: tiny tip-only stubs (DIMEXE overhang) — last resort only.
    // Never let a 1-unit beyond stub beat a 40-unit object-side edge.
    let beyond = 0
    const maxTipGap = Math.max(refSize * 2, a.size * 2, text.height * 1.5)
    const minReach = Math.max(a.size * 2, text.height, refSize * 2)
    const textSide =
      Math.sign(
        (text.center.x - mid.x) * n.x + (text.center.y - mid.y) * n.y
      ) || 1
    const extension = (tip: PdfRecPoint): PdfRecPoint => {
      let best:
        | {
            origin: PdfRecPoint
            id: Id
            beyond: number
            proximity: number
            reach: number
            rank: number
          }
        | undefined
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
          if (Math.min(Math.abs(t0), Math.abs(t1)) > maxTipGap) continue
        }
        const d0 = Math.abs(t0)
        const d1 = Math.abs(t1)
        const tipNear0 = d0 <= maxTipGap
        const tipNear1 = d1 <= maxTipGap
        let origin: PdfRecPoint
        let nearT: number
        let farT: number
        let proximity: number
        let rank: number
        if (tipNear0 || tipNear1) {
          // Tip near an end → that end is the dim-line foot; other end is origin.
          const nearIs0 = tipNear0 && (!tipNear1 || d0 <= d1)
          nearT = nearIs0 ? t0 : t1
          farT = nearIs0 ? t1 : t0
          origin = nearIs0 ? s.p1 : s.p0
          proximity = Math.abs(nearT)
          // Tiny tip stubs are overhang only; real extensions reach the object.
          rank = Math.abs(farT) >= minReach ? 0 : 2
        } else {
          // Mid-segment long edge: keep the text-side endpoint (object side).
          const on0 = Math.sign(t0) === textSide
          const on1 = Math.sign(t1) === textSide
          if (!on0 && !on1) continue
          const use0 = on0 && (!on1 || d0 >= d1)
          origin = use0 ? s.p0 : s.p1
          farT = use0 ? t0 : t1
          nearT = use0 ? t1 : t0
          proximity = Math.abs(nearT)
          rank = 1
        }
        const reach = Math.abs(farT)
        if (!(reach > tol)) continue
        const over =
          Math.sign(nearT) !== Math.sign(farT) && Math.sign(nearT) !== 0
            ? Math.min(Math.abs(nearT), maxTipGap)
            : 0
        // Prefer better rank, then longer object reach (match PDF length).
        if (
          !best ||
          rank < best.rank ||
          (rank === best.rank && reach > best.reach + tol) ||
          (rank === best.rank &&
            Math.abs(reach - best.reach) <= tol &&
            proximity < best.proximity)
        ) {
          best = { origin, id: s.id, beyond: over, proximity, reach, rank }
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
    for (const id of pdfDimTextIds(text)) usedTexts.add(id)
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
      arrowsOut,
      consumed
    })
  }

  results.push(
    ...recognizeBareLinear(input, usedSegments, usedTexts, refSize, tol, sinTol)
  )
  return results
}

/**
 * Linear dimensions drawn without arrowheads or ticks: a dimension line
 * whose two ends lie inside parallel perpendicular extension lines (which
 * run past it, as DIMEXE does), with a value text beside it. Requiring the
 * extension lines to continue past the dimension line keeps rectangle
 * sides, whose corners are segment ends, from matching.
 */
function recognizeBareLinear<Id>(
  input: PdfDimInput<Id>,
  usedSegments: Set<Id>,
  usedTexts: Set<Id>,
  refSize: number,
  tol: number,
  sinTol: number
): PdfLinearDimension<Id>[] {
  const results: PdfLinearDimension<Id>[] = []
  const lines = input.segments
    .map(s => ({ s, length: dist(s.p0, s.p1) }))
    .filter(({ length }) => length > tol * 4)
    .sort((p, q) => p.length - q.length)
  for (const { s: line, length } of lines) {
    if (usedSegments.has(line.id)) continue
    const u = unit(sub(line.p1, line.p0))
    const n = { x: -u.y, y: u.x }
    const extensionAt = (end: PdfRecPoint) => {
      for (const s of input.segments) {
        if (s === line || usedSegments.has(s.id)) continue
        const su = unit(sub(s.p1, s.p0))
        if (Math.abs(dot(su, u)) > sinTol) continue
        if (Math.abs(cross(su, sub(end, s.p0))) > tol * 2) continue
        const t0 = dot(sub(s.p0, end), n)
        const t1 = dot(sub(s.p1, end), n)
        // Both sides of the end must be covered: the extension runs past.
        if (Math.min(t0, t1) >= -tol * 2 || Math.max(t0, t1) <= tol * 2) {
          continue
        }
        const farIsP0 = Math.abs(t0) >= Math.abs(t1)
        return {
          id: s.id,
          origin: farIsP0 ? s.p0 : s.p1,
          side: Math.sign(farIsP0 ? t0 : t1),
          beyond: Math.abs(farIsP0 ? t1 : t0)
        }
      }
      return undefined
    }
    const e1 = extensionAt(line.p0)
    const e2 = extensionAt(line.p1)
    if (!e1 || !e2 || e1.id === e2.id) continue

    const mid = lerp(line.p0, line.p1, 0.5)
    const acceptBareText = (t: {
      center: PdfRecPoint
      height: number
      text?: string
    }) => {
      if (
        t.text !== undefined &&
        parsePdfDimensionValue(t.text) === undefined
      ) {
        return false
      }
      const rel = sub(t.center, line.p0)
      const along = dot(rel, u)
      return (
        Math.abs(dot(rel, n)) <= t.height * 2.5 &&
        along >= -t.height * 4 &&
        along <= length + t.height * 4
      )
    }
    let text = nearestText(
      input.texts,
      usedTexts,
      mid,
      Math.max(length * 0.75, refSize * 6),
      t => acceptBareText(t)
    )
    if (!text) {
      text = claimUnreadText(
        input.unreadTexts,
        usedTexts,
        mid,
        Math.max(length * 0.75, refSize * 6),
        length,
        t => acceptBareText(t)
      )
    }
    if (!text) continue

    for (const id of pdfDimTextIds(text)) usedTexts.add(id)
    const consumed = [line.id, e1.id, e2.id, ...pdfDimTextIds(text)]
    for (const id of consumed) usedSegments.add(id)
    let rotation = Math.atan2(u.y, u.x)
    if (rotation < 0) rotation += Math.PI
    if (rotation >= Math.PI - 1e-12) rotation -= Math.PI
    // The object lies on the far side of the extension lines; when they
    // disagree, keep the dimension line ends as origins.
    const sameSide = e1.side === e2.side
    results.push({
      kind: 'linear',
      xLine1: sameSide ? e1.origin : line.p0,
      xLine2: sameSide ? e2.origin : line.p1,
      dimLinePoint: line.p0,
      rotation,
      measured: length,
      text: reconcileLinearDimText(text, length),
      arrowSize: 0,
      extensionBeyond: sameSide ? Math.max(e1.beyond, e2.beyond) : 0,
      ticks: false,
      arrowsOut: false,
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
 * Claims the nearest unread stroke-text cluster and turns it into a
 * dimension text whose value is the measured length (paper 1:1 fallback
 * when OCR / the glyph dictionary could not read the strokes).
 */
function claimUnreadText<Id>(
  unread: PdfDimUnreadText<Id>[] | undefined,
  used: Set<Id>,
  near: PdfRecPoint,
  maxDistance: number,
  measured: number,
  accept: (text: PdfDimUnreadText<Id>) => boolean
): PdfDimText<Id> | undefined {
  if (!unread || unread.length === 0) return undefined
  let best: PdfDimUnreadText<Id> | undefined
  let bestDistance = maxDistance
  for (const text of unread) {
    if (used.has(text.id) || !accept(text)) continue
    const d = dist(text.center, near)
    if (d <= bestDistance) {
      bestDistance = d
      best = text
    }
  }
  if (!best) return undefined
  used.add(best.id)
  for (const id of best.extraIds) used.add(id)
  return {
    id: best.id,
    text: formatMeasuredLength(measured),
    center: best.center,
    height: best.height,
    extraIds: best.extraIds
  }
}

/** Entity ids that a dimension value text replaces. */
export function pdfDimTextIds<Id>(text: PdfDimText<Id>): Id[] {
  return text.extraIds && text.extraIds.length > 0
    ? [text.id, ...text.extraIds]
    : [text.id]
}

/** Compact decimal for a measured length used as a stroke-text fallback. */
function formatMeasuredLength(length: number): string {
  if (!Number.isFinite(length) || length <= 0) return '0'
  const rounded = Math.round(length)
  if (Math.abs(length - rounded) <= Math.max(length * 1e-6, 1e-6)) {
    return String(rounded)
  }
  const text = length.toFixed(4).replace(/\.?0+$/, '')
  return text.length > 0 ? text : String(length)
}

/**
 * Keeps a stroke-read value only when it agrees with the measured length or
 * a clear drawing scale. Over-segmented outline digits often read as "111"
 * and must not become DIMLFAC = 2.
 */
function reconcileLinearDimText<Id>(
  text: PdfDimText<Id>,
  measured: number
): PdfDimText<Id> {
  if (!(measured > 0)) return text
  // Leave annotated values alone (`44mm`, tolerances, …); only rewrite plain
  // numeric / R / Ø / ° readings that look like a bad stroke OCR.
  if (!/^[Øø⌀R]?\s*\d+([.,]\d+)?\s*°?$/i.test(text.text.trim())) return text
  const value = parsePdfDimensionValue(text.text)
  const digits = text.text.replace(/\D/g, '')
  if (value === undefined || (digits.length >= 2 && /^1+$/.test(digits))) {
    return { ...text, text: formatMeasuredLength(measured) }
  }
  const ratio = value / measured
  if (Math.abs(ratio - 1) <= 0.05) return text
  if (isNiceScaleRatio(ratio)) return text
  return { ...text, text: formatMeasuredLength(measured) }
}

/** Whether `ratio` is within 1 % of 1, 2, 2.5 or 5 × 10ⁿ. */
function isNiceScaleRatio(ratio: number): boolean {
  if (!(ratio > 0)) return false
  const exponent = Math.floor(Math.log10(ratio))
  for (const e of [exponent - 1, exponent, exponent + 1]) {
    for (const m of [1, 2, 2.5, 5]) {
      const nice = m * 10 ** e
      if (Math.abs(nice - ratio) <= ratio * 0.01) return true
    }
  }
  return false
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
