import { AcApContext } from '../../app/index.js'
import { AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcApLayerService } from '../../service/index.js'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd.js'

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
