import {
  AcDb2dPolyline,
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbObjectId,
  AcDbOsnapMode,
  AcDbPolyline,
  AcGeCircArc2d,
  AcGeMatrix3d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

/** Geometric center acquired by hovering circular geometry. */
export interface AcEdOsnapCenterMark {
  x: number
  y: number
  z: number
}

const BULGE_EPS = 1e-10

/**
 * Max AutoCAD-style acquired center ticks kept during one point prompt.
 *
 * Hovering many circles/arcs appends a tick per unique center. Without a
 * cap, a fast sweep recreates hundreds of DOM markers on every pointer
 * move and the canvas appears frozen.
 */
export const ACED_MAX_ACQUIRED_CENTER_MARKS = 32

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

function markFromPoint(point: AcGePoint3dLike): AcEdOsnapCenterMark {
  return {
    x: point.x,
    y: point.y,
    z: point.z ?? 0
  }
}

function transformMark(
  mark: AcEdOsnapCenterMark,
  matrix: AcGeMatrix3d
): AcEdOsnapCenterMark {
  const point = new AcGePoint3d(mark.x, mark.y, mark.z).applyMatrix4(matrix)
  return markFromPoint(point)
}

/**
 * Child spatial-index ids may get a `#n` suffix when the same object appears
 * more than once in a block. Strip that before matching database object ids.
 */
export function canonicalGsMark(id: AcDbObjectId): AcDbObjectId {
  if (typeof id !== 'string') return id
  return id.replace(/#\d+$/, '')
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
    let dist: number
    if (arc) {
      const nearest = arc.nearestPoint(pickPoint)
      dist = hypot2(pickPoint.x, pickPoint.y, nearest.x, nearest.y)
    } else {
      dist = distToSegment(
        pickPoint.x,
        pickPoint.y,
        start.x,
        start.y,
        end.x,
        end.y
      )
    }
    if (dist < bestDist) {
      bestDist = dist
      bestArc = arc
    }
  }

  if (!bestArc) return undefined
  return markFromPoint({
    x: bestArc.center.x,
    y: bestArc.center.y,
    z: entity.elevation
  })
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
  return points.map(point => markFromPoint(point))
}

function findBlockSubEntity(
  blockRef: AcDbBlockReference,
  gsMark: AcDbObjectId,
  parentMat: AcGeMatrix3d
): { entity: AcDbEntity; transform: AcGeMatrix3d } | undefined {
  const blockTableRecord = blockRef.blockTableRecord
  if (!blockTableRecord) return undefined

  const thisMat = new AcGeMatrix3d().multiplyMatrices(
    parentMat,
    blockRef.blockTransform
  )
  const targetId = canonicalGsMark(gsMark)

  for (const entity of blockTableRecord.newIterator()) {
    if (entity.objectId === gsMark || entity.objectId === targetId) {
      return { entity, transform: thisMat }
    }
    if (entity instanceof AcDbBlockReference) {
      const nested = findBlockSubEntity(entity, gsMark, thisMat)
      if (nested) return nested
    }
  }
  return undefined
}

function collectBlockCenterMarks(
  blockRef: AcDbBlockReference,
  pickPoint: AcGePoint3dLike,
  gsMark?: AcDbObjectId
): AcEdOsnapCenterMark[] {
  if (!gsMark) {
    return collectFromOsnapCenter(blockRef, pickPoint)
  }

  const found = findBlockSubEntity(blockRef, gsMark, new AcGeMatrix3d())
  if (!found) {
    return collectFromOsnapCenter(blockRef, pickPoint, canonicalGsMark(gsMark))
  }

  const inverse = found.transform.clone().invert()
  const localPick = new AcGePoint3d(pickPoint).applyMatrix4(inverse)
  return collectCenterMarksFromEntity(found.entity, localPick).map(mark =>
    transformMark(mark, found.transform)
  )
}

/**
 * Collects AutoCAD-style center ticks for circular geometry under the cursor.
 *
 * Circle, arc, ellipse, polyline bulge segments, and the same geometry nested
 * in block references each contribute a center.
 */
export function collectCenterMarksFromEntity(
  entity: AcDbEntity,
  pickPoint: AcGePoint3dLike,
  gsMark?: AcDbObjectId
): AcEdOsnapCenterMark[] {
  if (entity instanceof AcDbBlockReference) {
    return collectBlockCenterMarks(entity, pickPoint, gsMark)
  }
  if (entity instanceof AcDbCircle) {
    return [markFromPoint(entity.center)]
  }
  if (entity instanceof AcDbArc) {
    return [markFromPoint(entity.center)]
  }
  if (entity instanceof AcDbEllipse) {
    return [markFromPoint(entity.center)]
  }
  if (entity instanceof AcDbPolyline || entity instanceof AcDb2dPolyline) {
    const mark = collectPolylineArcCenter(entity, pickPoint)
    return mark ? [mark] : []
  }
  return collectFromOsnapCenter(entity, pickPoint, gsMark)
}

/** Appends newly hovered centers without dropping marks acquired earlier. */
export function mergeAcquiredCenterMarks(
  existing: readonly AcEdOsnapCenterMark[],
  incoming: readonly AcEdOsnapCenterMark[]
): AcEdOsnapCenterMark[] {
  if (incoming.length === 0) {
    return existing.length <= ACED_MAX_ACQUIRED_CENTER_MARKS
      ? (existing as AcEdOsnapCenterMark[])
      : existing.slice(-ACED_MAX_ACQUIRED_CENTER_MARKS)
  }

  const merged = [...existing]
  let changed = existing.length > ACED_MAX_ACQUIRED_CENTER_MARKS
  for (const mark of incoming) {
    const idx = merged.findIndex(item => centerMarksCoincide(item, mark))
    if (idx >= 0) {
      if (idx !== merged.length - 1) {
        const [kept] = merged.splice(idx, 1)
        merged.push(kept!)
        changed = true
      }
    } else {
      merged.push(mark)
      changed = true
    }
  }

  if (merged.length > ACED_MAX_ACQUIRED_CENTER_MARKS) {
    return merged.slice(merged.length - ACED_MAX_ACQUIRED_CENTER_MARKS)
  }
  return changed ? merged : (existing as AcEdOsnapCenterMark[])
}

export function centerMarksCoincide(
  mark: AcGePoint2dLike,
  snap: AcGePoint2dLike,
  tol = 1e-8
) {
  return hypot2(mark.x, mark.y, snap.x, snap.y) <= tol
}
