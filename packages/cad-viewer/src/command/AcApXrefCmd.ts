import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { openMissingResourcesPalette } from '../composable'

/**
 * Opens the Missing / External Resources palette on the Xrefs sub-tab.
 */
export class AcApXrefCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    openMissingResourcesPalette('xref')
  }
}
