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
    const sysVarManager = AcDbSysVarManager.instance()
    const currentValue = sysVarManager.getVar(
      this.globalName,
      context.doc.database
    )
    const basePrompt = AcApI18n.t('jig.sysvar.prompt').trim()
    const match = basePrompt.match(/([：:])\s*$/)
    // Preserve the existing trailing colon style (Chinese or ASCII) if present.
    const colon = match?.[1] ?? ':'
    const promptCore = match
      ? basePrompt.slice(0, match.index).trimEnd()
      : basePrompt
    const suffix = currentValue == null ? '' : ` <${String(currentValue)}>`
    const promptMessage = `${promptCore}${suffix}${colon}`
    const prompt = new AcEdPromptStringOptions(promptMessage)
    const value = await AcApDocManager.instance.editor.getString(prompt)
    const sysVar = sysVarManager.getDescriptor(this.globalName)
    if (sysVar) {
      sysVarManager.setVar(this.globalName, value, context.doc.database)
    }
  }
}
