import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcEdCorsorType, AcEdViewMode } from '../editor'

/**
 * Command for enabling selection mode in the CAD viewer.
 *
 * This command switches the view to selection mode, allowing users to
 * select CAD entities by clicking on them. When executed, it:
 * - Sets the view mode to SELECTION
 * - Changes the cursor to a crosshair for precise selection
 *
 * In selection mode, users can click on entities to select them,
 * which will add them to the selection set and typically show
 * grip points for manipulation.
 *
 * @example
 * ```typescript
 * const selectCmd = new AcApSelectCmd();
 * selectCmd.execute(context); // Enables selection mode
 * ```
 */
export class AcApSelectCmd extends AcEdCommand {
  /**
   * Executes the select command.
   *
   * Sets the view to selection mode and updates the cursor appearance
   * to indicate that entity selection is active.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    context.view.mode = AcEdViewMode.SELECTION
    context.view.setCursor(AcEdCorsorType.Crosshair)
  }
}
