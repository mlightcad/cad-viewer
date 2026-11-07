import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import { AcApNamedViewService } from '../service/AcApNamedViewService'

/**
 * Command-line restore for a named view (`viewrestore` / scripted use).
 *
 * Prompts for a view name, then restores the camera (and layer snapshot when
 * the document is open for write).
 */
export class AcApViewRestoreCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const prompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.view.enterName')
    )
    const result = await AcApDocManager.instance.editor.getString(prompt)
    const entered = String(result.stringResult ?? '').trim()
    if (result.status !== AcEdPromptStatus.OK || !entered) {
      return
    }

    const name = entered
    const applyLayers =
      AcApDocManager.instance.curDocument.openMode >= AcEdOpenMode.Write

    if (applyLayers) {
      context.doc.captureLayerPreviousState()
    }

    const ok = AcApNamedViewService.restoreView(
      context.doc.database,
      context.view,
      name,
      applyLayers
    )
    if (!ok) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.view.notFound').replace('{name}', name),
        'warning'
      )
    }
  }
}
