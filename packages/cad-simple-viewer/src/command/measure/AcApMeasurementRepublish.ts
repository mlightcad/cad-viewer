import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import type { AcTrView2d } from '../../view'
import type { AcApMeasurementRecord } from './AcApMeasurementTypes'

/**
 * Callback that replaces one measurement visual on a view from a record.
 *
 * @param view - Host 2D view.
 * @param db - Drawing database for unit labels.
 * @param record - Updated measurement record to publish.
 */
type MeasurementPublishFn = (
  view: AcTrView2d,
  db: AcDbDatabase,
  record: AcApMeasurementRecord
) => void

/**
 * Presenter publish implementation registered at module load.
 * Indirection avoids circular imports between entities and place/factory.
 */
let publishImpl: MeasurementPublishFn | undefined

/**
 * Wire the measurement publish implementation.
 *
 * Called by {@link ./AcApMeasurementPlace} on module load.
 *
 * @param fn - Function that detaches any existing group and commits the record.
 */
export function registerMeasurementPublish(fn: MeasurementPublishFn): void {
  publishImpl = fn
}

/**
 * Replace one measurement visual after a geometry edit.
 *
 * Detaches the previous HTML group (kept alive for undo) and commits a fresh
 * entity from `record`. Callers that need undo should wrap this in
 * {@link runMeasurementEdit}. No-ops when {@link registerMeasurementPublish}
 * has not been called yet.
 *
 * @param view - Host view for the measurement overlays.
 * @param db - Drawing database for unit labels.
 * @param record - Updated store/sidecar record to publish.
 */
export function republishMeasurement(
  view: AcEdBaseView,
  db: AcDbDatabase,
  record: AcApMeasurementRecord
): void {
  publishImpl?.(view as AcTrView2d, db, record)
}
