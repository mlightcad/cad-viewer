import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../command'

/**
 * Command for zooming to a user-selected rectangular area.
 *
 * This command initiates an interactive zoom-to-box operation where:
 * - User selects a rectangular area by dragging
 * - The view zooms to fit the selected area
 * - The zoom level is adjusted to show the entire selected region
 *
 * This provides precise navigation control, allowing users to quickly
 * focus on specific areas of large drawings.
 *
 * @example
 * ```typescript
 * const zoomToBoxCmd = new AcApZoomToBoxCmd();
 * await zoomToBoxCmd.execute(context); // User selects area to zoom to
 * ```
 */
export class AcApZoomToBoxCmd extends AcEdCommand {
  /**
   * Executes the zoom-to-box command.
   *
   * Creates a jig for interactive area selection and initiates
   * the drag operation for the user to select the zoom area.
   *
   * @param context - The application context containing the view
   * @returns Promise that resolves when the zoom operation completes
   */
  async execute(context: AcApContext) {
    const box = await AcApDocManager.instance.editor.getSelection()
    return context.view.zoomTo(box, 1)
  }
}
