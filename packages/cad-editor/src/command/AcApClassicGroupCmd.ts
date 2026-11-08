import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * CLASSICGROUP — open the Object Grouping dialog box.
 */
export class AcApClassicGroupCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('ClassicGroupDlg', true)
  }
}
