import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * DIMSTYLE — open the Dimension Style Manager.
 */
export class AcApDimStyleCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('DimStyleDlg', true)
  }
}
