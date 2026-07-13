import { AcApContext, AcApDocManager, hideObjects } from '../../app'
import {
  AcEdCommand,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Command to temporarily suppress display of selected objects.
 */
export class AcApHideObjectsCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    let objectIds = selectionSet.count > 0 ? selectionSet.ids : []

    if (objectIds.length === 0) {
      const options = new AcEdPromptSelectionOptions(
        AcApI18n.sysCmdPrompt('hideobjects')
      )
      const selectionResult =
        await AcApDocManager.instance.editor.getSelection(options)
      if (
        selectionResult.status !== AcEdPromptStatus.OK ||
        !selectionResult.value ||
        selectionResult.value.count === 0
      ) {
        return
      }
      objectIds = selectionResult.value.ids
    }

    const count = hideObjects(context, objectIds)
    if (count > 0) {
      this.showMessage(
        `${count} ${AcApI18n.t('jig.hideobjects.hidden')}`,
        'success'
      )
    }
  }
}
