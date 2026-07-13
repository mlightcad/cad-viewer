import { AcApContext, unisolateObjects } from '../../app'
import { AcEdCommand } from '../../editor'
import { AcApI18n } from '../../i18n'

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
