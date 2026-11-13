import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapPasteTransform,
  acapPromptPastePoint,
  acapReadClipboard
} from './AcApClipboardUtils'

/**
 * PASTECLIP (Ctrl+V): inserts the clipboard objects at a picked point.
 *
 * The clipboard base point is placed at the picked point. Layers, linetypes,
 * styles and blocks that the target drawing lacks are created; those it
 * already has keep the target's definition, as in AutoCAD.
 */
export class AcApPasteClipCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const content = await acapReadClipboard(message =>
      this.showMessage(message, 'warning')
    )
    if (!content) return

    const point = await acapPromptPastePoint(
      context,
      content,
      'jig.pasteclip.insertionPoint'
    )
    if (!point) return

    await this.withBusyIndicator(
      () =>
        context.doc.database.insert(
          acapPasteTransform(content, point),
          content.database
        ),
      AcApI18n.t('main.message.pastingFromClipboard')
    )
  }
}
