import { AcApConvertToRasterImageCmd } from './AcApConvertToRasterImageCmd'

/**
 * Command for exporting the current CAD drawing to BMP format (`bmpout`).
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToBmpCmd();
 * convertCmd.execute(context); // User prompted for bounds and longside
 * ```
 */
export class AcApConvertToBmpCmd extends AcApConvertToRasterImageCmd {
  constructor() {
    super('bmp', 'bmpout')
  }
}
