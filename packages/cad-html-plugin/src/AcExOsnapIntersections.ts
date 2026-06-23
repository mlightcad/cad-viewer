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

/**
 * Geometric tolerance for T-junction and near-miss intersection snap.
 *
 * Parametric segment intersection uses {@link intersectionToleranceForExtent};
 * endpoint-on-segment checks also scale with the osnap aperture so stem endpoints
 * that sit slightly off a crossbar still snap like AutoCAD.
 */
export function intersectionGeomToleranceForSnap(
  extent: number,
  threshold: number
): number {
  return (
    Math.max(intersectionToleranceForExtent(extent), threshold * 1e-3) +
    FLOAT_TOL
  )
}

function withinGeomTolerance(distance: number, geomTol: number): boolean {
  return distance <= geomTol
}

function closestPointOnSegmentLike(
  px: number,
  py: number,
  seg: AcExOsnapSegmentLike
): { x: number; y: number; t: number; dist: number } {
  const dx = seg.x1 - seg.x0
  const dy = seg.y1 - seg.y0
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-18) {
    const dist = Math.hypot(px - seg.x0, py - seg.y0)
    return { x: seg.x0, y: seg.y0, t: 0, dist }
  }
  let t = ((px - seg.x0) * dx + (py - seg.y0) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const x = seg.x0 + t * dx
  const y = seg.y0 + t * dy
  return { x, y, t, dist: Math.hypot(px - x, py - y) }
}

function appendUniqueIntersectionPoint(
  out: Array<{ x: number; y: number }>,
  point: { x: number; y: number },
  tol: number
): void {
  for (const existing of out) {
    if (Math.hypot(existing.x - point.x, existing.y - point.y) <= tol) {
      return
    }
  }
  out.push(point)
}

function intersectLineSegmentsParametric(
  a: AcExOsnapSegmentLike,
  b: AcExOsnapSegmentLike,
  paramTol: number,
  geomTol = paramTol
): { x: number; y: number } | undefined {
  const d1x = a.x1 - a.x0
  const d1y = a.y1 - a.y0
  const d2x = b.x1 - b.x0
  const d2y = b.y1 - b.y0
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < paramTol) return undefined

  const dx = b.x0 - a.x0
  const dy = b.y0 - a.y0
  const t = (dx * d2y - dy * d2x) / denom
  const u = (dx * d1y - dy * d1x) / denom
  if (t < -geomTol || t > 1 + geomTol || u < -geomTol || u > 1 + geomTol) {
    return undefined
  }

  return { x: a.x0 + t * d1x, y: a.y0 + t * d1y }
}

/**
 * T-junction snap: one segment endpoint lies on the interior (or boundary) of
 * the other segment within `geomTol`, but parametric intersection can miss when
 * the endpoint is only slightly off the host line.
 */
function intersectLineSegmentsEndpointJoin(
  a: AcExOsnapSegmentLike,
  b: AcExOsnapSegmentLike,
  geomTol: number
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  const endpointsA = [
    { x: a.x0, y: a.y0 },
    { x: a.x1, y: a.y1 }
  ]
  const endpointsB = [
    { x: b.x0, y: b.y0 },
    { x: b.x1, y: b.y1 }
  ]

  for (const ep of endpointsA) {
    const onB = closestPointOnSegmentLike(ep.x, ep.y, b)
    if (withinGeomTolerance(onB.dist, geomTol)) {
      appendUniqueIntersectionPoint(out, { x: onB.x, y: onB.y }, geomTol)
    }
  }
  for (const ep of endpointsB) {
    const onA = closestPointOnSegmentLike(ep.x, ep.y, a)
    if (withinGeomTolerance(onA.dist, geomTol)) {
      appendUniqueIntersectionPoint(out, { x: onA.x, y: onA.y }, geomTol)
    }
  }

  return out
}

export function intersectLineSegments(
  a: AcExOsnapSegmentLike,
  b: AcExOsnapSegmentLike,
  paramTol: number,
  geomTol = paramTol
): { x: number; y: number } | undefined {
  const parametric = intersectLineSegmentsParametric(a, b, paramTol, geomTol)
  if (parametric) return parametric

  const endpointJoin = intersectLineSegmentsEndpointJoin(a, b, geomTol)
  return endpointJoin[0]
}

