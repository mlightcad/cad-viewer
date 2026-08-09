import {
  accmYieldForPaint,
  AcDbProgressdEventArgs
} from '@mlightcad/data-model'

import { eventBus } from '../editor'
import { AcApI18n } from '../i18n'
import { AcApProgress } from './AcApProgress'
import { isOpenFileProgressComplete } from './openFileProgress'

/**
 * Manages the open-file progress overlay and normalized progress events.
 *
 * Listens to database open progress callbacks (wired by {@link AcApDocManager}),
 * normalizes monotonic percentages, updates the canvas overlay, and emits
 * `open-file-progress` on the global event bus.
 *
 * Overlay DOM updates are deduplicated: `show()` runs once per open, and
 * `setMessage` only when the localized stage text changes. Progress events
 * still emit on every callback so listeners see fine-grained percentages.
 *
 * When progressive scene convert is still draining after CONVERSION `END`,
 * the overlay stays up (see-through) until {@link setSceneBusyGate} reports
 * idle so geometry can appear under the spinner.
 */
export class AcApOpenFileProgressController {
  private readonly _progress: AcApProgress
  private _peak = 0
  private _stage?: AcDbProgressdEventArgs['stage']
  private _overlayVisible = false
  private _lastMessage = ''
  private _seeThrough = false
  private _sceneBusyGate?: () => boolean
  private _holdPollId?: ReturnType<typeof setTimeout>

  private static readonly OVERLAY_DEFAULT = 'rgba(0,0,0,0.45)'
  private static readonly OVERLAY_SEE_THROUGH = 'rgba(0,0,0,0.16)'

  /**
   * @param host - Canvas container that receives the progress overlay
   */
  constructor(host: HTMLElement) {
    this._progress = new AcApProgress({
      host,
      overlayColor: AcApOpenFileProgressController.OVERLAY_DEFAULT
    })
    this._progress.hide()
  }

  /**
   * When true, uses a lighter overlay so progressive geometry is visible
   * under the spinner during open.
   */
  setSeeThroughOverlay(enabled: boolean): void {
    this._seeThrough = enabled
    this._progress.setOverlayColor(
      enabled
        ? AcApOpenFileProgressController.OVERLAY_SEE_THROUGH
        : AcApOpenFileProgressController.OVERLAY_DEFAULT
    )
  }

  /**
   * Gate that returns true while the view still has entities to convert.
   * Used to keep the overlay until progressive scene convert finishes.
   */
  setSceneBusyGate(gate: (() => boolean) | undefined): void {
    this._sceneBusyGate = gate
  }

  /**
   * Resets tracked progress for a new open operation.
   */
  reset(): void {
    this.clearHoldPoll()
    this._peak = 0
    this._stage = undefined
    this._overlayVisible = false
    this._lastMessage = ''
  }

  /**
   * Shows the open-file overlay immediately and yields so it can paint before
   * main-thread DXF parse work blocks the UI (native converter path).
   */
  async beginOpen(database: AcDbProgressdEventArgs['database']): Promise<void> {
    this.handle({
      database,
      percentage: 0,
      stage: 'CONVERSION',
      subStage: 'START',
      subStageStatus: 'START'
    })
    await accmYieldForPaint()
  }

  /**
   * Normalizes progress, emits `open-file-progress`, and updates the overlay.
   *
   * @returns Normalized progress payload (monotonic percentage)
   */
  handle(data: AcDbProgressdEventArgs): AcDbProgressdEventArgs {
    const progress = this.normalize(data)
    eventBus.emit('open-file-progress', progress)
    this.updateOverlay(progress)
    return progress
  }

  /**
   * Returns monotonic open-file progress for UI display.
   *
   * Entity conversion reports 0–100% within the ENTITY sub-stage while the
   * pipeline accumulator is still ~33%; sub-stage END callbacks can therefore
   * briefly report a lower percentage after IN-PROGRESS already reached 100%.
   */
  private normalize(data: AcDbProgressdEventArgs): AcDbProgressdEventArgs {
    const stage = data.stage
    if (stage !== this._stage) {
      if (this._stage === 'FETCH_FILE' && stage === 'CONVERSION') {
        this._peak = 0
      }
      this._stage = stage
    }
    this._peak = Math.max(this._peak, data.percentage)
    return { ...data, percentage: this._peak }
  }

  private resolveMessage(data: AcDbProgressdEventArgs): string | undefined {
    if (data.stage === 'CONVERSION') {
      if (data.subStage) {
        const key =
          'main.progress.' + data.subStage.replace(/_/g, '').toLowerCase()
        return AcApI18n.t(key)
      }
      return undefined
    }
    if (data.stage === 'FETCH_FILE') {
      return AcApI18n.t('main.message.fetchingDrawingFile')
    }
    return undefined
  }

  private updateOverlay(data: AcDbProgressdEventArgs): void {
    if (isOpenFileProgressComplete(data)) {
      if (this._sceneBusyGate?.()) {
        this.holdUntilSceneIdle()
        return
      }
      this.hideAndReset()
      return
    }

    this.clearHoldPoll()

    if (!this._overlayVisible) {
      this._progress.show()
      this._overlayVisible = true
      if (this._seeThrough) {
        this._progress.setOverlayColor(
          AcApOpenFileProgressController.OVERLAY_SEE_THROUGH
        )
      }
    }

    const message = this.resolveMessage(data)
    if (message != null && message !== this._lastMessage) {
      this._progress.setMessage(message)
      this._lastMessage = message
    }
  }

  private holdUntilSceneIdle(): void {
    if (!this._overlayVisible) {
      this._progress.show()
      this._overlayVisible = true
    }
    this._progress.setOverlayColor(
      AcApOpenFileProgressController.OVERLAY_SEE_THROUGH
    )
    const message = AcApI18n.t('main.progress.rendering')
    if (message !== this._lastMessage) {
      this._progress.setMessage(message)
      this._lastMessage = message
    }

    if (this._holdPollId != null) {
      return
    }

    const poll = () => {
      if (this._sceneBusyGate?.()) {
        this._holdPollId = setTimeout(poll, 50)
        return
      }
      this._holdPollId = undefined
      this.hideAndReset()
    }
    this._holdPollId = setTimeout(poll, 50)
  }

  private hideAndReset(): void {
    this.clearHoldPoll()
    this._progress.hide()
    this.reset()
  }

  private clearHoldPoll(): void {
    if (this._holdPollId != null) {
      clearTimeout(this._holdPollId)
      this._holdPollId = undefined
    }
  }
}
