import { AcApContext } from '../../app'
import { AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

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
