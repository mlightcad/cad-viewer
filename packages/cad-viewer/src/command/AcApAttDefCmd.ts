import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import { nextTick } from 'vue'

import { useDialogManager } from '../composable'

/**
 * `attdef` command — Attribute Definition dialog (AutoCAD ATTDEF).
 *
 * Opens a dialog to create an `AcDbAttributeDefinition` entity with mode,
 * insertion point, tag/prompt/default, and text settings.
 */
export class AcApAttDefCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(_context: AcApContext) {
    const { toggleDialog, getDialogByName } = useDialogManager()

    // Force a false→true transition so MlBaseDialog emits `open` and the
    // form resets even when attdef is re-run while already visible.
    if (getDialogByName('AttDefDlg')?.visible) {
      toggleDialog('AttDefDlg', false)
      await nextTick()
    }
    toggleDialog('AttDefDlg', true)
  }
}
