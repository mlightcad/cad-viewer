import {
  AcDbArc,
  AcDbCircle,
  AcDbPolyline,
  AcGeCircArc2d,
  AcGePoint3dLike,
  TAU
} from '@mlightcad/data-model'

import type { AcApMeasureCircleGeom } from './entity/AcApMeasureDrawUtil'

/** Ignore polyline bulge values that are effectively a straight chord. */
const BULGE_EPS = 1e-12

type Point2 = { x: number; y: number }

function geomFromCurve(curve: AcGeCircArc2d): AcApMeasureCircleGeom {
  return { cx: curve.center.x, cy: curve.center.y, r: curve.radius }
}

/**
 * WCS point on a circular arc from OCS start/end angles.
 *
 * AutoCAD stores those angles in OCS; a `-Z` extrusion mirrors X
 * (`OCS X = -WCS X`, `OCS Y = WCS Y`). Passing the angles straight into
 * {@link AcGeCircArc2d} with only `clockwise` does not apply that mirror.
 */
function ocsAngleToWcsPoint(
  cx: number,
  cy: number,
  r: number,
  angle: number,
  normalSign: 1 | -1
) {
  const sx = normalSign === -1 ? -1 : 1
  return {
    x: cx + sx * r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  }
}

function ccwDelta(startAngle: number, endAngle: number): number {
  let delta = endAngle - startAngle
  while (delta <= 0) delta += TAU
  while (delta > TAU) delta -= TAU
  return delta
}

function lockCurveFromDbArc(entity: AcDbArc): AcGeCircArc2d | undefined {
  if (!(entity.radius > 0)) return undefined
  const normalSign: 1 | -1 = entity.normal.z >= 0 ? 1 : -1
  const cx = entity.center.x
  const cy = entity.center.y
  const r = entity.radius
  const start = ocsAngleToWcsPoint(cx, cy, r, entity.startAngle, normalSign)
  const end = ocsAngleToWcsPoint(cx, cy, r, entity.endAngle, normalSign)
  const delta = ccwDelta(entity.startAngle, entity.endAngle)
  if (!(delta > 1e-12) || delta >= TAU - 1e-12) return undefined
  const curve = new AcGeCircArc2d(
    start,
    end,
    normalSign * Math.tan(delta / 4)
  )
  return curve.radius > 0 ? curve : undefined
}

function polylineVertices(entity: AcDbPolyline): Array<{
  x: number
  y: number
  bulge: number
}> {
  const runtimeVertices = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices

  if (runtimeVertices && runtimeVertices.length > 1) {
    return runtimeVertices.map(v => ({
      x: v.x,
      y: v.y,
      bulge: v.bulge ?? 0
    }))
  }

  const count = entity.numberOfVertices
  const getBulgeAt = (
    entity as unknown as { getBulgeAt?: (index: number) => number }
  ).getBulgeAt
  return Array.from({ length: count }, (_, i) => {
    const p = entity.getPoint2dAt(i)
    return {
      x: p.x,
      y: p.y,
      bulge: getBulgeAt?.(i) ?? 0
    }
  })
}

/**
 * Circular curves on `entity` that arc-length measure can lock onto:
 * CIRCLE, ARC, and polyline bulge segments (not straight chords).
 */
export function lockCurvesFromEntity(entity: unknown): AcGeCircArc2d[] {
  if (entity instanceof AcDbCircle) {
    if (!(entity.radius > 0)) return []
    return [
      new AcGeCircArc2d(
        { x: entity.center.x, y: entity.center.y },
        entity.radius,
        0,
        Math.PI * 2,
        false
      )
    ]
  }

  if (entity instanceof AcDbArc) {
    const curve = lockCurveFromDbArc(entity)
    return curve ? [curve] : []
  }

  if (!(entity instanceof AcDbPolyline)) return []
  const vertices = polylineVertices(entity)
  if (vertices.length < 2) return []

  const last = entity.closed ? vertices.length : vertices.length - 1
  const curves: AcGeCircArc2d[] = []
  for (let i = 0; i < last; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    if (!(Math.abs(start.bulge) > BULGE_EPS)) continue
    const curve = new AcGeCircArc2d(start, end, start.bulge)
    if (curve.radius > 0) curves.push(curve)
  }
  return curves
}

/**
 * Closest CIRCLE / ARC / polyline-bulge curve to `p` among `entities`,
 * measured to the actual stroke (not the complementary full circle).
 *
 * @param entities - Candidate CAD entities.
 * @param p - Pick point in world XY.
 * @param worldThreshold - Maximum distance in drawing units.
 * @returns Circle geometry of the winning curve, or `undefined`.
 */
export function pickLockOnEntities(
  entities: unknown[],
  p: AcGePoint3dLike,
  worldThreshold: number
): { geom: AcApMeasureCircleGeom; nearest: Point2 } | undefined {
  if (!(worldThreshold > 0) || entities.length === 0) return undefined
  const threshSq = worldThreshold * worldThreshold
  let bestDistSq = threshSq
  let best: { geom: AcApMeasureCircleGeom; nearest: Point2 } | undefined
  const pick = { x: p.x, y: p.y, z: 0 }

  for (const entity of entities) {
    for (const curve of lockCurvesFromEntity(entity)) {
      const nearest = curve.nearestPoint(pick)
      const d2 = (nearest.x - p.x) ** 2 + (nearest.y - p.y) ** 2
      if (d2 <= bestDistSq) {
        bestDistSq = d2
        best = {
          geom: geomFromCurve(curve),
          nearest: { x: nearest.x, y: nearest.y }
        }
      }
    }
  }
  return best
}
