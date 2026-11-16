import { AcApContext } from '../../app/index.js'
import { AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcApLayerService } from '../../service/index.js'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd.js'

/**
 * AutoCAD-like `LAYTHW` command.
 */
export class AcApLayerThawCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const thawed = new AcApLayerService(context.doc.database).thawAllLayers()
    context.view.selectionSet.clear()

    if (thawed === 0) {
      this.showMessage(AcApI18n.t('jig.laythw.alreadyThawed'))
      return
    }

    this.showMessage(`${AcApI18n.t('jig.laythw.thawed')}: ${thawed}`, 'success')
  }
}
