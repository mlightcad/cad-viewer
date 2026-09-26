import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'

import { AcApPdfImportConvertor } from './AcApPdfImportConvertor'

/**
 * Command for importing vector geometry from a PDF file.
 * The command name is `ipdf`.
 */
export class AcApImportPdfCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }
  /**
   * Opens a file picker and imports vector geometry from the selected PDF.
   *
   * @param context - Application context for the target document
   */
  async execute(context: AcApContext) {
    const convertor = new AcApPdfImportConvertor()
    await convertor.importFromFilePicker(context)
  }
}
