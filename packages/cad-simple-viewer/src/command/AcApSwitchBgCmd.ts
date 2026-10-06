import { AcCmColor, AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import {
  layoutBackgroundSysVar,
  toggleBlackWhiteBackgroundColor
} from '../editor/global/AcEdUiColor'
import { AcTrView2d } from '../view/AcTrView2d'

/**
 * Command for switching the drawing background between white and black.
 *
 * Toggles `MODELBKCOLOR` in model space or `PAPERBKCOLOR` in the active
 * paper-space layout.
 */
export class AcApSwitchBgCmd extends AcEdCommand {
  /**
   * Executes the command to switch the drawing background between white and black.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    // Reading mode owns the clear colour (white) and linework; switching the
    // layout background would not be visible until reading mode is disabled.
    if (view.readingModeEnabled) {
      return
    }

    const db = context.doc.database
    const isModelSpace = view.activeLayoutBtrId === view.modelSpaceBtrId
    const variableName = layoutBackgroundSysVar(isModelSpace)
    const sysVarManager = AcDbSysVarManager.instance()
    const sysVar = sysVarManager.getDescriptor(variableName)
    if (!sysVar) {
      return
    }

    const currentColor = sysVarManager.getVar(variableName, db) as AcCmColor
    sysVarManager.setVar(
      variableName,
      toggleBlackWhiteBackgroundColor(currentColor),
      db
    )
  }
}
