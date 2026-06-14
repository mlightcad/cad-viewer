/**
 * Curve intersection math for object snap in the offline HTML viewer.
 *
 * Intersections are evaluated on pointer query (not at layout load) so opening
 * large HTML exports stays fast. {@link AcExOsnapIndex} uses its geometry RBush
 * to limit pairwise tests to sources near the cursor.
 *
 * @packageDocumentation
 */

import { FLOAT_TOL, TAU } from '@mlightcad/data-model'

import { normalizeArcDelta } from './AcExOsnapPrimitiveToAcGe'
import type {
  AcExOsnapArcPrimitive,
  AcExOsnapCirclePrimitive,
  AcExOsnapLinePrimitive,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'

/** Tessellated segment for intersection fallback. */
export interface AcExOsnapSegmentLike {
  x0: number
  y0: number
  x1: number
  y1: number
}

type AcExCircArcLike = AcExOsnapCirclePrimitive | AcExOsnapArcPrimitive

/** Max nearby geometry sources considered per intersection query. */
export const ACEX_MAX_INTERSECTION_SOURCES = 48

export function intersectionToleranceForExtent(extent: number): number {
  return Math.max(FLOAT_TOL, Math.max(extent, 1) * 1e-9)
}

export function intersectLineSegments(
  a: AcExOsnapSegmentLike,
  b: AcExOsnapSegmentLike,
  tol: number
): { x: number; y: number } | undefined {
  const d1x = a.x1 - a.x0
  const d1y = a.y1 - a.y0
  const d2x = b.x1 - b.x0
  const d2y = b.y1 - b.y0
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < tol) return undefined

  const dx = b.x0 - a.x0
  const dy = b.y0 - a.y0
  const t = (dx * d2y - dy * d2x) / denom
  const u = (dx * d1y - dy * d1x) / denom
  if (t < -tol || t > 1 + tol || u < -tol || u > 1 + tol) return undefined

  return { x: a.x0 + t * d1x, y: a.y0 + t * d1y }
}

function isAngleInArcSweep(
  angle: number,
  prim: AcExOsnapArcPrimitive,
  tol: number
): boolean {
  const delta = normalizeArcDelta(prim.startAngle, prim.endAngle)
  let rel = angle - prim.startAngle
  while (rel < 0) rel += TAU
  while (rel >= TAU) rel -= TAU
  const angleTol = Math.max(tol / Math.max(prim.r, 1), 1e-12)
  return rel <= delta + angleTol
}

function isPointOnCircArc(
  x: number,
  y: number,
  prim: AcExCircArcLike,
  tol: number
): boolean {
  if (prim.kind === 'circle') {
    return Math.abs(Math.hypot(x - prim.cx, y - prim.cy) - prim.r) <= tol
  }
  const dist = Math.hypot(x - prim.cx, y - prim.cy)
  if (Math.abs(dist - prim.r) > tol) return false
  const sx = prim.normalSign === -1 ? -1 : 1
  if (Math.abs(prim.r) < tol) return false
  const cosA = (x - prim.cx) / (sx * prim.r)
  const sinA = (y - prim.cy) / prim.r
  if (Math.abs(cosA * cosA + sinA * sinA - 1) > 1e-6) return false
  const angle = Math.atan2(sinA, cosA)
  return isAngleInArcSweep(angle, prim, tol)
}

function intersectLineCircle(
  line: AcExOsnapLinePrimitive,
  circ: AcExCircArcLike,
  tol: number
): Array<{ x: number; y: number }> {
  const dx = line.x1 - line.x0
  const dy = line.y1 - line.y0
  const fx = line.x0 - circ.cx
  const fy = line.y0 - circ.cy
  const a = dx * dx + dy * dy
  if (a < tol * tol) return []

  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - circ.r * circ.r
  const disc = b * b - 4 * a * c
  if (disc < -tol) return []

  const out: Array<{ x: number; y: number }> = []
  const sqrtDisc = Math.sqrt(Math.max(0, disc))
  for (const sign of [-1, 1] as const) {
    const t = (-b + sign * sqrtDisc) / (2 * a)
    if (t < -tol || t > 1 + tol) continue
    const x = line.x0 + t * dx
    const y = line.y0 + t * dy
    if (isPointOnCircArc(x, y, circ, tol)) {
      out.push({ x, y })
    }
  }
  return out
}

function intersectCircles(
  a: AcExCircArcLike,
  b: AcExCircArcLike,
  tol: number
): Array<{ x: number; y: number }> {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const d = Math.hypot(dx, dy)
  if (d < tol) return []

  const rSum = a.r + b.r
  const rDiff = Math.abs(a.r - b.r)
  if (d > rSum + tol || d < rDiff - tol) return []

  const aa = (a.r * a.r - b.r * b.r + d * d) / (2 * d)
  const hSq = a.r * a.r - aa * aa
  if (hSq < -tol) return []
  const h = Math.sqrt(Math.max(0, hSq))
  const mx = a.cx + (aa * dx) / d
  const my = a.cy + (aa * dy) / d
  const rx = (-dy * h) / d
  const ry = (dx * h) / d

  const points =
    h <= tol
      ? [{ x: mx, y: my }]
      : [
          { x: mx + rx, y: my + ry },
          { x: mx - rx, y: my - ry }
        ]

  const out: Array<{ x: number; y: number }> = []
  for (const p of points) {
    if (isPointOnCircArc(p.x, p.y, a, tol) && isPointOnCircArc(p.x, p.y, b, tol)) {
      out.push(p)
    }
  }
  return out
}

/**
 * Computes intersection points between two analytic snap primitives.
 *
 * Supports line/arc/circle pairs; ellipse and spline are skipped.
 */
export function intersectPrimitivePair(
  a: AcExOsnapPrimitive,
  b: AcExOsnapPrimitive,
  tol: number
): Array<{ x: number; y: number }> {
  if (a.kind === 'line' && b.kind === 'line') {
    const hit = intersectLineSegments(a, b, tol)
    return hit ? [hit] : []
  }
  if (a.kind === 'line' && (b.kind === 'circle' || b.kind === 'arc')) {
    return intersectLineCircle(a, b, tol)
  }
  if (b.kind === 'line' && (a.kind === 'circle' || a.kind === 'arc')) {
    return intersectLineCircle(b, a, tol)
  }
  if (
    (a.kind === 'circle' || a.kind === 'arc') &&
    (b.kind === 'circle' || b.kind === 'arc')
  ) {
    return intersectCircles(a, b, tol)
  }
  return []
}

/** Whether a primitive can participate in intersection snap. */
export function isIntersectionCapablePrimitive(
  prim: AcExOsnapPrimitive
): boolean {
  return (
    prim.kind === 'line' ||
    prim.kind === 'circle' ||
    prim.kind === 'arc'
  )
}
