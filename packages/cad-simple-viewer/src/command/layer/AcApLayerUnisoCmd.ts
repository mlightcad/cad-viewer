import { AcApContext } from '../../app/index.js'
import { AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd.js'

/**
 * AutoCAD-like `LAYUNISO` command.
 */
export class AcApLayerUnisoCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const restoredLayers = context.doc.unisolateLayers()

    if (restoredLayers === undefined) {
      this.showMessage(AcApI18n.t('jig.layuniso.noPrevious'), 'warning')
      return
    }

    context.view.selectionSet.clear()

    if (restoredLayers === 0) {
      this.showMessage(AcApI18n.t('jig.layuniso.nothingRestored'))
      return
    }

    this.showMessage(
      `${AcApI18n.t('jig.layuniso.restored')}: ${restoredLayers}`,
      'success'
    )
  }
}
