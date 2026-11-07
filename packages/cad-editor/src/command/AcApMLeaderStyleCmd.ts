import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * MLEADERSTYLE — open the Multileader Style Manager.
 */
export class AcApMLeaderStyleCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('MLeaderStyleDlg', true)
  }
}
