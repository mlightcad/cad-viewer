import { AcApContext } from '../../app'
import { AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

/**
 * AutoCAD-like `LAYON` command.
 */
export class AcApLayerOnCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const turnedOn = new AcApLayerService(context.doc.database).setAllLayersOn()
    context.view.selectionSet.clear()

    if (turnedOn === 0) {
      this.showMessage(AcApI18n.t('jig.layon.alreadyOn'))
      return
    }

    this.showMessage(
      `${AcApI18n.t('jig.layon.turnedOn')}: ${turnedOn}`,
      'success'
    )
  }
}
