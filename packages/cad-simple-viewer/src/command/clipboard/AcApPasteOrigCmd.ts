import { AcGeMatrix3d } from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapReadClipboard } from './AcApClipboardUtils'

/**
 * PASTEORIG: pastes the clipboard objects at the coordinates they had in the
 * source drawing.
 *
 * As in AutoCAD, it only works in a drawing other than the one the objects
 * were copied from, because pasting there would stack the copies exactly on
 * top of the originals.
 */
export class AcApPasteOrigCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const content = await acapReadClipboard(message =>
      this.showMessage(message, 'warning')
    )
    if (!content) return

    if (content.sourceDatabase === context.doc.database) {
      this.showMessage(AcApI18n.t('jig.pasteorig.sameDrawing'), 'warning')
      return
    }

    await this.withBusyIndicator(
      () => context.doc.database.insert(new AcGeMatrix3d(), content.database),
      AcApI18n.t('main.message.pastingFromClipboard')
    )
  }
}
