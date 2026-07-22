import { AcApContext } from '../app/AcApContext'
import { AcEdCommand } from '../editor'
import { AcUiAboutDialog } from '../ui/AcUiAboutDialog'

/**
 * Command that opens the mlightcad About dialog.
 *
 * Registered as the system command `about`.
 *
 * Imports `AcApContext` / `AcUiAboutDialog` via direct module paths (not the
 * `../app` barrel) to avoid a circular dependency with {@link AcApDocManager}.
 */
export class AcApAboutCmd extends AcEdCommand {
  /** About does not mutate the drawing database. */
  recordsUndoStack = false

  /**
   * Shows the About dialog on the current view host (or `document.body`).
   *
   * @param context - Application context providing the view host
   */
  async execute(context: AcApContext) {
    const host = context.view?.container ?? document.body
    await AcUiAboutDialog.open(host)
  }
}
