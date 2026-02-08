import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

export class AcApLayerStateCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    store.dialogs.layerManager = true
  }
}
