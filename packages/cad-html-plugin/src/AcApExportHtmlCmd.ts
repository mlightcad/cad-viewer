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
import type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions'

/** Options for {@link AcApExportHtmlCmd}. */
export interface AcApExportHtmlCmdOptions {
  /** Plugin options (e.g. `viewerRuntimeUrl`). */
  pluginOptions?: AcApHtmlPluginOptions
  /**
   * When true, prompts for export options on the command line (`-chtml`).
   * When false, exports immediately with {@link resolveAcApHtmlExportOptions}
   * defaults (`chtml` in hosts without a dialog command).
   *
   * @default true
   */
  interactive?: boolean
}

/**
 * Editor command that exports the active drawing as a self-contained HTML file.
 *
 * - Interactive mode (`-chtml`): command-line keyword prompts.
 * - Non-interactive mode (`chtml` without a UI dialog): export with defaults,
 *   matching one-click toolbar UX (similar to `cpdf`).
 *
 * The command delegates to {@link AcApHtmlConvertor}, which serializes the
 * current Three.js scene into an {@link AcExSnapshot} HTML snapshot,
 * bundles the offline viewer runtime, and triggers a browser download.
 */
export class AcApExportHtmlCmd extends AcEdCommand {
  private readonly pluginOptions: AcApHtmlPluginOptions
  private readonly interactive: boolean

  /**
   * @param options - Plugin options and whether to prompt for export settings.
   *   Passing {@link AcApHtmlPluginOptions} alone is treated as interactive
   *   (`-chtml`) for backward compatibility.
   */
  constructor(options: AcApExportHtmlCmdOptions | AcApHtmlPluginOptions = {}) {
    super()
    if (isLegacyPluginOptionsOnly(options)) {
      this.pluginOptions = options
      this.interactive = true
    } else {
      this.pluginOptions = options.pluginOptions ?? {}
      this.interactive = options.interactive !== false
    }
  }

  /**
   * Runs the HTML export workflow for the drawing in `context`.
   *
   * @param context - Active application context used for prompts and export.
   * @returns Resolves when the HTML file has been generated and the download
   *   has been initiated, or rejects if runtime loading or packaging fails.
   */
  async execute(context: AcApContext) {
    const options = this.interactive
      ? await this.promptOptions()
      : resolveAcApHtmlExportOptions()
    if (!options) {
      return
    }

    const converter = new AcApHtmlConvertor(this.pluginOptions)
    await converter.convert(
      context.doc.fileName || context.doc.docTitle,
      options,
      context.view
    )
  }

  private async promptOptions(): Promise<AcApHtmlExportOptions | undefined> {
    const defaults = resolveAcApHtmlExportOptions()

    const exportInvisibleLayers = await this.promptYesNo(
      'jig.chtml.exportInvisibleLayers',
      defaults.exportInvisibleLayers
    )
    if (exportInvisibleLayers === undefined) {
      return undefined
    }

    const exportLayouts = await this.promptYesNo(
      'jig.chtml.exportLayouts',
      defaults.exportLayouts
    )
    if (exportLayouts === undefined) {
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
      exportLayouts,
      initialView,
      viewerMode
    })
  }

  private async promptYesNo(
    messageKey: string,
    defaultYes: boolean
  ): Promise<boolean | undefined> {
    const prompt = new AcEdPromptKeywordOptions(AcApI18n.t(messageKey))
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

  private async promptInitialView(): Promise<
    AcApHtmlExportOptions['initialView'] | undefined
  > {
    const defaults = resolveAcApHtmlExportOptions()
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chtml.initialView')
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
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chtml.viewerMode')
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
    prompt.keywords.default = defaults.viewerMode === 'view' ? view : measure

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

/** True when `options` is only {@link AcApHtmlPluginOptions} (no cmd wrappers). */
function isLegacyPluginOptionsOnly(
  options: AcApExportHtmlCmdOptions | AcApHtmlPluginOptions
): options is AcApHtmlPluginOptions {
  return !('interactive' in options) && !('pluginOptions' in options)
}
