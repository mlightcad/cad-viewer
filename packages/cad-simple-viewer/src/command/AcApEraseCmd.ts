import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../command'
import { AcEdPromptSelectionOptions } from '../editor/input/prompt'
import { AcApI18n } from '../i18n'

/**
 * Command to delete selected objects from the drawing.
 */
export class AcApEraseCmd extends AcEdCommand {
  /**
   * Executes the command to delete selected objects from the drawing
   *
   * @param context - The current application context
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    if (selectionSet.count > 0) {
      context.doc.database.tables.blockTable.removeEntity(selectionSet.ids)
      selectionSet.clear()
    } else {
      const message = AcApI18n.sysCmdPrompt('erase')
      const options = new AcEdPromptSelectionOptions(message)
      const ids = await AcApDocManager.instance.editor.getSelection(options)
      if (ids && ids.length > 0) {
        context.doc.database.tables.blockTable.removeEntity(ids)
        selectionSet.clear()
      }
    }
  }
}
