import {
  AcDbArc, AcDbCircle, AcDbEllipse, AcDbEntity, AcDbLine,
  AcDbPolyline, AcDbSpline, AcGePoint2d, AcGePoint3d,
  AcGePoint3dLike, AcGeVector3d,
} from '@mlightcad/data-model'
import ClipperShape from '@doodle3d/clipper-js'

const CLIPPER_SCALE = 1e6

export function offsetLine(line: AcDbLine, distance: number, side: 1 | -1): AcDbLine {
  const s = line.startPoint
  const e = line.endPoint
  const len = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2)
  if (len === 0) return new AcDbLine(s, e)
  const dir = new AcGeVector3d(e.x - s.x, e.y - s.y, 0).normalize()
  const perp = new AcGeVector3d(-dir.y, dir.x, 0)
  const d = distance * side
  return new AcDbLine(
    new AcGePoint3d(s.x + perp.x * d, s.y + perp.y * d, s.z),
    new AcGePoint3d(e.x + perp.x * d, e.y + perp.y * d, e.z),
  )
}

export function offsetArc(arc: AcDbArc, distance: number, side: 1 | -1): AcDbArc | null {
  const r = arc.radius + distance * side
  if (r <= 0) return null
  return new AcDbArc(arc.center, r, arc.startAngle, arc.endAngle)
}

export function offsetCircle(circle: AcDbCircle, distance: number, side: 1 | -1): AcDbCircle | null {
  const r = circle.radius + distance * side
  if (r <= 0) return null
  return new AcDbCircle(circle.center, r)
}

export function offsetEllipse(ellipse: AcDbEllipse, distance: number, side: 1 | -1): AcDbEllipse | null {
  const major = ellipse.majorAxisRadius + distance * side
  const minor = ellipse.minorAxisRadius + distance * side
  if (major <= 0 || minor <= 0) return null
  // AcDbEllipse has no majorAxis getter, so we cannot recover the original axis direction.
  // We pass X_AXIS as a unit direction; the constructor uses it only for orientation and
  // the actual radii are supplied separately. For axis-aligned ellipses this is correct.
  // Rotated ellipses will lose their rotation — a limitation of the current API.
  return new AcDbEllipse(
    ellipse.center, ellipse.normal,
    new AcGeVector3d(1, 0, 0),
    major, minor, ellipse.startAngle, ellipse.endAngle,
  )
}

export function offsetPolyline(poly: AcDbPolyline, distance: number, side: 1 | -1): AcDbPolyline | null {
  const n = poly.numberOfVertices
  if (n < 2) return null
  const path = []
  for (let i = 0; i < n; i++) {
    const pt = poly.getPoint2dAt(i)
    path.push({ X: Math.round(pt.x * CLIPPER_SCALE), Y: Math.round(pt.y * CLIPPER_SCALE) })
  }
  const shape = new ClipperShape([path], poly.closed, true, false)
  const offsetShape = shape.offset(distance * side * CLIPPER_SCALE, {
    jointType: 'jtMiter',
    endType: poly.closed ? 'etClosedPolygon' : 'etOpenButt',
  })
  const paths = offsetShape.paths
  if (!paths || paths.length === 0) return null
  const result = new AcDbPolyline()
  paths[0].forEach((pt: { X: number; Y: number }, i: number) => {
    result.addVertexAt(i, new AcGePoint2d(pt.X / CLIPPER_SCALE, pt.Y / CLIPPER_SCALE))
  })
  result.closed = poly.closed
  return result
}

// Spline offset: control points not accessible via public API; returns null gracefully.
export function offsetSpline(_spline: AcDbSpline, _distance: number, _side: 1 | -1): AcDbPolyline | null {
  return null
}

export function pickSide(entity: AcDbEntity, p: AcGePoint3dLike): 1 | -1 {
  if (entity instanceof AcDbLine) {
    const s = entity.startPoint
    const e = entity.endPoint
    return ((e.x - s.x) * (p.y - s.y) - (e.y - s.y) * (p.x - s.x)) >= 0 ? 1 : -1
  }
  if (entity instanceof AcDbArc || entity instanceof AcDbCircle) {
    const c = (entity as AcDbCircle).center
    const r = (entity as AcDbCircle).radius
    return Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2) >= r ? 1 : -1
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    const a = entity.majorAxisRadius
    const b = entity.minorAxisRadius
    // AcDbEllipse has no majorAxis getter, so we cannot transform into the ellipse's
    // local frame for rotated ellipses. This test is only correct for axis-aligned ellipses.
    return ((p.x - c.x) / a) ** 2 + ((p.y - c.y) / b) ** 2 >= 1 ? 1 : -1
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let bestDist = Infinity
    let bestSide: 1 | -1 = 1
    const segCount = entity.closed ? n : n - 1
    for (let i = 0; i < segCount; i++) {
      const a = entity.getPoint2dAt(i)
      const b = entity.getPoint2dAt((i + 1) % n)
      const dx = b.x - a.x; const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
      const d = (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2
      if (d < bestDist) {
        bestDist = d
        bestSide = (dx * (p.y - a.y) - dy * (p.x - a.x)) >= 0 ? 1 : -1
      }
    }
    return bestSide
  }
  return 1
}
