import { AcApContext } from '../app'
import { AcApDocManager } from '../app'
import { AcEdCommand } from '../command'

/**
 * Command for creating a new CAD document from a template.
 *
 * This command opens a predefined template drawing (acadiso.dxf) from
 * a CDN to create a new document. The template provides:
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
   * Opens the ISO template from the CDN to create a new document
   * with standard drawing settings.
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const baseUrl = AcApDocManager.instance.baseUrl
    AcApDocManager.instance.openUrl(baseUrl + 'templates/acadiso.dxf')
  }
}
