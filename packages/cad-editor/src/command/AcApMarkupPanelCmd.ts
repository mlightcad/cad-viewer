import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * Opens the Design Review markup palette.
 */
export class AcApMarkupPanelCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    store.dialogs.activePaletteTab = 'designReview'
    store.dialogs.layerManager = true
  }
}
