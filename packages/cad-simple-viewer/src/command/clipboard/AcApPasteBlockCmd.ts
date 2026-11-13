import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase
} from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapPromptPastePoint, acapReadClipboard } from './AcApClipboardUtils'

/**
 * Returns an unused block name in AutoCAD's PASTEBLOCK form `A$C` followed by
 * eight hexadecimal digits.
 *
 * @param db - Database the block is created in.
 */
export function acapPasteBlockName(db: AcDbDatabase) {
  const blockTable = db.tables.blockTable
  for (;;) {
    const hex = Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .toUpperCase()
      .padStart(8, '0')
    const name = `A$C${hex}`
    if (!blockTable.has(name)) return name
  }
}

/**
 * PASTEBLOCK (Ctrl+Shift+V): pastes the clipboard objects as one block
 * reference.
 *
 * A new block definition named `A$C########` is created from the clipboard
 * objects, with the clipboard base point as the block base point, and a
 * block reference is inserted at the picked point.
 */
export class AcApPasteBlockCmd extends AcEdCommand {
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
      'jig.pasteblock.insertionPoint'
    )
    if (!point) return

    const db = context.doc.database
    await this.withBusyIndicator(() => {
      const blockName = acapPasteBlockName(db)
      const blockId = db.insert(blockName, content.database)
      const block = db.getObjectById(blockId) as AcDbBlockTableRecord
      block.origin = content.basePoint

      const insert = new AcDbBlockReference(blockName)
      insert.position = point
      db.tables.blockTable.modelSpace.appendEntity(insert)
    }, AcApI18n.t('main.message.pastingFromClipboard'))
  }
}
