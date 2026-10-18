import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'

import { openCadScriptPalette } from '../palette/scriptPaletteIntegration'

/**
 * Opens or toggles the CAD script console.
 */
export class AcApCadScriptCmd extends AcEdCommand {
  /**
   * Invokes the registered script-console opener, if the host has wired one in.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    if (!openCadScriptPalette()) {
      log.warn('CAD script console is not available.')
    }
  }
}
