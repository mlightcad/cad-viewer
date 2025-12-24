import { AcApContext } from '../app'
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
  execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    if (selectionSet.count > 0) {
      context.doc.database.tables.blockTable.removeEntity(selectionSet.ids)
      selectionSet.clear()
    }
  }
}
