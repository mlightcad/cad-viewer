import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'

import { openAgentPalette } from '../palette/agentPaletteIntegration'

/**
 * Opens or toggles the CAD Agent tab in the tool palette.
 */
export class AcApAgentCmd extends AcEdCommand {
  /**
   * Invokes the registered palette opener, if cad-viewer has wired one in.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    if (!openAgentPalette()) {
      log.warn('CAD Agent palette is not available.')
    }
  }
}
