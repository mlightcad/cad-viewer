import { AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'

/**
 * Command for switching the drawing background between white and black.
 */
export class AcApSwitchBgCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to switch the drawing background between white and black.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const variableName = 'WHITEBKCOLOR'
    const sysVarManager = AcDbSysVarManager.instance()
    const sysVar = sysVarManager.getDescriptor(variableName)
    if (sysVar) {
      const db = context.doc.database
      const useWhiteBackgroundColor = sysVarManager.getVar(
        variableName,
        db
      ) as boolean
      sysVarManager.setVar(variableName, !useWhiteBackgroundColor, db)
    }
  }
}
