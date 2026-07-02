import { eventBus } from '../editor'
import { yieldToMain } from '../util/yieldToMain'
import { AcApProgress } from './AcApProgress'

/**
 * Reference-counted busy overlay for long-running application operations.
 *
 * Used by commands and plugins during blocking work such as export or conversion.
 * Emits {@link eventBus} `busy-indicator` events so host UI can stay in sync.
 */
export class AcApBusyIndicator {
  private readonly _progress: AcApProgress
  private _refCount = 0
  private _message = ''

  /**
   * @param host - Element that receives the overlay (typically canvas or viewer shell)
   */
  constructor(host: HTMLElement) {
    this._progress = new AcApProgress({ host })
    this._progress.hide()
  }

  /**
   * Shows the busy overlay, optionally with a message.
   *
   * Nested calls increment an internal reference count; the overlay stays visible
   * until the outermost matching {@link hide} runs.
   */
  show(message?: string): void {
    if (message !== undefined) {
      this._message = message
    } else if (this._refCount === 0) {
      this._message = ''
    }

    this._refCount++
    if (this._refCount === 1) {
      this._progress.setMessage(this._message)
      this._progress.show()
      this.emitEvent(true)
    } else if (message !== undefined) {
      this._progress.setMessage(message)
      this.emitEvent(true)
    }
  }

  /**
   * Hides the busy overlay started by {@link show}.
   *
   * No-op when the reference count is already zero.
   */
  hide(): void {
    if (this._refCount <= 0) {
      return
    }

    this._refCount--
    if (this._refCount === 0) {
      this._message = ''
      this._progress.hide()
      this.emitEvent(false)
    }
  }

  /**
   * Updates the message on the active busy overlay.
   */
  setMessage(message: string): void {
    this._message = message
    if (this._refCount > 0) {
      this._progress.setMessage(message)
      this.emitEvent(true)
    }
  }

  /**
   * Runs {@link work} while the busy overlay is visible.
   *
   * Yields to the browser after {@link show} so the overlay can paint before
   * synchronous work blocks the main thread.
   */
  async withBusyIndicator<T>(
    work: () => T | Promise<T>,
    message?: string
  ): Promise<T> {
    this.show(message)
    try {
      await yieldToMain()
      return await work()
    } finally {
      this.hide()
    }
  }

  private emitEvent(visible: boolean): void {
    eventBus.emit('busy-indicator', {
      visible,
      message: visible ? this._message || undefined : undefined
    })
  }
}
