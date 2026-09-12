import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'

import { AcApPdfConvertor } from './AcApPdfConvertor'
import {
  type AcApPdfExportOptions,
  type AcApPdfModelSpaceFit,
  resolveAcApPdfExportOptions
} from './AcApPdfExportOptions'

/**
 * Command for converting the current CAD drawing to PDF format.
 *
 * Registered as `-cpdf` (command-line prompts). Also registered as `cpdf` when
 * no UI dialog command is already present (e.g. cad-simple-viewer without
 * cad-viewer).
 */
export class AcApConvertToPdfCmd extends AcEdCommand {
  /**
   * Prompts for export options, then renders and downloads the PDF.
   *
   * @param context - Application context for the active document
   */
  async execute(context: AcApContext) {
    const options = await this.promptOptions()
    if (!options) {
      return
    }

    const converter = new AcApPdfConvertor()
    await converter.convert(context, options)
  }

  private async promptOptions(): Promise<AcApPdfExportOptions | undefined> {
    const defaults = resolveAcApPdfExportOptions()

    const modelSpaceFit = await this.promptModelSpaceFit()
    if (modelSpaceFit === undefined) {
      return undefined
    }

    const exportLayouts = await this.promptYesNo(
      'jig.cpdf.exportLayouts',
      defaults.exportLayouts
    )
    if (exportLayouts === undefined) {
      return undefined
    }

    return resolveAcApPdfExportOptions({
      modelSpaceFit,
      exportLayouts
    })
  }

  private async promptModelSpaceFit(): Promise<
    AcApPdfModelSpaceFit | undefined
  > {
    const defaults = resolveAcApPdfExportOptions()
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.cpdf.modelSpaceFit')
    )
    prompt.allowNone = true
    const extents = prompt.keywords.add(
      AcApI18n.t('jig.cpdf.keywords.extents.display'),
      AcApI18n.t('jig.cpdf.keywords.extents.global'),
      AcApI18n.t('jig.cpdf.keywords.extents.local')
    )
    const display = prompt.keywords.add(
      AcApI18n.t('jig.cpdf.keywords.display.display'),
      AcApI18n.t('jig.cpdf.keywords.display.global'),
      AcApI18n.t('jig.cpdf.keywords.display.local')
    )
    prompt.keywords.default =
      defaults.modelSpaceFit === 'display' ? display : extents

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.modelSpaceFit
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.modelSpaceFit
      }
      return result.stringResult === 'Display' ? 'display' : 'extents'
    }
    return undefined
  }

  private async promptYesNo(
    messageKey: string,
    defaultYes: boolean
  ): Promise<boolean | undefined> {
    const prompt = new AcEdPromptKeywordOptions(AcApI18n.t(messageKey))
    prompt.allowNone = true
    const yes = prompt.keywords.add(
      AcApI18n.t('jig.cpdf.keywords.yes.display'),
      AcApI18n.t('jig.cpdf.keywords.yes.global'),
      AcApI18n.t('jig.cpdf.keywords.yes.local')
    )
    const no = prompt.keywords.add(
      AcApI18n.t('jig.cpdf.keywords.no.display'),
      AcApI18n.t('jig.cpdf.keywords.no.global'),
      AcApI18n.t('jig.cpdf.keywords.no.local')
    )
    prompt.keywords.default = defaultYes ? yes : no

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaultYes
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaultYes
      }
      return result.stringResult === 'Yes'
    }
    return undefined
  }
}
