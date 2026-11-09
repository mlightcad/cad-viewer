import {
  AcApDashBSearchCmd,
  type AcApSmartBlockSearchOptions
} from '@mlightcad/cad-simple-viewer'

/**
 * `pdfblock`: turns repeated geometry from a PDF back into a block.
 *
 * A preset of `-BSEARCH` for imported PDF geometry: layers are ignored (PDF
 * import assigns them by color, not by meaning) and suggested names start
 * with `PDF_BLOCK_`. Everything else, including review, search options and
 * converting into an existing block, is the `-BSEARCH` workflow.
 */
export class AcApPdfBlockCmd extends AcApDashBSearchCmd {
  protected override promptKey = 'pdfblock'
  protected override blockNamePrefix = 'PDF_BLOCK_'

  protected override initialOptions(): AcApSmartBlockSearchOptions {
    return { ...super.initialOptions(), matchLayer: false }
  }
}
