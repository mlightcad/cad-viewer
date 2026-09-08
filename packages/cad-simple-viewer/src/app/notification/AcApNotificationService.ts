import { AcApDefaultNotificationUi } from './AcApDefaultNotificationUi'
import { AcApNotificationEventBridge } from './AcApNotificationEventBridge'
import { AcApNotificationStore } from './AcApNotificationStore'
import type { AcApNotificationCenter } from './AcApNotificationTypes'
import type { AcApDocManager } from '../AcApDocManager'

export interface AcApNotificationServiceOptions {
  /**
   * Host element for the built-in notification bell/panel.
   * Defaults to the active view canvas container (`curView.container`) so the
   * chrome is positioned relative to the drawing area, not the browser window.
   */
  host?: HTMLElement
  /**
   * When `false`, skips installing the built-in DOM UI (bridge still runs so a
   * later custom center receives events). Default `true`.
   */
  showDefaultUi?: boolean
  /**
   * When `false`, skips the event bridge entirely. Default `true`.
   */
  enableBridge?: boolean
}

/**
 * Owns the active {@link AcApNotificationCenter}, optional default DOM UI, and
 * the shared event bridge.
 *
 * Hosts override the center with {@link acapSetNotificationCenter}; passing
 * `null` restores the built-in store + UI.
 */
class AcApNotificationService {
  private _center: AcApNotificationCenter = new AcApNotificationStore()
  private _defaultStore = this._center as AcApNotificationStore
  private _defaultUi?: AcApDefaultNotificationUi
  private _bridge?: AcApNotificationEventBridge
  private _host?: HTMLElement
  private _showDefaultUi = true
  private _isCustom = false
  private _docManager?: AcApDocManager

  /**
   * Installs bridge + default UI for a document manager instance.
   * Safe to call once per {@link AcApDocManager.createInstance}.
   */
  install(docManager: AcApDocManager, options: AcApNotificationServiceOptions = {}) {
    this._docManager = docManager
    this._host = options.host
    this._showDefaultUi = options.showDefaultUi !== false

    if (options.enableBridge !== false) {
      this._bridge?.uninstall()
      this._bridge = new AcApNotificationEventBridge(docManager, () =>
        this.center
      )
      this._bridge.install()
    } else {
      this._center.setActiveSession(docManager.activeSessionId)
    }

    if (!this._isCustom && this._showDefaultUi) {
      this.mountDefaultUi()
    }
  }

  get center(): AcApNotificationCenter {
    return this._center
  }

  get isCustom(): boolean {
    return this._isCustom
  }

  /**
   * Replaces the active notification center.
   *
   * @param center - Custom center, or `null` to restore the built-in default.
   */
  setCenter(center: AcApNotificationCenter | null) {
    if (center == null) {
      this.restoreDefault()
      return
    }
    if (this._center === center) return

    this.disposeDefaultUi()
    if (!this._isCustom) {
      this._defaultStore.dispose()
    } else {
      this._center.dispose?.()
    }

    this._center = center
    this._isCustom = true
    if (this._docManager) {
      this._center.setActiveSession(this._docManager.activeSessionId)
    }
  }

  private restoreDefault() {
    if (!this._isCustom) {
      if (this._showDefaultUi && !this._defaultUi) {
        this.mountDefaultUi()
      }
      return
    }

    this._center.dispose?.()
    this._defaultStore = new AcApNotificationStore()
    this._center = this._defaultStore
    this._isCustom = false
    if (this._docManager) {
      this._center.setActiveSession(this._docManager.activeSessionId)
    }
    if (this._showDefaultUi) {
      this.mountDefaultUi()
    }
  }

  private resolveHost(): HTMLElement {
    if (this._host) return this._host
    const viewContainer = this._docManager?.curView?.container
    if (viewContainer) return viewContainer
    return document.body
  }

  private mountDefaultUi() {
    this.disposeDefaultUi()
    if (typeof document === 'undefined') return
    this._defaultUi = new AcApDefaultNotificationUi(
      this._center,
      this.resolveHost()
    )
  }

  private disposeDefaultUi() {
    this._defaultUi?.dispose()
    this._defaultUi = undefined
  }

  /**
   * Tears down bridge and UI (e.g. DocManager destroy).
   *
   * Resets to a fresh built-in store so a later {@link install} / host
   * {@link setCenter} does not reuse a disposed custom center instance.
   */
  dispose() {
    this._bridge?.uninstall()
    this._bridge = undefined
    this.disposeDefaultUi()
    this._center.dispose?.()
    this._defaultStore = new AcApNotificationStore()
    this._center = this._defaultStore
    this._isCustom = false
    this._docManager = undefined
    this._host = undefined
    this._showDefaultUi = true
  }
}

const notificationService = new AcApNotificationService()

/**
 * Returns the active notification center (built-in or host override).
 */
export function acapNotificationCenter(): AcApNotificationCenter {
  return notificationService.center
}

/**
 * Installs / replaces the host notification center.
 *
 * Pass `null` to restore the built-in DOM notification center.
 *
 * @example
 * ```ts
 * // cad-viewer
 * acapSetNotificationCenter(vueNotificationAdapter)
 *
 * // later / on unmount
 * acapSetNotificationCenter(null)
 * ```
 */
export function acapSetNotificationCenter(
  center: AcApNotificationCenter | null
) {
  notificationService.setCenter(center)
}

/**
 * @internal Used by {@link AcApDocManager}.
 */
export function acapInstallNotificationService(
  docManager: AcApDocManager,
  options?: AcApNotificationServiceOptions
) {
  notificationService.install(docManager, options)
}

/**
 * @internal Used by {@link AcApDocManager.destroy}.
 */
export function acapDisposeNotificationService() {
  notificationService.dispose()
}

export { notificationService as acapNotificationService }
