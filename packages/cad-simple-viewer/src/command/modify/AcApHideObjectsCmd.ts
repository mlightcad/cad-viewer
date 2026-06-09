import { AcApContext, AcApDocManager, hideObjects } from '../../app'
import {
  AcEdCommand,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Command to temporarily suppress display of selected objects.
 *
 * Matches AutoCAD {@link https://help.autodesk.com/view/ACD/2025/ENU/?guid=GUID-48199A62-90B6-48C6-93E1-5ECF56EAF8B5 | HIDEOBJECTS}:
 * selected objects are hidden in the current view while all other objects
 * remain visible. Use {@link AcApUnisolateObjectsCmd} to redisplay them.
 */
export class AcApHideObjectsCmd extends AcEdCommand {
  /**
   * Executes the hide-objects workflow using the current selection or a new pick set.
   */
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
