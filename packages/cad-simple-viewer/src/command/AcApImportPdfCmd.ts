import { AcApContext } from '../app'
import { AcEdCommand } from '../command'
import { AcApPdfImportConvertor } from './AcApPdfImportConvertor'

/**
 * Command for importing a PDF file into the current drawing.
 *
 * Opens a file picker (`.pdf` only), extracts vector geometry from the first
 * page, and appends the resulting entities to model space.
 * The command name is `ipdf`.
 *
 * @example
 * ```typescript
 * const cmd = new AcApImportPdfCmd();
 * await cmd.execute(context);
 * ```
 */
export class AcApImportPdfCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const convertor = new AcApPdfImportConvertor()
    convertor.importFromFilePicker()
  }
}
