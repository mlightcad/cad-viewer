import {
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  AcDbMText,
  AcDbPoint,
  AcDbPolyline,
  AcDbRay,
  AcDbText,
  AcDbXline
} from '@mlightcad/data-model'

/** JSON point copied from an entity so scripts cannot hold live geometry objects. */
export interface SnapshotPoint {
  x: number
  y: number
  z: number
}

/**
 * Plain description of one model-space entity.
 *
 * `geometry` is present for common curve, text, and insert types. Other types
 * still include `id`, `type`, `layer`, and `extents`.
 */
export interface EntitySnapshot {
  /** Entity object id. */
  id: string
  /** Runtime type without the `AcDb` prefix, for example `Circle`. */
  type: string
  /** Layer name. */
  layer: string
  /** World extents when the entity can report them. */
  extents?: { min: SnapshotPoint; max: SnapshotPoint }
  /** Type-specific geometry fields. */
  geometry?: Record<string, unknown>
}

/**
 * Copies one entity into a JSON snapshot.
 *
 * @param entity - Live database entity. The snapshot does not retain it.
 * @returns A plain object safe to return from a script.
 */
export function toEntitySnapshot(entity: AcDbEntity): EntitySnapshot {
  const snapshot: EntitySnapshot = {
    id: entity.objectId,
    type: entity.type,
    layer: entity.layer
  }
  try {
    const extents = entity.geometricExtents
    if (extents && !extents.isEmpty()) {
      snapshot.extents = {
        min: toPoint(extents.min),
        max: toPoint(extents.max)
      }
    }
  } catch {
    // Some entities cannot report extents until they are fully drawn.
  }
  const geometry = readGeometry(entity)
  if (geometry) snapshot.geometry = geometry
  return snapshot
}

function readGeometry(entity: AcDbEntity): Record<string, unknown> | undefined {
  try {
    if (entity instanceof AcDbCircle) {
      return {
        center: toPoint(entity.center),
        radius: entity.radius
      }
    }
    if (entity instanceof AcDbLine) {
      return {
        start: toPoint(entity.startPoint),
        end: toPoint(entity.endPoint)
      }
    }
    if (entity instanceof AcDbArc) {
      return {
        center: toPoint(entity.center),
        radius: entity.radius,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle,
        startAngleDeg: (entity.startAngle * 180) / Math.PI,
        endAngleDeg: (entity.endAngle * 180) / Math.PI
      }
    }
    if (entity instanceof AcDbEllipse) {
      return {
        center: toPoint(entity.center),
        majorRadius: entity.majorAxisRadius,
        minorRadius: entity.minorAxisRadius
      }
    }
    if (entity instanceof AcDbPolyline) {
      const points = []
      for (let index = 0; index < entity.numberOfVertices; index++) {
        const point = entity.getPoint2dAt(index)
        points.push({ x: point.x, y: point.y, z: 0 })
      }
      return { points, closed: entity.closed }
    }
    if (entity instanceof AcDbMText) {
      const height = (entity as AcDbMText & { textHeight?: number }).textHeight
      return {
        position: toPoint(entity.location),
        text: entity.contents,
        height: height || entity.height
      }
    }
    if (entity instanceof AcDbText) {
      return {
        position: toPoint(entity.position),
        text: entity.textString,
        height: entity.height
      }
    }
    if (entity instanceof AcDbPoint) {
      return { position: toPoint(entity.position) }
    }
    if (entity instanceof AcDbRay || entity instanceof AcDbXline) {
      return {
        basePoint: toPoint(entity.basePoint),
        unitDir: toPoint(entity.unitDir)
      }
    }
    if (entity instanceof AcDbBlockReference) {
      return {
        name: entity.blockName,
        position: toPoint(entity.position),
        rotation: entity.rotation,
        scale: toPoint(entity.scaleFactors)
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

function toPoint(point: { x: number; y: number; z?: number }): SnapshotPoint {
  return { x: point.x, y: point.y, z: point.z ?? 0 }
}
