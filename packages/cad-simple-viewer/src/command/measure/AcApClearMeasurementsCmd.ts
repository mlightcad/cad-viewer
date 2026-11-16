import { AcApContext } from '../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../editor/index.js'
import { AcTrView2d } from '../../view/index.js'
import { runMeasurementEdit } from './AcApMeasurementHistory.js'
import {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER
} from './AcApMeasurementStore.js'

export {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  commitMeasurementGroup,
  type AcApMeasurementGroupExtras
} from './AcApMeasurementStore.js'

/**
 * Removes committed measurement overlays on the active layout (detached so
 * Undo can restore them) and disposes live jig overlays.
 */
export function clearLayoutMeasurements(view: AcTrView2d): void {
  const ht = view.htmlTransientManager
  const layoutId = view.activeLayoutBtrId
  runMeasurementEdit(view, 'Clear Measurements', () => {
    ht.deselectAll()
    for (const group of ht.groupsOnLayer(MEASUREMENT_LAYER)) {
      if (group.layoutId == null || group.layoutId === layoutId) {
        ht.detach(group.id)
      }
    }
  })
  ht.clear(MEASUREMENT_LIVE_LAYER)
  view.isHtmlDirty = true
}

/**
 * Command that clears committed measurement overlays on the current layout.
 */
export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    clearLayoutMeasurements(context.view as AcTrView2d)
  }
}
