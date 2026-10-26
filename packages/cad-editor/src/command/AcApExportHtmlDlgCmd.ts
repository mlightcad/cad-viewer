import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * Opens the Export HTML dialog (`chtml`).
 *
 * The dialog collects export options and runs the HTML export workflow on OK.
 * Command-line export without a dialog is available via `-chtml`.
 */
export class AcApExportHtmlDlgCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('ExportHtmlDlg', true)
  }
}
