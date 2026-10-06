import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * Opens the measurement list palette.
 */
export class AcApMeasurementPanelCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    store.dialogs.activePaletteTab = 'measurements'
    store.dialogs.layerManager = true
  }
}
