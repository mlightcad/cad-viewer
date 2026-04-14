import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcApPngConvertor } from './AcApPngConvertor'

/**
 * Command for exporting the current CAD drawing to PNG format.
 *
 * This command creates a PNG converter and initiates the conversion
 * process to export the current drawing as a PNG file. The command:
 * - Creates a new PNG converter instance
 * - Converts the current view to PNG format
 * - Automatically downloads the PNG file
 *
 * This is useful for exporting drawings to a raster image format
 * that can be displayed in browsers or used in other applications.
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToPngCmd();
 * convertCmd.execute(context); // Converts and downloads as PNG
 * ```
 */
export class AcApConvertToPngCmd extends AcEdCommand {
  /**
   * Executes the PNG conversion command.
   *
   * Creates a converter instance and initiates the conversion process
   * for the current document's view.
   *
   * @param _context - The application context (unused in this command)
   */
  async execute(_context: AcApContext) {
    const converter = new AcApPngConvertor()
    converter.convert()
  }
}