import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'

import { AcApPdfImportConvertor } from './AcApPdfImportConvertor'

/**
 * Command-line variant of {@link AcApImportPdfCmd}: imports vector geometry
 * from a PDF file without a dialog. The command name is `-pdfimport`.
 */
export class AcApImportPdfPromptCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }
  /**
   * Opens a file picker, then asks for the page, insertion point, scale and
   * import mode on the command line, and imports the chosen page.
   *
   * @param context - Application context for the target document
   */
  async execute(context: AcApContext) {
    const convertor = new AcApPdfImportConvertor()
    await convertor.importFromCommandLine(context)
  }
}
