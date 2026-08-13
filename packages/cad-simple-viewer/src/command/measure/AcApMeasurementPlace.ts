import type { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'

import type { AcTrView2d } from '../../view'
import { placeAngleMeasurement } from './AcApMeasureAngleCmd'
import { placeArcMeasurement } from './AcApMeasureArcCmd'
import { placeAreaMeasurement } from './AcApMeasureAreaCmd'
import { placeDistanceMeasurement } from './AcApMeasureDistanceCmd'
import { deserializeMeasurementStyle } from './AcApMeasurementSidecar'
import type {
  AcApMeasurementPoint2d,
  AcApMeasurementRecord
} from './AcApMeasurementTypes'
import { placePointMeasurement } from './AcApMeasurePointCmd'

function newImportedId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toPoint3d(point: AcApMeasurementPoint2d): AcGePoint3dLike {
  return { x: point.x, y: point.y, z: 0 }
}

/**
 * Recreate one measurement overlay from a sidecar record.
 * @returns true when the record was placed.
 */
export function placeMeasurementRecord(
  view: AcTrView2d,
  db: AcDbDatabase,
  record: AcApMeasurementRecord
): boolean {
  const style = deserializeMeasurementStyle(record.style)
  const geom = record.geometry
  const options = {
    layoutId: record.layoutId
  }
  switch (geom.type) {
    case 'distance':
      placeDistanceMeasurement(
        view,
        db,
        toPoint3d(geom.start),
        toPoint3d(geom.end),
        style,
        { ...options, id: newImportedId('dist') }
      )
      return true
    case 'angle':
      placeAngleMeasurement(
        view,
        db,
        toPoint3d(geom.vertex),
        toPoint3d(geom.arm1),
        toPoint3d(geom.arm2),
        style,
        { ...options, id: newImportedId('angle') }
      )
      return true
    case 'area':
      placeAreaMeasurement(view, db, geom.points.map(toPoint3d), style, {
        ...options,
        id: newImportedId('area')
      })
      return true
    case 'arc':
      placeArcMeasurement(
        view,
        db,
        { cx: geom.center.x, cy: geom.center.y, r: geom.radius },
        geom.start,
        geom.end,
        style,
        { ...options, id: newImportedId('arc') }
      )
      return true
    case 'point':
      placePointMeasurement(view, db, toPoint3d(geom.position), style, {
        ...options,
        id: newImportedId('point')
      })
      return true
  }
}
