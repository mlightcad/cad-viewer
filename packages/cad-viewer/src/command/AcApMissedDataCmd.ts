import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

export class AcApMissedDataCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('ReplacementDlg', true)
  }
}
