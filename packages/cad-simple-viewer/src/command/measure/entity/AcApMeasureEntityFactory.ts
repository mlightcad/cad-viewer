import { deserializeMeasurementStyle } from '../AcApMeasurementSidecar'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import { AcApMeasureAngleEntity } from './AcApMeasureAngleEntity'
import { AcApMeasureArcEntity } from './AcApMeasureArcEntity'
import { AcApMeasureAreaEntity } from './AcApMeasureAreaEntity'
import { AcApMeasureDistanceEntity } from './AcApMeasureDistanceEntity'
import type { AcApMeasureEntity } from './AcApMeasureEntity'
import { AcApMeasurePointEntity } from './AcApMeasurePointEntity'

/**
 * Creates a concrete measure entity from a sidecar / store record (deserialize).
 *
 * Pair with {@link AcApMeasureEntity.toRecord} for the serialize half of the
 * overlay persistence protocol. Deserializes the record's style and dispatches
 * on `geometry.type` to the matching entity constructor (`distance`, `angle`,
 * `area`, `arc`, or `point`).
 *
 * @param record - Persisted measurement record to rehydrate
 * @returns Measure entity ready for {@link AcApMeasureEntity.commit}
 */
export function createMeasureEntityFromRecord(
  record: AcApMeasurementRecord
): AcApMeasureEntity {
  const style = deserializeMeasurementStyle(record.style)
  const options = { id: record.id, layoutId: record.layoutId, style }
  const geom = record.geometry
  switch (geom.type) {
    case 'distance':
      return new AcApMeasureDistanceEntity(
        { x: geom.start.x, y: geom.start.y, z: 0 },
        { x: geom.end.x, y: geom.end.y, z: 0 },
        options
      )
    case 'angle':
      return new AcApMeasureAngleEntity(
        { x: geom.vertex.x, y: geom.vertex.y, z: 0 },
        { x: geom.arm1.x, y: geom.arm1.y, z: 0 },
        { x: geom.arm2.x, y: geom.arm2.y, z: 0 },
        options
      )
    case 'area':
      return new AcApMeasureAreaEntity(
        geom.points.map(p => ({ x: p.x, y: p.y, z: 0 })),
        options
      )
    case 'arc':
      return new AcApMeasureArcEntity(
        { cx: geom.center.x, cy: geom.center.y, r: geom.radius },
        geom.start,
        geom.end,
        options,
        geom.through
      )
    case 'point':
      return new AcApMeasurePointEntity(
        { x: geom.position.x, y: geom.position.y, z: 0 },
        options
      )
  }
}
