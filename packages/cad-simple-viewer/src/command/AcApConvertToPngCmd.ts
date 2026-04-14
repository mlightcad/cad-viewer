import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

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

    // TODO: Currently using hardcoded bounds for testing
    // TODO: Should support user-provided bounds in the future
    const bounds = new AcGeBox2d(
      new AcGePoint2d(15845.702471051365, 12489.930464275007),
      new AcGePoint2d(106945.7030976452, 78889.9302429927)
    )
    // bounds.expandByPoint(
    //   new AcGePoint2d(19345.702471051365, -506757.6376045831)
    // )
    // bounds.expandByPoint(new AcGePoint2d(456396.1555727676, 99178.62520575267))
    converter.convert(bounds)
  }
}
