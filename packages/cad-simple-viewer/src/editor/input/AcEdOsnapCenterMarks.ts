import {
  AcDb2dPolyline,
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbObjectId,
  AcDbOsnapMode,
  AcDbPolyline,
  AcGeCircArc2d,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

/** Geometric center acquired by hovering circular geometry. */
export interface AcEdOsnapCenterMark {
  x: number
  y: number
  z: number
  /** Supporting-curve radius used to keep the mark while moving toward the center. */
  keepRadius: number
}

const BULGE_EPS = 1e-10

function hypot2(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const dx = x1 - x0
  const dy = y1 - y0
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-18) return hypot2(px, py, x0, y0)
  let t = ((px - x0) * dx + (py - y0) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return hypot2(px, py, x0 + t * dx, y0 + t * dy)
}

function tryBulgeArc(
  start: AcGePoint2dLike,
  end: AcGePoint2dLike,
  bulge: number
): AcGeCircArc2d | undefined {
  if (!(Math.abs(bulge) > BULGE_EPS)) return undefined
  try {
    const arc = new AcGeCircArc2d(start, end, bulge)
    if (!(arc.radius > 0) || !Number.isFinite(arc.radius)) return undefined
    return arc
  } catch {
    return undefined
  }
}

function markFromPoint(
  point: AcGePoint3dLike,
  keepRadius: number
): AcEdOsnapCenterMark | undefined {
  if (!(keepRadius > 0) || !Number.isFinite(keepRadius)) return undefined
  return {
    x: point.x,
    y: point.y,
    z: point.z ?? 0,
    keepRadius
  }
}

function polylineVertices(entity: AcDbPolyline | AcDb2dPolyline): Array<{
  x: number
  y: number
  bulge: number
}> {
  if (entity instanceof AcDb2dPolyline) {
    const count = entity.numberOfVertices
    return Array.from({ length: count }, (_, i) => {
      const p = entity.getPointAt(i)
      return { x: p.x, y: p.y, bulge: entity.getBulgeAt(i) }
    })
  }

  const runtimeVertices = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices
  if (runtimeVertices && runtimeVertices.length > 0) {
    return runtimeVertices.map(vertex => ({
      x: vertex.x,
      y: vertex.y,
      bulge: vertex.bulge ?? 0
    }))
  }

  const count = entity.numberOfVertices
  return Array.from({ length: count }, (_, i) => {
    const p = entity.getPoint2dAt(i)
    return { x: p.x, y: p.y, bulge: 0 }
  })
}

function collectPolylineArcCenter(
  entity: AcDbPolyline | AcDb2dPolyline,
  pickPoint: AcGePoint3dLike
): AcEdOsnapCenterMark | undefined {
  const vertices = polylineVertices(entity)
  if (vertices.length < 2) return undefined

  const segmentCount = entity.closed ? vertices.length : vertices.length - 1
  let bestDist = Number.POSITIVE_INFINITY
  let bestArc: AcGeCircArc2d | undefined

  for (let i = 0; i < segmentCount; i++) {
    const start = vertices[i]!
    const end = vertices[(i + 1) % vertices.length]!
    const arc = tryBulgeArc(start, end, start.bulge)
    const dist = arc
      ? hypot2(
          pickPoint.x,
          pickPoint.y,
          arc.nearestPoint(pickPoint).x,
          arc.nearestPoint(pickPoint).y
        )
      : distToSegment(pickPoint.x, pickPoint.y, start.x, start.y, end.x, end.y)
    if (dist < bestDist) {
      bestDist = dist
      bestArc = arc
    }
  }

  if (!bestArc) return undefined
  return markFromPoint(
    { x: bestArc.center.x, y: bestArc.center.y, z: entity.elevation },
    bestArc.radius
  )
}

function collectFromOsnapCenter(
  entity: AcDbEntity,
  pickPoint: AcGePoint3dLike,
  gsMark?: AcDbObjectId
): AcEdOsnapCenterMark[] {
  const points: AcGePoint3dLike[] = []
  entity.subGetOsnapPoints(
    AcDbOsnapMode.Center,
    pickPoint,
    pickPoint,
    points,
    gsMark
  )
  const marks: AcEdOsnapCenterMark[] = []
  for (const point of points) {
    const keepRadius = hypot2(pickPoint.x, pickPoint.y, point.x, point.y)
    const mark = markFromPoint(point, keepRadius)
    if (mark) marks.push(mark)
  }
  return marks
}

/**
 * Collects AutoCAD-style center ticks for circular geometry under the cursor.
 *
 * Circle, arc, ellipse, and the closest bulge segment of a polyline each
 * contribute one center. Other entities fall back to `subGetOsnapPoints(Center)`
 * so block references still acquire nested circle/arc/ellipse centers.
 */
export function collectCenterMarksFromEntity(
  entity: AcDbEntity,
  pickPoint: AcGePoint3dLike,
  gsMark?: AcDbObjectId
): AcEdOsnapCenterMark[] {
  if (entity instanceof AcDbCircle) {
    const mark = markFromPoint(entity.center, entity.radius)
    return mark ? [mark] : []
  }
  if (entity instanceof AcDbArc) {
    const mark = markFromPoint(entity.center, entity.radius)
    return mark ? [mark] : []
  }
  if (entity instanceof AcDbEllipse) {
    const mark = markFromPoint(entity.center, entity.majorAxisRadius)
    return mark ? [mark] : []
  }
  if (entity instanceof AcDbPolyline || entity instanceof AcDb2dPolyline) {
    const mark = collectPolylineArcCenter(entity, pickPoint)
    return mark ? [mark] : []
  }
  return collectFromOsnapCenter(entity, pickPoint, gsMark)
}

/**
 * Keeps acquired centers while the cursor is still inside the supporting
 * curve, so the plus mark remains after leaving the circumference.
 */
export function retainAcquiredCenterMarks(
  marks: readonly AcEdOsnapCenterMark[],
  cursor: AcGePoint2dLike,
  aperture: number
): AcEdOsnapCenterMark[] {
  const pad = Math.max(0, aperture)
  return marks.filter(mark => {
    const dist = hypot2(cursor.x, cursor.y, mark.x, mark.y)
    return dist <= mark.keepRadius + pad
  })
}

export function centerMarksCoincide(
  mark: AcGePoint2dLike,
  snap: AcGePoint2dLike,
  tol = 1e-8
) {
  return hypot2(mark.x, mark.y, snap.x, snap.y) <= tol
}
