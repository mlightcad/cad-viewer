import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcApPdfConvertor } from './AcApPdfConvertor'

/**
 * Command for converting the current CAD drawing to PDF format.
 *
 * Renders the drawing through the SVG pipeline and exports a vector PDF.
 * The command name is `cpdf`.
 *
 * @example
 * ```typescript
 * const cmd = new AcApConvertToPdfCmd();
 * await cmd.execute(context);
 * ```
 */
export class AcApConvertToPdfCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const converter = new AcApPdfConvertor()
    await converter.convert()
  }
}
