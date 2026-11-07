import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * VIEW — open the View Manager dialog.
 */
export class AcApViewCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('ViewManagerDlg', true)
  }
}
