import { AcApConvertToRasterImageCmd } from './AcApConvertToRasterImageCmd'

/**
 * Command for exporting the current CAD drawing to JPEG format (`jpgout`).
 *
 * @example
 * ```typescript
 * const convertCmd = new AcApConvertToJpgCmd();
 * convertCmd.execute(context); // User prompted for bounds and longside
 * ```
 */
export class AcApConvertToJpgCmd extends AcApConvertToRasterImageCmd {
  constructor() {
    super('jpeg', 'jpgout')
  }
}
