import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import { AcTrView2d } from '../view/AcTrView2d'

/**
 * Toggles transient reading mode: black linework on a white canvas.
 *
 * Does not modify entity or layer colors in the drawing database; restore by
 * running the command again.
 */
export class AcApReadingModeCmd extends AcEdCommand {
  /**
   * Enables or disables reading mode on the active view.
   *
   * @param context - Application context containing the view.
   */
  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    view.toggleReadingMode()
  }
}
