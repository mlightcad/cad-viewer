import type { AcApDocManager } from '../AcApDocManager'
import { AcApDefaultNotificationUi } from './AcApDefaultNotificationUi'
import { AcApNotificationEventBridge } from './AcApNotificationEventBridge'
import { AcApNotificationStore } from './AcApNotificationStore'
import type { AcApNotificationCenter } from './AcApNotificationTypes'

/**
 * Options for {@link AcApNotificationService.install} /
 * {@link acapInstallNotificationService}.
 */
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
  /** Currently active center (built-in store or host adapter). */
  private _center: AcApNotificationCenter = new AcApNotificationStore()
  /** Built-in store instance used when no custom center is installed. */
  private _defaultStore = this._center as AcApNotificationStore
  /** Optional default DOM bell / panel. */
  private _defaultUi?: AcApDefaultNotificationUi
  /** Shared event bridge that writes into {@link _center}. */
  private _bridge?: AcApNotificationEventBridge
  /** Explicit host for the default UI, when provided at install time. */
  private _host?: HTMLElement
  /** Whether the built-in DOM UI should be mounted when not overridden. */
  private _showDefaultUi = true
  /** `true` when {@link _center} is a host-supplied override. */
  private _isCustom = false
  /** Document manager last passed to {@link install}. */
  private _docManager?: AcApDocManager

  /**
   * Installs bridge + default UI for a document manager instance.
   * Safe to call once per {@link AcApDocManager.createInstance}.
   *
   * @param docManager - Manager whose sessions and events are observed.
   * @param options - Bridge / UI install flags.
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

  /**
   * Active notification center (built-in or host override).
   */
  get center(): AcApNotificationCenter {
    return this._center
  }

  /**
   * Whether a host-supplied center is currently installed.
   */
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

  /**
   * Restores the built-in store and remounts the default UI when enabled.
   */
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

  /**
   * Resolves the DOM host for the default bell / panel.
   *
   * @returns Explicit host, view container, or `document.body`.
   */
  private resolveHost(): HTMLElement {
    if (this._host) return this._host
    const viewContainer = this._docManager?.curView?.container
    if (viewContainer) return viewContainer
    return document.body
  }

  /**
   * Mounts (or remounts) {@link AcApDefaultNotificationUi} on {@link resolveHost}.
   */
  private mountDefaultUi() {
    this.disposeDefaultUi()
    if (typeof document === 'undefined') return
    this._defaultUi = new AcApDefaultNotificationUi(
      this._center,
      this.resolveHost()
    )
  }

  /**
   * Tears down the default DOM UI if present.
   */
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

/** Process-wide notification service singleton. */
const notificationService = new AcApNotificationService()

/**
 * Returns the active notification center (built-in or host override).
 *
 * @returns The center currently owned by the service.
 */
export function acapNotificationCenter(): AcApNotificationCenter {
  return notificationService.center
}

/**
 * Installs / replaces the host notification center.
 *
 * Pass `null` to restore the built-in DOM notification center.
 *
 * @param center - Custom center adapter, or `null` to restore the default.
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
 *
 * @param docManager - Manager to bind the bridge to.
 * @param options - Bridge / UI install flags.
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

/**
 * Process-wide service instance (bridge + center + optional default UI).
 */
export { notificationService as acapNotificationService }
