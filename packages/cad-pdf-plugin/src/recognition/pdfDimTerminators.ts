/**
 * Dimension terminators: the symbols at the ends of a dimension line.
 *
 * - closed / filled arrows: slender closed triangles (polyline or solid fill)
 * - open arrows: two short equal strokes meeting at a sharp tip
 * - ticks: short oblique strokes centred on a line end (architectural)
 * - dots: small circles or filled discs
 */

import {
  PdfDimGrid,
  pdfDimLerp,
  pdfDimMedian,
  pdfDimSegmentBox,
  pdfDimUnit
} from './pdfDimPrimitives.js'
import { cross, dist, dot, type PdfRecPoint, sub } from './pdfRecGeometry.js'

/** Kind of terminator; `none` marks a bare dimension line end. */
export type PdfDimTerminatorKind = 'closed' | 'open' | 'tick' | 'dot' | 'none'

/** A symbol at one end of a dimension line. */
export interface PdfDimTerminator<Id> {
  kind: PdfDimTerminatorKind
  /** Source shapes forming the symbol. */
  ids: Id[]
  /** Point the symbol marks (arrow tip, tick or dot centre). */
  tip: PdfRecPoint
  /** Unit vector toward the tip; unset for ticks and dots. */
  direction?: PdfRecPoint
  /** Arrow length, tick half-length or dot radius. */
  size: number
  /** For ticks: the stroke direction (they are oblique to the line). */
  stroke?: PdfRecPoint
}

/** Straight segment input. */
export interface PdfDimTerminatorSegment<Id> {
  id: Id
  p0: PdfRecPoint
  p1: PdfRecPoint
}

/**
 * Reads an arrowhead from a closed triangle (or a 4-point fill whose last
 * point repeats the first): the sharpest corner is the tip, the others form
 * the base. Rejects shapes that are not slender triangles.
 */
export function pdfDimArrowFromPolygon(
  vertices: PdfRecPoint[]
): { tip: PdfRecPoint; direction: PdfRecPoint; size: number } | undefined {
  const pts = [...vertices]
  if (pts.length === 4 && dist(pts[0], pts[3]) < 1e-9) pts.pop()
  // A quad with one near-degenerate edge is a triangle drawn with a
  // repeated corner (common for solid fills).
  if (pts.length === 4) {
    const edges = pts.map((p, i) => dist(p, pts[(i + 1) % 4]))
    const shortest = Math.min(...edges)
    if (shortest < Math.max(...edges) * 0.02) {
      pts.splice((edges.indexOf(shortest) + 1) % 4, 1)
    }
  }
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
  if (angles[tipIndex] < (6 * Math.PI) / 180) return undefined
  const tip = pts[tipIndex]
  const baseMid = pdfDimLerp(
    pts[(tipIndex + 1) % 3],
    pts[(tipIndex + 2) % 3],
    0.5
  )
  const size = dist(tip, baseMid)
  if (!(size > 0)) return undefined
  return { tip, direction: pdfDimUnit(sub(tip, baseMid)), size }
}

/**
 * Open arrows: two short strokes of equal length sharing one end point at an
 * angle of 15°–60°. Each stroke is used once.
 */
export function pdfDimOpenArrows<Id>(
  segments: PdfDimTerminatorSegment<Id>[],
  maxSize: number,
  tol: number
): PdfDimTerminator<Id>[] {
  const shorts = segments.filter(s => {
    const len = dist(s.p0, s.p1)
    return len > tol * 4 && len <= maxSize
  })
  const grid = new PdfDimGrid<PdfDimTerminatorSegment<Id>>(maxSize)
  for (const s of shorts) grid.add(s, pdfDimSegmentBox(s.p0, s.p1))
  const used = new Set<PdfDimTerminatorSegment<Id>>()
  const result: PdfDimTerminator<Id>[] = []
  for (const a of shorts) {
    if (used.has(a)) continue
    for (const end of [a.p0, a.p1]) {
      if (used.has(a)) break
      const other = end === a.p0 ? a.p1 : a.p0
      for (const b of grid.near(end, tol * 2)) {
        if (b === a || used.has(b)) continue
        const bEnd =
          dist(b.p0, end) <= tol * 2
            ? b.p0
            : dist(b.p1, end) <= tol * 2
              ? b.p1
              : undefined
        if (!bEnd) continue
        const bOther = bEnd === b.p0 ? b.p1 : b.p0
        const la = dist(end, other)
        const lb = dist(bEnd, bOther)
        if (Math.abs(la - lb) > Math.max(la, lb) * 0.15) continue
        const ua = pdfDimUnit(sub(other, end))
        const ub = pdfDimUnit(sub(bOther, end))
        const angle = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub))))
        if (angle < (15 * Math.PI) / 180 || angle > (60 * Math.PI) / 180) {
          continue
        }
        const back = pdfDimUnit({ x: ua.x + ub.x, y: ua.y + ub.y })
        used.add(a)
        used.add(b)
        result.push({
          kind: 'open',
          ids: [a.id, b.id],
          tip: end,
          direction: { x: -back.x, y: -back.y },
          size: ((la + lb) / 2) * Math.cos(angle / 2)
        })
        break
      }
    }
  }
  return result
}

/**
 * Ticks: short strokes at 30°–60° to a longer line, centred within a tick
 * length of one of its ends.
 */
export function pdfDimTicks<Id>(
  segments: PdfDimTerminatorSegment<Id>[],
  maxSize: number,
  tol: number
): Array<PdfDimTerminator<Id> & { line: PdfDimTerminatorSegment<Id> }> {
  const shorts = segments.filter(s => {
    const len = dist(s.p0, s.p1)
    return len > tol * 4 && len <= maxSize
  })
  const grid = new PdfDimGrid<PdfDimTerminatorSegment<Id>>(maxSize)
  for (const s of shorts) grid.add(s, pdfDimSegmentBox(s.p0, s.p1))
  const result: Array<
    PdfDimTerminator<Id> & { line: PdfDimTerminatorSegment<Id> }
  > = []
  for (const line of segments) {
    const length = dist(line.p0, line.p1)
    if (length <= maxSize) continue
    const u = pdfDimUnit(sub(line.p1, line.p0))
    for (const end of [line.p0, line.p1]) {
      for (const tick of grid.near(end, maxSize)) {
        const mid = pdfDimLerp(tick.p0, tick.p1, 0.5)
        if (dist(mid, end) > maxSize * 0.5) continue
        if (Math.abs(cross(u, sub(mid, line.p0))) > tol * 2) continue
        const tu = pdfDimUnit(sub(tick.p1, tick.p0))
        const angle = Math.acos(Math.min(1, Math.abs(dot(tu, u))))
        if (angle < Math.PI / 6 || angle > Math.PI / 3) continue
        result.push({
          kind: 'tick',
          ids: [tick.id],
          tip: mid,
          size: dist(tick.p0, tick.p1) / 2,
          stroke: tu,
          line
        })
      }
    }
  }
  return result
}

/** Typical terminator size among `terminators` (median). */
export function pdfDimTerminatorSize<Id>(
  terminators: PdfDimTerminator<Id>[]
): number {
  return pdfDimMedian(terminators.map(t => t.size).filter(s => s > 0))
}
