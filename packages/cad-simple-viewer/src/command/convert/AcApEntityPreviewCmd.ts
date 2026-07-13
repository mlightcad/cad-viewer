import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDoubleOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcTrView2d } from '../../view'
import { AcApEntityPreviewConvertor } from './AcApEntityPreviewConvertor'

const DEFAULT_LONG_SIDE_PX = 512

/**
 * Command that exports a merged preview image for one or more selected entities.
 */
export class AcApEntityPreviewCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  /**
   * Prompts for entity selection and preview size, then downloads the PNG.
   *
   * @param context - Current application context
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    let objectIds = selectionSet.count > 0 ? selectionSet.ids : []

    if (objectIds.length === 0) {
      const options = new AcEdPromptSelectionOptions(
        AcApI18n.sysCmdPrompt('entout')
      )
      const selectionResult =
        await AcApDocManager.instance.editor.getSelection(options)
      if (
        selectionResult.status !== AcEdPromptStatus.OK ||
        !selectionResult.value ||
        selectionResult.value.count === 0
      ) {
        return
      }
      objectIds = selectionResult.value.ids
    }

    const longSidePrompt = new AcEdPromptDoubleOptions(
      `${AcApI18n.t('jig.entout.longSidePrompt')} <${DEFAULT_LONG_SIDE_PX}>`
    )
    longSidePrompt.allowNone = true
    longSidePrompt.allowNegative = false
    longSidePrompt.allowZero = false
    longSidePrompt.defaultValue = DEFAULT_LONG_SIDE_PX
    longSidePrompt.useDefaultValue = true
    const longSideResult =
      await AcApDocManager.instance.editor.getDouble(longSidePrompt)

    if (
      longSideResult.status === AcEdPromptStatus.Cancel ||
      longSideResult.status === AcEdPromptStatus.Error
    ) {
      return
    }

    const longSide =
      longSideResult.status === AcEdPromptStatus.OK &&
      longSideResult.value !== undefined
        ? longSideResult.value
        : DEFAULT_LONG_SIDE_PX

    const view = AcApDocManager.instance.curView as AcTrView2d
    this.syncActiveLayoutViewSize(view)

    const result = await this.withBusyIndicator(
      () => new AcApEntityPreviewConvertor().export(objectIds, longSide),
      AcApI18n.t('main.message.exportingEntityPreview')
    )
    if (result.ok) {
      let message = `${result.exportedCount} ${AcApI18n.t('jig.entout.exported')}`
      if (result.skippedCount > 0) {
        message += `, ${result.skippedCount} ${AcApI18n.t('jig.entout.skipped')}`
      }
      this.showMessage(message, 'success')
      return
    }

    this.showMessage(AcApI18n.t(`jig.entout.failed.${result.reason}`), 'error')
  }

  /**
   * Keeps active layout-view size in sync with current view size.
   */
  private syncActiveLayoutViewSize(view: AcTrView2d) {
    const layoutView = view.activeLayoutView
    if (!layoutView) {
      return
    }

    layoutView.resize(view.width, view.height)
  }
}
