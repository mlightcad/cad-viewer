import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapCopySelectionToClipboard } from './AcApClipboardUtils'

/**
 * COPYBASE (Ctrl+Shift+C): copies the selected objects to the clipboard with
 * a base point the user picks, so PASTECLIP places that point at the cursor.
 *
 * Like AutoCAD, it asks for the base point first and then for the objects.
 */
export class AcApCopyBaseCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.copybase.basePoint')
    )
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status !== AcEdPromptStatus.OK || !result.value) {
      context.view.selectionSet.clear()
      return
    }
    await acapCopySelectionToClipboard(context, 'copybase', result.value)
  }
}