/** All intersection points between two line segments (crossing and T-junction). */
export function intersectLineSegmentPoints(
  a: AcExOsnapSegmentLike,
  b: AcExOsnapSegmentLike,
  paramTol: number,
  geomTol = paramTol
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  const parametric = intersectLineSegmentsParametric(a, b, paramTol, geomTol)
  if (parametric) {
    out.push(parametric)
  }
  for (const point of intersectLineSegmentsEndpointJoin(a, b, geomTol)) {
    appendUniqueIntersectionPoint(out, point, geomTol)
  }
  return out
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

function lineEndpointsOnCircArc(
  line: AcExOsnapLinePrimitive,
  circ: AcExCircArcLike,
  geomTol: number
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  for (const ep of [
    { x: line.x0, y: line.y0 },
    { x: line.x1, y: line.y1 }
  ]) {
    if (isPointOnCircArc(ep.x, ep.y, circ, geomTol)) {
      appendUniqueIntersectionPoint(out, ep, geomTol)
      continue
    }
    const dx = ep.x - circ.cx
    const dy = ep.y - circ.cy
    const dist = Math.hypot(dx, dy)
    if (dist < geomTol) continue
    const px = circ.cx + (dx / dist) * circ.r
    const py = circ.cy + (dy / dist) * circ.r
    if (
      isPointOnCircArc(px, py, circ, geomTol) &&
      withinGeomTolerance(Math.hypot(ep.x - px, ep.y - py), geomTol)
    ) {
      appendUniqueIntersectionPoint(out, { x: px, y: py }, geomTol)
    }
  }
  return out
}

function intersectLineCircle(
  line: AcExOsnapLinePrimitive,
  circ: AcExCircArcLike,
  paramTol: number,
  geomTol = paramTol
): Array<{ x: number; y: number }> {
  const dx = line.x1 - line.x0
  const dy = line.y1 - line.y0
  const fx = line.x0 - circ.cx
  const fy = line.y0 - circ.cy
  const a = dx * dx + dy * dy
  if (a < paramTol * paramTol) {
    return lineEndpointsOnCircArc(line, circ, geomTol)
  }

  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - circ.r * circ.r
  const disc = b * b - 4 * a * c
  if (disc < -paramTol) {
    return lineEndpointsOnCircArc(line, circ, geomTol)
  }

  const out: Array<{ x: number; y: number }> = []
  const sqrtDisc = Math.sqrt(Math.max(0, disc))
  for (const sign of [-1, 1] as const) {
    const t = (-b + sign * sqrtDisc) / (2 * a)
    if (t < -paramTol || t > 1 + paramTol) continue
    const x = line.x0 + t * dx
    const y = line.y0 + t * dy
    if (isPointOnCircArc(x, y, circ, geomTol)) {
      appendUniqueIntersectionPoint(out, { x, y }, geomTol)
    }
  }
  for (const point of lineEndpointsOnCircArc(line, circ, geomTol)) {
    appendUniqueIntersectionPoint(out, point, geomTol)
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
    if (
      isPointOnCircArc(p.x, p.y, a, tol) &&
      isPointOnCircArc(p.x, p.y, b, tol)
    ) {
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
  paramTol: number,
  geomTol = paramTol
): Array<{ x: number; y: number }> {
  if (a.kind === 'line' && b.kind === 'line') {
    return intersectLineSegmentPoints(a, b, paramTol, geomTol)
  }
  if (a.kind === 'line' && (b.kind === 'circle' || b.kind === 'arc')) {
    return intersectLineCircle(a, b, paramTol, geomTol)
  }
  if (b.kind === 'line' && (a.kind === 'circle' || a.kind === 'arc')) {
    return intersectLineCircle(b, a, paramTol, geomTol)
  }
  if (
    (a.kind === 'circle' || a.kind === 'arc') &&
    (b.kind === 'circle' || b.kind === 'arc')
  ) {
    return intersectCircles(a, b, paramTol)
  }
  return []
}

/** Whether a primitive can participate in intersection snap. */
export function isIntersectionCapablePrimitive(
  prim: AcExOsnapPrimitive
): boolean {
  return prim.kind === 'line' || prim.kind === 'circle' || prim.kind === 'arc'
}
