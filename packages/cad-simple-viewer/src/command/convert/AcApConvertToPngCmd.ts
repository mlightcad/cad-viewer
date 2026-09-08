import { AcApConvertToRasterImageCmd } from './AcApConvertToRasterImageCmd'

/**
 * Command for exporting the current CAD drawing to PNG format (`pngout`).
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToPngCmd();
 * convertCmd.execute(context); // User prompted for bounds and longside
 * ```
 */
export class AcApConvertToPngCmd extends AcApConvertToRasterImageCmd {
  constructor() {
    super('png', 'pngout')
  }
}
