import {
  AcApContext,
  AcEdCommand,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import { AcDbBlockReference } from '@mlightcad/data-model'
import { nextTick } from 'vue'

import {
  promptAttributedBlockReference,
  resolveAttributedBlockReference,
  useAttEdit,
  useDialogManager
} from '../composable'
import { i18n } from '../locale'

/**
 * `attedit` / Enhanced Attribute Editor command.
 *
 * Opens the attribute editor for a selected block reference that has
 * attributes. When nothing suitable is preselected, prompts the user to pick
 * a block (or attribute belonging to one).
 */
export class AcApAttEditCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const { setTargetObjectId, clearTarget } = useAttEdit()
    const { toggleDialog, getDialogByName } = useDialogManager()
    const t = i18n.global.t

    const blockRef = await this.resolveTargetBlock(context, t)
    if (!blockRef) {
      clearTarget()
      return
    }

    const selectionSet = context.view.selectionSet
    selectionSet.clear()
    selectionSet.add(blockRef.objectId)

    setTargetObjectId(blockRef.objectId)

    // Force a false→true transition so MlBaseDialog emits `open` and the
    // dialog reloads even when attedit is re-run while already visible.
    if (getDialogByName('AttEditDlg')?.visible) {
      toggleDialog('AttEditDlg', false)
      await nextTick()
    }
    toggleDialog('AttEditDlg', true)
  }

  private async resolveTargetBlock(
    context: AcApContext,
    t: typeof i18n.global.t
  ): Promise<AcDbBlockReference | undefined> {
    const db = context.doc.database
    const selectionSet = context.view.selectionSet

    if (selectionSet.count > 0) {
      for (const id of selectionSet.ids) {
        const entity = db.tables.blockTable.getEntityById(id)
        const blockRef = resolveAttributedBlockReference(entity)
        if (blockRef) return blockRef
      }
    }

    return promptAttributedBlockReference(
      t('dialog.attEditDlg.promptSelectBlock'),
      t('dialog.attEditDlg.rejectSelectBlock'),
      t('dialog.attEditDlg.noAttributes')
    )
  }
}
