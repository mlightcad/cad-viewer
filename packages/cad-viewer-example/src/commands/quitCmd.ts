import { AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../store'

/**
 * Command to close cad viewer
 */
export class AcApQuitCmd extends AcEdCommand {
  async execute() {
    store.selectedFile = null
  }
}
