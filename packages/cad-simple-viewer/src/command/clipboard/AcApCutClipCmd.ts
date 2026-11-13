import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapCopySelectionToClipboard } from './AcApClipboardUtils'

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
