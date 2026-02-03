import { AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand, AcEdOpenMode, AcEdPromptStringOptions } from '../editor'
import { AcApI18n } from '../i18n'

/**
 * Command for modifying value of one system variable. All of system variables share
 * this command.
 */
export class AcApSysVarCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to modify the value of one system variable.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const prompt = new AcEdPromptStringOptions(AcApI18n.t('jig.sysvar.prompt'))
    const value = await AcApDocManager.instance.editor.getString(prompt)
    const sysVarManager = AcDbSysVarManager.instance()
    const sysVar = sysVarManager.getDescriptor(this.globalName)
    if (sysVar) {
      sysVarManager.setVar(this.globalName, value, context.doc.database)
    }
  }
}
