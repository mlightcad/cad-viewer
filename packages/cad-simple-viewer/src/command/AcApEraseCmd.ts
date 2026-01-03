import { AcApContext, AcApDocManager } from '../app'
import { AcEdPromptKeywordOptions } from '../editor'
import { AcApI18n } from '../i18n'
import { AcEdCommand } from '.'

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
      const options = new AcEdPromptKeywordOptions(message)
      options.keywords.add('Click')
      options.keywords.add('Window')
      await AcApDocManager.instance.editor.getKeywords(options)
    }
  }
}
