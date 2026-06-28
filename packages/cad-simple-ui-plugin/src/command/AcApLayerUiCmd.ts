import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import type { AcExLayerManager } from '../ui/AcExLayerManager'

/**
 * Command that toggles the layer manager popover.
 */
export class AcApLayerUiCmd extends AcEdCommand {
  /**
   * @param layerManager - Layer manager instance to toggle when the command runs.
   */
  constructor(private layerManager: AcExLayerManager) {
    super()
  }

  /**
   * Toggles the layer manager popover.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.layerManager.toggleFromCommand()
  }
}
