import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcTrView2d } from '../../view'
import type { AcApMeasurementRecord } from './AcApMeasurementTypes'
import { createMeasureEntityFromRecord } from './entity'

function newImportedId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
  const prefix =
    record.geometry.type === 'distance'
      ? 'dist'
      : record.geometry.type
  const placed: AcApMeasurementRecord = {
    ...record,
    id: newImportedId(prefix)
  }
  try {
    createMeasureEntityFromRecord(placed).commit(view, db)
    return true
  } catch {
    return false
  }
}
