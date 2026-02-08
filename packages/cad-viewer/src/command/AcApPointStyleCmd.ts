import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

export class AcApPointStyleCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('PointStyleDlg', true)
  }
}
