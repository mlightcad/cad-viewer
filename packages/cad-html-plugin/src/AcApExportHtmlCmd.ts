import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'

import { AcApHtmlConvertor } from './AcApHtmlConvertor'
import {
  type AcApHtmlExportOptions,
  resolveAcApHtmlExportOptions
} from './AcApHtmlExportOptions'

/**
 * Editor command that exports the active drawing as a self-contained HTML file.
 *
 * The command delegates to {@link AcApHtmlConvertor}, which serializes the
 * current Three.js scene into an {@link AcExSnapshot} HTML snapshot,
 * bundles the offline viewer runtime, and triggers a browser download.
 */
export class AcApExportHtmlCmd extends AcEdCommand {
  /**
   * Runs the HTML export workflow for the drawing in `context`.
   *
   * @param context - Active application context used for prompts and export.
   * @returns Resolves when the HTML file has been generated and the download
   *   has been initiated, or rejects if runtime loading or packaging fails.
   */
  async execute(context: AcApContext) {
    const options = await this.promptOptions()
    if (!options) {
      return
    }

    const converter = new AcApHtmlConvertor()
    await converter.convert(
      context.doc.fileName || context.doc.docTitle,
      options,
      context.view
    )
  }

  private async promptOptions(): Promise<AcApHtmlExportOptions | undefined> {
    const exportInvisibleLayers = await this.promptExportInvisibleLayers()
    if (exportInvisibleLayers === undefined) {
      return undefined
    }

    const initialView = await this.promptInitialView()
    if (initialView === undefined) {
      return undefined
    }

    const viewerMode = await this.promptViewerMode()
    if (viewerMode === undefined) {
      return undefined
    }

    return resolveAcApHtmlExportOptions({
      exportInvisibleLayers,
      initialView,
      viewerMode
    })
  }

  private async promptExportInvisibleLayers(): Promise<boolean | undefined> {
    const defaults = resolveAcApHtmlExportOptions()
    const current = defaults.exportInvisibleLayers ? 'Yes' : 'No'
    const prompt = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.chtml.exportInvisibleLayers')} <${current}>`
    )
    prompt.allowNone = true
    const yes = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.yes.display'),
      AcApI18n.t('jig.chtml.keywords.yes.global'),
      AcApI18n.t('jig.chtml.keywords.yes.local')
    )
    const no = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.no.display'),
      AcApI18n.t('jig.chtml.keywords.no.global'),
      AcApI18n.t('jig.chtml.keywords.no.local')
    )
    prompt.keywords.default = defaults.exportInvisibleLayers ? yes : no

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.exportInvisibleLayers
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.exportInvisibleLayers
      }
      return result.stringResult === 'Yes'
    }
    return undefined
  }

  private async promptInitialView(): Promise<
    AcApHtmlExportOptions['initialView'] | undefined
  > {
    const defaults = resolveAcApHtmlExportOptions()
    const current =
      defaults.initialView === 'current'
        ? AcApI18n.t('jig.chtml.keywords.current.global')
        : AcApI18n.t('jig.chtml.keywords.extents.global')
    const prompt = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.chtml.initialView')} <${current}>`
    )
    prompt.allowNone = true
    const extents = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.extents.display'),
      AcApI18n.t('jig.chtml.keywords.extents.global'),
      AcApI18n.t('jig.chtml.keywords.extents.local')
    )
    const currentView = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.current.display'),
      AcApI18n.t('jig.chtml.keywords.current.global'),
      AcApI18n.t('jig.chtml.keywords.current.local')
    )
    prompt.keywords.default =
      defaults.initialView === 'current' ? currentView : extents

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.initialView
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.initialView
      }
      return result.stringResult === 'Current' ? 'current' : 'fit'
    }
    return undefined
  }

  private async promptViewerMode(): Promise<
    AcApHtmlExportOptions['viewerMode'] | undefined
  > {
    const defaults = resolveAcApHtmlExportOptions()
    const current =
      defaults.viewerMode === 'view'
        ? AcApI18n.t('jig.chtml.keywords.view.global')
        : AcApI18n.t('jig.chtml.keywords.measure.global')
    const prompt = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.chtml.viewerMode')} <${current}>`
    )
    prompt.allowNone = true
    const view = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.view.display'),
      AcApI18n.t('jig.chtml.keywords.view.global'),
      AcApI18n.t('jig.chtml.keywords.view.local')
    )
    const measure = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.measure.display'),
      AcApI18n.t('jig.chtml.keywords.measure.global'),
      AcApI18n.t('jig.chtml.keywords.measure.local')
    )
    prompt.keywords.default =
      defaults.viewerMode === 'view' ? view : measure

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.viewerMode
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.viewerMode
      }
      return result.stringResult === 'View' ? 'view' : 'measure'
    }
    return undefined
  }
}
