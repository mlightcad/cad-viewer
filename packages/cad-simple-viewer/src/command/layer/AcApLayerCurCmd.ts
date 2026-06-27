import { AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

/**
 * AutoCAD-like `LAYCUR` command.
 */
export class AcApLayerCurCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const objectIds =
      selectionSet.count > 0 ? selectionSet.ids : await this.promptSelection()

    if (!objectIds || objectIds.length === 0) return

    const result =
      context.doc.entityService.moveEntitiesToCurrentLayer(objectIds)

    if (result.currentLayerMissing) {
      this.showMessage(AcApI18n.t('jig.laycur.currentLayerNotFound'), 'warning')
      return
    }

    if (result.changedCount === 0) {
      this.showMessage(
        result.alreadyCurrent > 0
          ? AcApI18n.t('jig.laycur.alreadyCurrent')
          : AcApI18n.t('jig.laycur.noObjects'),
        result.alreadyCurrent > 0 && result.missing === 0 ? 'info' : 'warning'
      )
      return
    }

    context.view.selectionSet.clear()
    AcApDocManager.instance.regen()
    this.showMessage(
      `${AcApI18n.t('jig.laycur.changed')}: ${result.changedCount} (${context.doc.database.clayer})`,
      'success'
    )
  }

  private async promptSelection(): Promise<AcDbObjectId[] | undefined> {
    const prompt = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.laycur.prompt')
    )
    const result = await AcApDocManager.instance.editor.getSelection(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    return result.value?.ids ?? []
  }
}
