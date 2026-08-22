import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand } from '../editor'

/**
 * Closes the current drawing, or the last remaining drawing after which a
 * new untitled document is created.
 */
export class AcApCloseCmd extends AcEdCommand {
  /**
   * Closes the current drawing via {@link AcApDocManager.closeDocument}.
   *
   * @param _context - Unused; the command always targets the active document.
   */
  async execute(_context: AcApContext) {
    await AcApDocManager.instance.closeDocument()
  }
}
