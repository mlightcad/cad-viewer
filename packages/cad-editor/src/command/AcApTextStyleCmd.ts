import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * STYLE command (shortcut ST):
 * opens the Text Style dialog for managing drawing text styles.
 */
export class AcApTextStyleCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('TextStyleDlg', true)
  }
}
