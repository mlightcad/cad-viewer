import { AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'

/**
 * Command for switching the visibility of comments.
 */
export class AcApRevVisibilityCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to switch the visibility of comments.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const variableName = 'CLAYER'
    const sysVarManager = AcDbSysVarManager.instance()
    const sysVar = sysVarManager.getDescriptor(variableName)
    if (sysVar) {
      const db = context.doc.database
      const currentLayer = sysVarManager.getVar(variableName, db) as string
      if (currentLayer) {
        const layer = db.tables.layerTable.getAt(currentLayer)
        if (layer) layer.isOff = !layer.isOff
      }
    }
  }
}
