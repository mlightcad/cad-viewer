import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcApSvgConvertor } from './AcApSvgConvertor'

/**
 * Command for converting the current CAD drawing to SVG format.
 *
 * This command creates an SVG converter and initiates the conversion
 * process to export the current drawing as an SVG file. The command:
 * - Creates a new SVG converter instance
 * - Converts all entities in the current document to SVG
 * - Automatically downloads the SVG file
 *
 * This is useful for exporting drawings to a web-friendly vector format
 * that can be displayed in browsers or used in web applications.
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToSvgCmd();
 * convertCmd.execute(context); // Converts and downloads as SVG
 * ```
 */
export class AcApConvertToSvgCmd extends AcEdCommand {
  /**
   * Executes the SVG conversion command.
   *
   * Creates a converter instance and initiates the conversion process
   * for the current document.
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const converter = new AcApSvgConvertor()
    converter.convert()
  }
}
