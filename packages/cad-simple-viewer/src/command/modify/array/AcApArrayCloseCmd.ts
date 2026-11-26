import { AcDbSystemVariables, AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'

/**
 * ARRAYCLOSE — exits ARRAYEDIT Source editing state.
 *
 * AutoCAD prompts Yes/No to save source-object edits. Until Source editing is
 * implemented, {@link AcDbSystemVariables.ARRAYEDITSTATE} stays `0` and this
 * command reports that the drawing is not in array edit state (same as AutoCAD
 * when Source mode is inactive).
 */
export class AcApArrayCloseCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const state = AcDbSysVarManager.instance().getVar(
      AcDbSystemVariables.ARRAYEDITSTATE,
      context.doc.database
    )
    if (state === 0 || state === false || state == null) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.array.notInEditState'),
        'warning'
      )
      return
    }

    // Source-edit save/discard will land here with ARRAYEDITSTATE === 1.
    AcDbSysVarManager.instance().setArrayEditState(0)
    AcApDocManager.instance.editor.showMessage(
      AcApI18n.t('jig.array.editStateClosed')
    )
  }
}
