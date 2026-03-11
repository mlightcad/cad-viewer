import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand, AcEdPromptBoxOptions } from '../editor'
import { AcApI18n } from '../i18n'

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
   * @param context - The application context containing the view
   * @returns Promise that resolves when the zoom operation completes
   */
  async execute(context: AcApContext) {
    const options = new AcEdPromptBoxOptions(
      AcApI18n.t('main.inputManager.firstCorner'),
      AcApI18n.t('main.inputManager.secondCorner')
    )
    const box = await AcApDocManager.instance.editor.getBox(options)
    return context.view.zoomTo(box, 1)
  }
}
