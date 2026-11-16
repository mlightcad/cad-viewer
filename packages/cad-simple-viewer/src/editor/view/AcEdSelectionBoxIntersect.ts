import {
  AcDbBlockReference,
  AcDbEntity,
  AcDbHatch,
  AcDbRasterImage,
  AcDbTrace,
  AcGeBox2d,
  AcGeMatrix3d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import {
  acedBlockReferenceInsertionMatrix,
  canonicalGsMark
} from '../input/AcEdOsnapCenterMarks.js'
import type { AcEdSpatialQueryResultItem } from './AcEdSpatialQueryResult.js'

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
 * against the four box edges. Only X/Y are read, so both 2D and 3D points are
 * accepted.
 */
export function acedLineSegmentIntersectsBox2d(
  start: AcGePoint2dLike | AcGePoint3dLike,
  end: AcGePoint2dLike | AcGePoint3dLike,
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
 *
 * @param primitive - Curve primitive in model WCS.
 * @param box - Selection box, in the coordinate system `transform` maps to.
 * @param transform - Optional point mapping applied to the primitive first.
 *   Paper-space viewport selection passes `modelPointToPaper` so a twisted
 *   viewport tests the real rotated geometry instead of its larger AABB.
 */
export function acedPrimitiveIntersectsSelectionBox(
  primitive: { kind: string },
  box: AcGeBox2d,
  transform?: (point: AcGePoint3dLike) => { x: number; y: number }
): boolean {
  if (primitive.kind === 'line') {
    const linePrimitive = primitive as SelectionIntersectLinePrimitive
    const start = transform
      ? transform(linePrimitive.line.startPoint)
      : linePrimitive.line.startPoint
    const end = transform
      ? transform(linePrimitive.line.endPoint)
      : linePrimitive.line.endPoint
    return acedLineSegmentIntersectsBox2d(start, end, box)
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
 *
 * Filled areas (hatch, 2D solid / trace, raster image / wipeout) only expose
 * their boundary edges. When no edge touches the box, the box lies entirely
 * inside or outside the area, so one box corner decides: inside the fill is a
 * hit, like a click on the fill and like AutoCAD.
 *
 * @param entity - Entity whose drawable curves are tested.
 * @param box - Selection box in the coordinate system `transform` produces.
 * @param transform - Optional point mapping applied to each curve point first.
 */
export function acedEntityIntersectsSelectionBox(
  entity: AcDbEntity,
  box: AcGeBox2d,
  transform?: (point: AcGePoint3dLike) => { x: number; y: number }
): boolean {
  const curves = entity.subGetIntersectCurves()
  if (curves.length === 0) {
    return true
  }
  for (const primitive of curves) {
    if (acedPrimitiveIntersectsSelectionBox(primitive, box, transform)) {
      return true
    }
  }
  if (isFilledArea(entity)) {
    // Every primitive is a line here: any other kind already returned true.
    return lineLoopsContainPoint(
      curves as SelectionIntersectLinePrimitive[],
      box.min,
      transform
    )
  }
  return false
}

/**
 * Returns whether a block reference's real geometry intersects the
 * crossing-selection box.
 *
 * AutoCAD selects a block reference in crossing mode only when the box
 * touches the drawn geometry of at least one sub-entity; empty space inside
 * the block extents (e.g. the interior of a drawing frame) does not count.
 * The spatial index only filters sub-entities by their AABB, so a closed
 * border polyline would otherwise make every crossing box inside the frame
 * select the whole INSERT.
 *
 * The block definition is walked once (nested INSERTs included) and every
 * leaf whose id appears among `children` is tested. All `#n` occurrences of
 * an id belong to this INSERT, so testing each of them answers the
 * INSERT-level question without resolving occurrences one child at a time.
 *
 * @param blockRef - Block reference that produced the spatial hit.
 * @param children - Child boxes returned by the hierarchical spatial query
 *   (only those whose AABB overlaps the query box).
 * @param box - Selection box in the coordinate system `outerTransform`
 *   produces (WCS when omitted).
 * @param outerTransform - Optional mapping applied after the sub-entity's
 *   block transform (paper-space viewport selection passes
 *   `modelPointToPaper`).
 */
export function acedBlockReferenceIntersectsSelectionBox(
  blockRef: AcDbBlockReference,
  children: readonly AcEdSpatialQueryResultItem[],
  box: AcGeBox2d,
  outerTransform?: (point: AcGePoint3dLike) => { x: number; y: number }
): boolean {
  const ids = new Set<string>()
  let anonymous = false
  for (const child of children) {
    // Without an outer mapping the child box is already in the selection
    // space, so full containment means a hit without touching geometry.
    if (
      !outerTransform &&
      box.containsBox(
        new AcGeBox2d(
          { x: child.minX, y: child.minY },
          { x: child.maxX, y: child.maxY }
        )
      )
    ) {
      return true
    }
    if (child.id) {
      ids.add(canonicalGsMark(child.id))
    } else {
      anonymous = true
    }
  }
  if (ids.size === 0 && !anonymous) return false

  const unresolved = new Set(ids)
  const hit = blockGeometryIntersectsBox(blockRef, new AcGeMatrix3d(), {
    ids,
    unresolved,
    testAllOverlapping: anonymous,
    box,
    outerTransform,
    activeBlocks: new Set()
  })
  // Named children that are not in the block definition (attributes) keep
  // the AABB result rather than silently dropping a selection the user can
  // see.
  return hit || unresolved.size > 0
}

interface BlockWalkState {
  ids: ReadonlySet<string>
  unresolved: Set<string>
  /**
   * Some child boxes carry no id (the fill band of a wide polyline, hatch
   * fill islands), so they cannot be matched to a block entity. Test every
   * leaf whose extents overlap the box instead, which covers the entity that
   * produced the anonymous box.
   */
  testAllOverlapping: boolean
  box: AcGeBox2d
  outerTransform?: (point: AcGePoint3dLike) => { x: number; y: number }
  activeBlocks: Set<unknown>
}

function blockGeometryIntersectsBox(
  blockRef: AcDbBlockReference,
  parentMat: AcGeMatrix3d,
  state: BlockWalkState
): boolean {
  const record = blockRef.blockTableRecord
  // Guard against self-referencing block definitions in damaged drawings.
  if (!record || state.activeBlocks.has(record)) return false
  state.activeBlocks.add(record)
  try {
    const matrix = new AcGeMatrix3d().multiplyMatrices(
      parentMat,
      acedBlockReferenceInsertionMatrix(blockRef)
    )
    const { outerTransform } = state
    // A fresh point per call: segment tests hold start and end at once.
    const transform = (p: AcGePoint3dLike) => {
      const point = new AcGePoint3d(p).applyMatrix4(matrix)
      return outerTransform ? outerTransform(point) : point
    }
    for (const entity of record.newIterator()) {
      const isBlock = entity instanceof AcDbBlockReference
      const listed = state.ids.has(entity.objectId)
      if (listed) state.unresolved.delete(entity.objectId)
      if (
        (listed ||
          (!isBlock &&
            state.testAllOverlapping &&
            extentsOverlapBox(entity, transform, state.box))) &&
        acedEntityIntersectsSelectionBox(entity, state.box, transform)
      ) {
        return true
      }
      if (isBlock && blockGeometryIntersectsBox(entity, matrix, state)) {
        return true
      }
    }
    return false
  } finally {
    state.activeBlocks.delete(record)
  }
}

/** Mapped XY extents of `entity` overlap `box` (cheap pre-filter). */
function extentsOverlapBox(
  entity: AcDbEntity,
  transform: (point: AcGePoint3dLike) => { x: number; y: number },
  box: AcGeBox2d
): boolean {
  const extents = entity.geometricExtents
  if (extents.isEmpty()) return false
  const { min, max } = extents
  const mapped = new AcGeBox2d()
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      mapped.expandByPoint(transform({ x, y, z: min.z }))
    }
  }
  return mapped.intersectsBox(box)
}

/**
 * Whether a hierarchical spatial hit is a plain root hit (no `children`
 * array) that should run precise curve-vs-box testing in crossing mode.
 *
 * Block references carry child boxes and are refined per sub-entity with
 * {@link acedBlockReferenceIntersectsSelectionBox} instead.
 */
export function acedNeedsCrossingGeometryRefine(item: {
  children?: unknown
}): boolean {
  return item.children === undefined
}

function isFilledArea(entity: AcDbEntity): boolean {
  // AcDbSolid extends AcDbTrace; AcDbWipeout extends AcDbRasterImage.
  return (
    entity instanceof AcDbHatch ||
    entity instanceof AcDbTrace ||
    entity instanceof AcDbRasterImage
  )
}

/**
 * Even-odd point-in-area test over closed line loops, so hatch islands
 * toggle the fill the same way the renderer does.
 */
function lineLoopsContainPoint(
  lines: readonly SelectionIntersectLinePrimitive[],
  point: AcGePoint2dLike,
  transform?: (point: AcGePoint3dLike) => { x: number; y: number }
): boolean {
  let inside = false
  for (const { line } of lines) {
    const a = transform ? transform(line.startPoint) : line.startPoint
    const b = transform ? transform(line.endPoint) : line.endPoint
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
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
