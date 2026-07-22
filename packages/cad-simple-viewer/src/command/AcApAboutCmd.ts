import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../editor'
import { AcUiAboutDialog } from '../ui'

/**
 * Command that opens the mlightcad About dialog.
 *
 * Registered as the system command `about`.
 */
export class AcApAboutCmd extends AcEdCommand {
  /** About does not mutate the drawing database. */
  recordsUndoStack = false

  /**
   * Shows the About dialog on the current view host (or `document.body`).
   *
   * @param _context - Application context (unused)
   */
  async execute(_context: AcApContext) {
    const host = AcApDocManager.instance.curView?.container ?? document.body
    await AcUiAboutDialog.open(host)
  }
}
