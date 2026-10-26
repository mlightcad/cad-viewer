import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { openMissingResourcesPalette } from '../composable'

/**
 * Opens the Missing / External Resources palette (fonts, images, xrefs).
 */
export class AcApMissedDataCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    openMissingResourcesPalette()
  }
}
