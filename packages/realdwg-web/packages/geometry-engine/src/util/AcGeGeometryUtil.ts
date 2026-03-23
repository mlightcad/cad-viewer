import { AcGeBox2d, AcGePoint2dLike } from '../math'
import { DEFAULT_TOL } from './AcGeTol'

/**
 * Determine if the 2d point is inside the polygon
 * @param point 2d point to check whether it is in the specified polygon
 * @param polygon an polygon consisted by 2d point array
 * @param includeOnSide if ture, return true if the specified point is inside the polygon or the polygon border.
 * @returns Return true if the 2d point is inside the polygon
 */
function isPointInPolygon(
  point: AcGePoint2dLike,
  polygon: AcGePoint2dLike[],
  includeOnSide = false
) {
  const x = point.x,
    y = point.y
  let inside = false
  const len = polygon.length
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y
    const xj = polygon[j].x,
      yj = polygon[j].y
    let isInSide = yi > y !== yj > y
    if (includeOnSide) {
      isInSide = yi >= y !== yj >= y
    }
    const intersect = isInSide && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

function isPolygonIntersect(
  polygon1: AcGePoint2dLike[],
  polygon2: AcGePoint2dLike[]
) {
  if (polygon1.length === 0 || polygon2.length === 0) {
    return false
  }

  // fast exclude
  const tempBox1 = new AcGeBox2d().setFromPoints(polygon1)
  const tempBox2 = new AcGeBox2d().setFromPoints(polygon2)
  if (!tempBox1.intersectsBox(tempBox2)) {
    return false
  }

  for (let i = 0; i < polygon1.length; ) {
    if (isPointInPolygon(polygon1[i], polygon2, true)) {
      return true
    }

    if (
      i < polygon1.length - 1 &&
      DEFAULT_TOL.equalPoint2d(polygon1[i + 1], polygon1[i])
    ) {
      ++i
    }
    ++i
  }

  return false
}

const AcGeGeometryUtil = {
  isPointInPolygon: isPointInPolygon,
  isPolygonIntersect: isPolygonIntersect
}

export { isPointInPolygon, isPolygonIntersect, AcGeGeometryUtil }
