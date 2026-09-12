import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * Opens the Export PDF dialog (`cpdf`).
 *
 * The dialog collects export options and runs the PDF export workflow on OK.
 * Command-line export without a dialog is available via `-cpdf`.
 */
export class AcApExportPdfDlgCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('ExportPdfDlg', true)
  }
}
