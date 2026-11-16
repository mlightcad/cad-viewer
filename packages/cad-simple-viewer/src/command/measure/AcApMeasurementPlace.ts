import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcTrView2d } from '../../view/index.js'
import { registerMeasurementPublish } from './AcApMeasurementRepublish.js'
import { getSelectedMeasurementId } from './AcApMeasurementStore.js'
import type { AcApMeasurementRecord } from './AcApMeasurementTypes.js'
import { newMeasureOverlayId } from './entity/AcApMeasureEntity.js'
import { createMeasureEntityFromRecord } from './entity/AcApMeasureEntityFactory.js'

function newImportedId(prefix: string): string {
  return newMeasureOverlayId(prefix)
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
    record.geometry.type === 'distance' ? 'dist' : record.geometry.type
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

/**
 * Detach any existing measurement with `record.id` and commit a fresh visual.
 * Used by grip edits; wrap with {@link runMeasurementEdit} for undo.
 */
function publishMeasurementRecord(
  view: AcTrView2d,
  db: AcDbDatabase,
  record: AcApMeasurementRecord
): void {
  const ht = view.htmlTransientManager
  const restoreSelection = getSelectedMeasurementId() === record.id
  if (ht.has(record.id)) {
    ht.detach(record.id)
  }
  createMeasureEntityFromRecord(record).commit(view, db)
  if (restoreSelection) {
    ht.selectGroup(record.id)
  }
}

registerMeasurementPublish(publishMeasurementRecord)
