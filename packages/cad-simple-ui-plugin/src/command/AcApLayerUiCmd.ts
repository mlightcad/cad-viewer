import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import type { AcExLayerManager } from '../ui/AcExLayerManager'

/**
 * Command that opens the floating layer manager panel.
 */
export class AcApLayerUiCmd extends AcEdCommand {
  /**
   * @param layerManager - Layer manager instance to show when the command runs.
   */
  constructor(private layerManager: AcExLayerManager) {
    super()
  }

  /**
   * Shows the layer manager panel.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.layerManager.show()
  }
}
