import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import type { AcTrView2d } from '../../view'
import {
  isMeasurementVisible,
  setMeasurementVisible
} from './AcApMeasurementStore'

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
