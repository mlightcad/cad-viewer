import { AcApContext } from '../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { acapCopySelectionToClipboard } from './AcApClipboardUtils.js'

/**
 * CUTCLIP (Ctrl+X): copies the selected objects to the clipboard and erases
 * them from the drawing. Erasing is one undo step.
 */
export class AcApCutClipCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    // One busy overlay covers clipboard write and erase so the UI does not
    // flash between two overlays on large selections.
    await acapCopySelectionToClipboard(context, 'cutclip', undefined, {
      busyMessage: AcApI18n.t('main.message.cuttingToClipboard'),
      afterCopy: ids => {
        context.doc.entityService.eraseEntities(ids)
      }
    })
  }
}
