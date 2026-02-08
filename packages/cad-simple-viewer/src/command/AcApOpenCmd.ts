import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { eventBus } from '../editor'

/**
 * Command to open a CAD file.
 *
 * This command triggers the file opening workflow by emitting an 'open-file' event
 * on the global event bus. The actual file opening logic is handled by other
 * components listening for this event (typically the UI layer).
 *
 * The command follows the standard CAD pattern where the command itself is lightweight
 * and delegates the actual work to specialized handlers.
 *
 * @example
 * ```typescript
 * const openCommand = new AcApOpenCmd();
 * openCommand.globalName = 'OPEN';
 * openCommand.localName = 'Open File';
 *
 * // Trigger the command
 * openCommand.trigger(docManager.context);
 *
 * // The command will emit 'open-file' event for UI components to handle
 * ```
 */
export class AcApOpenCmd extends AcEdCommand {
  /**
   * Executes the open file command.
   *
   * Emits an 'open-file' event on the global event bus to trigger
   * the file opening workflow. UI components typically listen for
   * this event to display file selection dialogs.
   *
   * @param _context - The current application context (not used in this command)
   */
  async execute(_context: AcApContext) {
    eventBus.emit('open-file', {})
  }
}
