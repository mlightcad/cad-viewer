import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'

import { AcApHtmlConvertor } from './AcApHtmlConvertor'
import {
  type AcApHtmlExportOptions,
  ACEX_MAX_CHUNK_SIZE_MIB,
  ACEX_MIN_CHUNK_SIZE_MIB,
  acexChunkSizeBytesToMiB,
  acexChunkSizeMiBToBytes,
  clampAcApHtmlChunkSizeMiB,
  resolveAcApHtmlExportOptions
} from './AcApHtmlExportOptions'
import type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions'

/**
 * Editor command that exports the active drawing as a self-contained HTML file
 * using command-line prompts (`-chtml`).
 *
 * The command delegates to {@link AcApHtmlConvertor}, which serializes the
 * current Three.js scene into an {@link AcExSnapshot} HTML snapshot,
 * bundles the offline viewer runtime, and triggers a browser download.
 */
export class AcApExportHtmlCmd extends AcEdCommand {
  /**
   * @param pluginOptions - HTML plugin options (e.g. `viewerRuntimeUrl`)
   */
  constructor(private readonly pluginOptions: AcApHtmlPluginOptions = {}) {
    super()
  }

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

    const converter = new AcApHtmlConvertor(this.pluginOptions)
    await converter.convert(
      context.doc.fileName || context.doc.docTitle,
      options,
      context.view
    )
  }

  private async promptOptions(): Promise<AcApHtmlExportOptions | undefined> {
    const defaults = resolveAcApHtmlExportOptions()

    const exportFormat = await this.promptExportFormat()
    if (exportFormat === undefined) {
      return undefined
    }

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

    const background = await this.promptBackground()
    if (background === undefined) {
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

    let maxChunkBytes: number | undefined
    let compressChunks: boolean | undefined
    if (exportFormat === 'multi') {
      maxChunkBytes = await this.promptChunkSizeMiB()
      if (maxChunkBytes === undefined) {
        return undefined
      }

      compressChunks = await this.promptYesNo(
        'jig.chtml.compressChunks',
        defaults.compressChunks
      )
      if (compressChunks === undefined) {
        return undefined
      }
    }

    return resolveAcApHtmlExportOptions({
      exportFormat,
      exportInvisibleLayers,
      exportLayouts,
      background,
      initialView,
      viewerMode,
      ...(exportFormat === 'multi' ? { maxChunkBytes, compressChunks } : {})
    })
  }

  private async promptExportFormat(): Promise<
    AcApHtmlExportOptions['exportFormat'] | undefined
  > {
    const defaults = resolveAcApHtmlExportOptions()
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chtml.exportFormat')
    )
    prompt.allowNone = true
    const single = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.single.display'),
      AcApI18n.t('jig.chtml.keywords.single.global'),
      AcApI18n.t('jig.chtml.keywords.single.local')
    )
    const multi = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.multi.display'),
      AcApI18n.t('jig.chtml.keywords.multi.global'),
      AcApI18n.t('jig.chtml.keywords.multi.local')
    )
    prompt.keywords.default = defaults.exportFormat === 'multi' ? multi : single

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.exportFormat
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.exportFormat
      }
      return result.stringResult === 'Multi' ? 'multi' : 'single'
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

  private async promptChunkSizeMiB(): Promise<number | undefined> {
    const defaults = resolveAcApHtmlExportOptions({ exportFormat: 'multi' })
    const defaultMiB = acexChunkSizeBytesToMiB(defaults.maxChunkBytes)
    const prompt = new AcEdPromptIntegerOptions(
      AcApI18n.t('jig.chtml.chunkSizeMiB'),
      ACEX_MIN_CHUNK_SIZE_MIB,
      ACEX_MAX_CHUNK_SIZE_MIB
    )
    prompt.allowNone = true
    prompt.allowZero = false
    prompt.allowNegative = false
    prompt.useDefaultValue = true
    prompt.defaultValue = defaultMiB

    const result = await AcApDocManager.instance.editor.getInteger(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return acexChunkSizeMiBToBytes(defaultMiB)
    }
    if (result.status === AcEdPromptStatus.OK) {
      const miB = clampAcApHtmlChunkSizeMiB(result.value ?? defaultMiB)
      return acexChunkSizeMiBToBytes(miB)
    }
    return undefined
  }

  private async promptBackground(): Promise<
    AcApHtmlExportOptions['background'] | undefined
  > {
    const defaults = resolveAcApHtmlExportOptions()
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chtml.background')
    )
    prompt.allowNone = true
    const black = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.black.display'),
      AcApI18n.t('jig.chtml.keywords.black.global'),
      AcApI18n.t('jig.chtml.keywords.black.local')
    )
    const white = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.white.display'),
      AcApI18n.t('jig.chtml.keywords.white.global'),
      AcApI18n.t('jig.chtml.keywords.white.local')
    )
    const space = prompt.keywords.add(
      AcApI18n.t('jig.chtml.keywords.space.display'),
      AcApI18n.t('jig.chtml.keywords.space.global'),
      AcApI18n.t('jig.chtml.keywords.space.local')
    )
    prompt.keywords.default =
      defaults.background === 'white'
        ? white
        : defaults.background === 'space'
          ? space
          : black

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return undefined
    }
    if (result.status === AcEdPromptStatus.None) {
      return defaults.background
    }
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (!result.stringResult) {
        return defaults.background
      }
      if (result.stringResult === 'White') return 'white'
      if (result.stringResult === 'Space') return 'space'
      return 'black'
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
