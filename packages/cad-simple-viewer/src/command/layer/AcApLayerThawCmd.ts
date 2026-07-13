import { AcApContext } from '../../app'
import { AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

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
