import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../editor'

/**
 * Command for creating a new CAD document from a template.
 *
 * This command uses {@link AcApDocManager.newDocument} to create a new document
 * from the default ISO template (`acadiso.dxf`), which provides:
 * - Standard ISO drawing settings
 * - Predefined layers and styles
 * - Default drawing setup
 *
 * This is equivalent to "Quick New" functionality in traditional CAD applications,
 * providing users with a ready-to-use drawing environment.
 *
 * @example
 * ```typescript
 * const qNewCmd = new AcApQNewCmd();
 * qNewCmd.execute(context); // Creates new document from template
 * ```
 */
export class AcApQNewCmd extends AcEdCommand {
  /**
   * Executes the quick new command.
   *
   * Creates a new document from the default ISO template with standard
   * drawing settings.
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const success = await AcApDocManager.instance.newDocument()
    if (!success) {
      throw new Error('Failed to create new drawing')
    }
  }
}
