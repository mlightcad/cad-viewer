import { AcApContext } from '../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../editor/index.js'
import type { AcTrView2d } from '../../view/index.js'
import {
  isMeasurementVisible,
  setMeasurementVisible
} from './AcApMeasurementStore.js'

/**
 * Toggle measurement overlay visibility on the current layout.
 */
export class AcApMeasurementVisibilityCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    setMeasurementVisible(view, !isMeasurementVisible())
  }
}
