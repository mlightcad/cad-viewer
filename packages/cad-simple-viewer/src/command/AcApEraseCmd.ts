import { AcApAnnotation, AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../command'
import { AcEdPromptSelectionOptions } from '../editor/input/prompt'
import { AcEdOpenMode } from '../editor/view'
import { AcApI18n } from '../i18n'

/**
 * Command to delete selected objects from the drawing.
 */
export class AcApEraseCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to delete selected objects from the drawing
   *
   * @param context - The current application context
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)
    if (selectionSet.count > 0) {
      // If it is in review mode, annotation entities can be deleted only
      const ids =
        context.doc.openMode == AcEdOpenMode.Review
          ? annotation.filterAnnotationEntities(selectionSet.ids)
          : selectionSet.ids
      context.doc.database.tables.blockTable.removeEntity(ids)
      selectionSet.clear()
    } else {
      const message = AcApI18n.sysCmdPrompt('erase')
      const options = new AcEdPromptSelectionOptions(message)
      let ids = await AcApDocManager.instance.editor.getSelection(options)
      if (ids && ids.length > 0) {
        // If it is in review mode, annotation entities can be deleted only
        if (context.doc.openMode == AcEdOpenMode.Review)
          ids = annotation.filterAnnotationEntities(selectionSet.ids)
        context.doc.database.tables.blockTable.removeEntity(ids)
        selectionSet.clear()
      }
    }
  }
}
