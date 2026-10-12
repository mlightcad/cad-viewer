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
 * Progressive open (`setSeeThroughOverlay(true)`): shows a pointer-blocking
 * overlay through FETCH_FILE and the full CONVERSION pipeline (parse, header,
 * symbol tables, blocks, entities). Hides at CONVERSION `END` so pan/zoom can
 * run while scene geometry finishes — no "Rendering drawing ..." hold.
 *
 * Default open keeps "Rendering drawing ..." until {@link setSceneBusyGate}
 * reports idle after CONVERSION `END`. Deprecated `waitForTextGeometry` is
 * ignored.
 */
export class AcApOpenFileProgressController {
  private readonly _progress: AcApProgress
  private _peak = 0
  private _stage?: AcDbProgressdEventArgs['stage']
  private _overlayVisible = false
  private _lastMessage = ''
  private _seeThrough = false
  /**
   * True after CONVERSION/`END` for this open. Distinguishes the leading
   * FETCH_FILE END (download done) from the trailing one after openUri.
   */
  private _conversionEnded = false
  private _sceneBusyGate?: () => boolean
  /** Callback invoked after the overlay is hidden. */
  private _onHidden?: () => void
  private _holdPollId?: ReturnType<typeof setTimeout>
  /** Consecutive idle polls while holding the overlay after CONVERSION END. */
  private _holdIdleStreak = 0

  private static readonly OVERLAY_DEFAULT = 'rgba(0,0,0,0.45)'
  private static readonly OVERLAY_SEE_THROUGH = 'rgba(0,0,0,0.16)'
  /** Match {@link AcTrView2d.waitUntilIdle}: require two idle samples. */
  private static readonly HOLD_IDLE_STREAK = 2
  private static readonly HOLD_POLL_MS = 50

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
   * Moves the overlay onto another host (e.g. the canvas being opened).
   *
   * @param host - New parent element for the overlay.
   */
  setHost(host: HTMLElement): void {
    this._progress.setHost(host)
  }

  /**
   * Enables progressive open overlay policy: block UI until CONVERSION ends,
   * then hide so pan/zoom work while scene convert continues. Progress still
   * emits on the event bus for the status bar.
   */
  setSeeThroughOverlay(enabled: boolean): void {
    this._seeThrough = enabled
    this._progress.setOverlayColor(
      AcApOpenFileProgressController.OVERLAY_DEFAULT
    )
    // Capture pointers while visible so ribbon/canvas cannot be used mid-open.
    this._progress.setPointerEventsBlocked(true)
  }

  /**
   * Gate that returns true while the view still has entities to convert.
   * Used to keep the overlay until scene convert finishes (not deferred text).
   */
  setSceneBusyGate(gate: (() => boolean) | undefined): void {
    this._sceneBusyGate = gate
  }

  /**
   * Called after the overlay is hidden (open finished or cancelled).
   *
   * @param callback - Handler, or `undefined` to clear.
   */
  setOnHidden(callback: (() => void) | undefined): void {
    this._onHidden = callback
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
    this._conversionEnded = false
    this._holdIdleStreak = 0
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
    if (
      data.stage === 'CONVERSION' &&
      data.subStage === 'END' &&
      data.subStageStatus === 'END'
    ) {
      this._conversionEnded = true
    }
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
    if (isOpenFileProgressComplete(data, this._conversionEnded)) {
      // Progressive: unlock as soon as parse/conversion finishes — do not wait
      // for scene convert ("Rendering drawing ...").
      if (this._seeThrough || !this._sceneBusyGate?.()) {
        this.hideAndReset()
        return
      }
      this.holdUntilSceneIdle()
      return
    }

    this.clearHoldPoll()
    this._progress.setPointerEventsBlocked(true)
    this.showOverlayWithMessage(data)
  }

  private showOverlayWithMessage(data: AcDbProgressdEventArgs): void {
    if (!this._overlayVisible) {
      this._progress.show()
      this._overlayVisible = true
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

    this._holdIdleStreak = 0
    const poll = () => {
      if (this._sceneBusyGate?.()) {
        this._holdIdleStreak = 0
        this._holdPollId = setTimeout(
          poll,
          AcApOpenFileProgressController.HOLD_POLL_MS
        )
        return
      }
      this._holdIdleStreak++
      if (
        this._holdIdleStreak < AcApOpenFileProgressController.HOLD_IDLE_STREAK
      ) {
        this._holdPollId = setTimeout(
          poll,
          AcApOpenFileProgressController.HOLD_POLL_MS
        )
        return
      }
      this._holdPollId = undefined
      this._holdIdleStreak = 0
      this.hideAndReset()
    }
    this._holdPollId = setTimeout(
      poll,
      AcApOpenFileProgressController.HOLD_POLL_MS
    )
  }

  private hideAndReset(): void {
    this.clearHoldPoll()
    this._progress.hide()
    this._overlayVisible = false
    this._lastMessage = ''
    this._holdIdleStreak = 0
    // Keep `_conversionEnded` / `_peak` / `_stage` for this open so a trailing
    // FETCH_FILE END after openUri still counts as complete and does not
    // re-show the spinner. Full {@link reset} runs on the next document open.
    this._onHidden?.()
  }

  private clearHoldPoll(): void {
    if (this._holdPollId != null) {
      clearTimeout(this._holdPollId)
      this._holdPollId = undefined
    }
    this._holdIdleStreak = 0
  }
}
