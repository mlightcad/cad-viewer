import { AcApContext } from '../../app/index.js'
import { AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd.js'

/**
 * AutoCAD-like `LAYERP` command.
 */
export class AcApLayerPCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    if (context.doc.restoreLayerPreviousState()) {
      this.showMessage(AcApI18n.t('jig.layerp.restored'), 'success')
    } else {
      this.showMessage(AcApI18n.t('jig.layerp.noPreviousState'))
    }

    context.view.selectionSet.clear()
  }
}
