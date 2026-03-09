import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'

import { AcApMeasureOverlay } from './AcApMeasureOverlay'

/**
 * Measurement command: clear all measurement labels.
 */
export class AcApMeasureClearCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(_context: AcApContext) {
    AcApMeasureOverlay.instance.clear()
  }
}
