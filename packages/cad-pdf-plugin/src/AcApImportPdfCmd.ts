import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'

import { AcApPdfImportConvertor } from './AcApPdfImportConvertor'

/**
 * Command for importing vector geometry from a PDF file through the Import
 * PDF dialog. The command name is `pdfimport`, as in AutoCAD; the
 * command-line variant is {@link AcApImportPdfPromptCmd} (`-pdfimport`).
 */
export class AcApImportPdfCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }
  /**
   * Opens a file picker, then the Import PDF dialog (page, insertion point,
   * scale, import mode), and imports vector geometry from the chosen page.
   *
   * @param context - Application context for the target document
   */
  async execute(context: AcApContext) {
    const convertor = new AcApPdfImportConvertor()
    await convertor.importFromFilePicker(context)
  }
}
