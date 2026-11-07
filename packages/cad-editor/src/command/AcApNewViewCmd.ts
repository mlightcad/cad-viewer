import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * NEWVIEW — open the New View dialog.
 */
export class AcApNewViewCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('NewViewDlg', true)
  }
}
