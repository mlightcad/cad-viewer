import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
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
    const ids = await acapCopySelectionToClipboard(context, 'cutclip')
    if (ids && ids.length > 0) {
      context.doc.entityService.eraseEntities(ids)
    }
  }
}
