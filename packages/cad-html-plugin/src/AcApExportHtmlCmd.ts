import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { AcApHtmlConvertor } from './AcApHtmlConvertor'

/**
 * Editor command that exports the active drawing as a self-contained HTML file.
 *
 * The command delegates to {@link AcApHtmlConvertor}, which serializes the
 * current Three.js scene into an {@link AcExSnapshot} HTML snapshot,
 * bundles the offline viewer runtime, and triggers a browser download. No
 * prompts are shown; the output filename is derived from the document name.
 */
export class AcApExportHtmlCmd extends AcEdCommand {
  /**
   * Runs the HTML export workflow for the drawing in `context`.
   *
   * @param context - Active application context; only `context.doc.fileName` is
   *   used today to suggest the downloaded file name.
   * @returns Resolves when the HTML file has been generated and the download
   *   has been initiated, or rejects if runtime loading or packaging fails.
   */
  async execute(context: AcApContext) {
    const converter = new AcApHtmlConvertor()
    await converter.convert(context.doc.fileName || context.doc.docTitle)
  }
}
