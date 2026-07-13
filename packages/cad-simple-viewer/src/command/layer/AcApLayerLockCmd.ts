import { AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

/**
 * AutoCAD-like `LAYLCK` command.
 */
export class AcApLayerLockCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    while (true) {
      const objectId = await this.promptSelection()
      if (!objectId) return

      this.lockEntityLayer(context, objectId)
    }
  }

  private async promptSelection(): Promise<AcDbObjectId | undefined> {
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.laylck.prompt'))
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.laylck.invalidSelection'))

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.OK && result.objectId) {
      return result.objectId
    }

    return undefined
  }

  private lockEntityLayer(context: AcApContext, objectId: AcDbObjectId) {
    const result = new AcApLayerService(context.doc.database).lockLayerByEntity(
      objectId
    )

    if (!result.ok) {
      switch (result.reason) {
        case 'invalid_selection':
          this.showMessage(AcApI18n.t('jig.laylck.invalidSelection'), 'warning')
          return
        case 'layer_not_found':
          this.showMessage(
            `${AcApI18n.t('jig.laylck.layerNotFound')}: ${result.layerName}`,
            'warning'
          )
          return
        case 'already_locked':
          this.showMessage(
            `${AcApI18n.t('jig.laylck.alreadyLocked')}: ${result.layerName}`,
            'info'
          )
          return
      }
    }

    context.view.selectionSet.clear()
    this.showMessage(
      `${AcApI18n.t('jig.laylck.locked')}: ${result.layerName}`,
      'success'
    )
  }
}
