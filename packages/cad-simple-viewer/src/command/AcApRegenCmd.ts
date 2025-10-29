import { AcApDocManager } from '../app'
import { AcEdCommand } from '.'

/**
 * Command to redraw the current drawing in the CAD viewer.
 *
 * This command redraws the current drawing. It can be used after users set font
 * mapping for missed fonts so that the current drawing can display texts with
 * correct fonts.
 *
 * @example
 * ```typescript
 * const regenCmd = new AcApRegenCmd();
 * regenCmd.execute(context); // Redraw the current drawing
 * ```
 */
export class AcApRegenCmd extends AcEdCommand {
  /**
   * Executes the regen command to redraw the current drawing
   */
  execute() {
    AcApDocManager.instance.regen()
  }
}
