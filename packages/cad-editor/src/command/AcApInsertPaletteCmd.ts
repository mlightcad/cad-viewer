import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * `INSERT` — opens the Blocks palette (AutoCAD Blocks palette / BLOCKSPALETTE).
 *
 * Placement itself is performed by selecting a block in the palette, which
 * starts the command-line `-INSERT` flow with optional session options.
 *
 * @see https://help.autodesk.com/view/ACD/2024/ENU/?guid=GUID-E3413A03-8EEF-44D5-B5C7-8B345A9257FE
 */
export class AcApInsertPaletteCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    store.dialogs.activePaletteTab = 'blocks'
    store.dialogs.layerManager = true
  }
}
