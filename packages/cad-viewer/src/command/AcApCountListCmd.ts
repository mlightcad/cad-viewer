import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * Opens the Count palette (AutoCAD-style COUNTLIST).
 *
 * The palette lists visible model-space blocks with instance counts and
 * supports search, area filtering, selection, and zoom. Create Table is
 * intentionally not implemented.
 */
export class AcApCountListCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    store.dialogs.activePaletteTab = 'countList'
    store.dialogs.layerManager = true
  }
}
