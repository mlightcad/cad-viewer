import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcTrView2d } from '../../view'
import { runMeasurementEdit } from './AcApMeasurementHistory'
import {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER
} from './AcApMeasurementStore'

export {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  commitMeasurementGroup,
  type AcApMeasurementGroupExtras
} from './AcApMeasurementStore'

/**
 * Removes every committed measurement overlay (detached so Undo can restore
 * them) and disposes live jig overlays.
 */
export function clearAllMeasurements(view: AcTrView2d): void {
  const ht = view.htmlTransientManager
  runMeasurementEdit(view, 'Clear Measurements', () => {
    ht.deselectAll()
    ht.detachLayer(MEASUREMENT_LAYER)
  })
  ht.clear(MEASUREMENT_LIVE_LAYER)
  view.isDirty = true
}

/**
 * Command that clears every committed measurement overlay and its
 * associated CAD transients / canvas helpers.
 */
export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    clearAllMeasurements(context.view as AcTrView2d)
  }
}
