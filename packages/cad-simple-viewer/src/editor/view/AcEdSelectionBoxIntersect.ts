import { AcDbEntity, AcGeBox2d, AcGePoint3dLike } from '@mlightcad/data-model'

/**
 * Minimal line primitive shape used for crossing-selection refinement.
 *
 * Matches {@code AcGeIntersectPrimitive} line entries without importing the
 * geometry-engine type (not re-exported from `@mlightcad/data-model`).
 */
type SelectionIntersectLinePrimitive = {
  kind: 'line'
  line: {
    startPoint: AcGePoint3dLike
    endPoint: AcGePoint3dLike
  }
}

/**
 * Returns whether a line segment intersects or touches an axis-aligned box in XY.
 *
 * Endpoints inside the box count as a hit. Otherwise the segment is tested
 * against the four box edges.
 */
export function acedLineSegmentIntersectsBox2d(
  start: AcGePoint3dLike,
  end: AcGePoint3dLike,
  box: AcGeBox2d
): boolean {
  if (box.containsPoint(start) || box.containsPoint(end)) {
    return true
  }

  const x1 = start.x
  const y1 = start.y
  const x2 = end.x
  const y2 = end.y
  const minX = box.min.x
  const minY = box.min.y
  const maxX = box.max.x
  const maxY = box.max.y

  if (
    Math.max(x1, x2) < minX ||
    Math.min(x1, x2) > maxX ||
    Math.max(y1, y2) < minY ||
    Math.min(y1, y2) > maxY
  ) {
    return false
  }

  return (
    segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) ||
    segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
    segmentsIntersect(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
    segmentsIntersect(x1, y1, x2, y2, minX, maxY, minX, minY)
  )
}

/**
 * Returns whether a curve primitive intersects the selection box in plan view.
 *
 * Line segments are tested precisely. Other primitive kinds fall back to
 * `true` so arc/spline AABB hits stay selectable until dedicated tests exist.
 */
export function acedPrimitiveIntersectsSelectionBox(
  primitive: { kind: string },
  box: AcGeBox2d
): boolean {
  if (primitive.kind === 'line') {
    const linePrimitive = primitive as SelectionIntersectLinePrimitive
    return acedLineSegmentIntersectsBox2d(
      linePrimitive.line.startPoint,
      linePrimitive.line.endPoint,
      box
    )
  }
  return true
}

/**
 * Returns whether entity drawable curves intersect the crossing-selection box.
 *
 * Entities without curve primitives (text, points, …) return `true` so the
 * spatial-index AABB hit is preserved. Polyline / line entities are tested
 * against the box so long thin AABBs do not false-positive when the pick
 * rectangle sits in empty space inside a large closed boundary.
 */
export function acedEntityIntersectsSelectionBox(
  entity: AcDbEntity,
  box: AcGeBox2d
): boolean {
  const curves = entity.subGetIntersectCurves()
  if (curves.length === 0) {
    return true
  }
  for (const primitive of curves) {
    if (acedPrimitiveIntersectsSelectionBox(primitive, box)) {
      return true
    }
  }
  return false
}

/**
 * Whether a hierarchical spatial hit should run precise curve-vs-box testing.
 *
 * Inserts with child boxes are already refined by the child index. Only plain
 * root hits (no `children` array) need geometry refinement for crossing mode.
 */
export function acedNeedsCrossingGeometryRefine(item: {
  children?: unknown
}): boolean {
  return item.children === undefined
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const abx = bx - ax
  const aby = by - ay
  const acx = cx - ax
  const acy = cy - ay
  const adx = dx - ax
  const ady = dy - ay
  const cdx = dx - cx
  const cdy = dy - cy
  const cax = ax - cx
  const cay = ay - cy
  const cbx = bx - cx
  const cby = by - cy

  const cross1 = abx * acy - aby * acx
  const cross2 = abx * ady - aby * adx
  const cross3 = cdx * cay - cdy * cax
  const cross4 = cdx * cby - cdy * cbx

  return cross1 * cross2 <= 0 && cross3 * cross4 <= 0
}
