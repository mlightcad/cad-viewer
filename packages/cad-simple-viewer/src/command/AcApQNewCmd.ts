import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'

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
    const manager = AcApDocManager.instance
    const baseUrl = manager.baseUrl.endsWith('/')
      ? manager.baseUrl
      : `${manager.baseUrl}/`
    const defaults = await Promise.resolve(
      manager.resolveOpenDocumentDefaults()
    )
    const success = await manager.openUrl(`${baseUrl}templates/acadiso.dxf`, {
      ...defaults,
      mode: AcEdOpenMode.Write
    })
    if (!success) {
      throw new Error('Failed to open new drawing template')
    }
  }
}
