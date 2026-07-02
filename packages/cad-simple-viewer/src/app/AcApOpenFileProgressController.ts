import { AcDbProgressdEventArgs } from '@mlightcad/data-model'

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
 */
export class AcApOpenFileProgressController {
  private readonly _progress: AcApProgress
  private _peak = 0
  private _stage?: AcDbProgressdEventArgs['stage']

  /**
   * @param host - Canvas container that receives the progress overlay
   */
  constructor(host: HTMLElement) {
    this._progress = new AcApProgress({ host })
    this._progress.hide()
  }

  /**
   * Resets tracked progress for a new open operation.
   */
  reset(): void {
    this._peak = 0
    this._stage = undefined
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

  private updateOverlay(data: AcDbProgressdEventArgs): void {
    if (data.stage === 'CONVERSION') {
      if (data.subStage) {
        const key =
          'main.progress.' + data.subStage.replace(/_/g, '').toLowerCase()
        this._progress.setMessage(AcApI18n.t(key))
      }
    } else if (data.stage === 'FETCH_FILE') {
      this._progress.setMessage(AcApI18n.t('main.message.fetchingDrawingFile'))
    }

    if (isOpenFileProgressComplete(data)) {
      this._progress.hide()
      this.reset()
    } else {
      this._progress.show()
    }
  }
}
