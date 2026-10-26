import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

/**
 * qselect command:
 * opens the Quick Select dialog so users can filter entities and update
 * the active selection set by conditions.
 */
export class AcApQSelectCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const { toggleDialog } = useDialogManager()
    // Reuse centralized dialog manager to open the registered dialog by name.
    toggleDialog('QuickSelectDlg', true)
  }
}
