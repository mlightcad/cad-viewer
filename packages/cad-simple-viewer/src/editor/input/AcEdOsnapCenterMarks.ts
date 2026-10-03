import {
  AcDb2dPolyline,
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbOsnapMode,
  AcDbPolyline,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import type { AcEdDrawingPickResult } from '../view/AcEdDrawingPickResult'

/** Geometric center acquired by hovering circular geometry. */
export interface AcEdOsnapCenterMark {
  x: number
  y: number
  z: number
  /** Captured occurrence used to retire ticks when its source is no longer visible/current. */
  source?: AcEdDrawingPickResult
}

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

function markFromPoint(point: AcGePoint3dLike): AcEdOsnapCenterMark {
  return {
    x: point.x,
    y: point.y,
    z: point.z ?? 0
  }
}

function collectPolylineArcCenter(
  entity: AcDbPolyline | AcDb2dPolyline,
  pickPoint: AcGePoint3dLike
): AcEdOsnapCenterMark | undefined {
  let bestDistance = Infinity
  let bestCenter: AcGePoint3dLike | undefined
  const pick = new AcGePoint3d(pickPoint)
  // Native primitives already include elevation/extrusion and bulge geometry.
  for (const primitive of entity.subGetIntersectCurves()) {
    const nearest =
      primitive.kind === 'circArc'
        ? primitive.arc.nearestPoint(pick)
        : primitive.kind === 'line'
          ? primitive.line.closestPointToPoint(pick, true, new AcGePoint3d())
          : undefined
    if (!nearest) continue
    const distance = nearest.distanceToSquared(pick)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCenter =
        primitive.kind === 'circArc' ? primitive.arc.center : undefined
    }
  }
  return bestCenter ? markFromPoint(bestCenter) : undefined
}

function collectFromOsnapCenter(
  entity: AcDbEntity,
  pickPoint: AcGePoint3dLike
): AcEdOsnapCenterMark[] {
  const points: AcGePoint3dLike[] = []
  entity.subGetOsnapPoints(AcDbOsnapMode.Center, pickPoint, pickPoint, points)
  return points.map(point => markFromPoint(point))
}

/**
 * Collects AutoCAD-style center ticks for circular geometry under the cursor.
 *
 * Receives a resolved leaf in its source drawing frame. The source-aware caller
 * owns occurrence traversal and transforms the returned points to display WCS.
 */
export function collectCenterMarksFromEntity(
  entity: AcDbEntity,
  pickPoint: AcGePoint3dLike
): AcEdOsnapCenterMark[] {
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
  return collectFromOsnapCenter(entity, pickPoint)
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
    const idx = merged.findIndex(
      item =>
        centerMarksCoincide(item, mark) &&
        sameCenterSource(item.source, mark.source)
    )
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

function sameCenterSource(
  a?: AcEdDrawingPickResult,
  b?: AcEdDrawingPickResult
): boolean {
  if (!a || !b) return a === b
  return (
    a.database === b.database &&
    a.referenceId === b.referenceId &&
    a.viewportId === b.viewportId &&
    a.rootId === b.rootId &&
    a.path.length === b.path.length &&
    a.path.every((id, index) => id === b.path[index]) &&
    a.instancePath.length === b.instancePath.length &&
    a.instancePath.every((id, index) => id === b.instancePath[index])
  )
}

export function centerMarksCoincide(
  mark: AcGePoint2dLike,
  snap: AcGePoint2dLike,
  tol = 1e-8
) {
  return hypot2(mark.x, mark.y, snap.x, snap.y) <= tol
}
