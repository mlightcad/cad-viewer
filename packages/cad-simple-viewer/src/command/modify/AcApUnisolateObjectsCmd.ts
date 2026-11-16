import { AcApContext, unisolateObjects } from '../../app/index.js'
import { AcEdCommand } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'

/**
 * Command to redisplay all objects temporarily hidden by HIDEOBJECTS.
 *
 * Matches AutoCAD UNISOLATEOBJECTS, the companion to {@link AcApHideObjectsCmd}.
 */
export class AcApUnisolateObjectsCmd extends AcEdCommand {
  /**
   * Restores session-hidden objects to their database visibility state.
   */
  async execute(context: AcApContext) {
    const count = unisolateObjects(context)
    if (count > 0) {
      this.showMessage(
        `${count} ${AcApI18n.t('jig.hideobjects.restored')}`,
        'success'
      )
      return
    }

    this.showMessage(AcApI18n.t('jig.hideobjects.nothingToRestore'), 'info')
  }
}
