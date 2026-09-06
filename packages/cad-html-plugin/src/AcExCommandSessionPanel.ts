import {
  ACEX_DOCS_PATH_MAGNIFIER,
  acexDocsUrl
} from './AcExDocsUrl'
import { acexHtmlIsPhoneLayout } from './AcExHtmlDrawerSheet'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { ML_UI_MOBILE_MAX_WIDTH } from './AcExHtmlShell'
import {
  AcUiMobileSessionPanel,
  type AcUiMobileSessionPanelLabels
} from './AcExHtmlSimpleViewerUi'

/** Keyword / action chip on the offline HTML session panel. */
export interface AcExCommandSessionChip {
  /** Stable id (`undo`, `close`, …). */
  id: string
  /** Visible label. */
  label: string
}

/** Live metric row; omitted when the tool has no rubber-band yet. */
export interface AcExCommandSessionMetrics {
  hasBasePoint: boolean
  lengthText: string
  angleText: string
  dxText: string
  dyText: string
  xText: string
  yText: string
}

/**
 * State for {@link AcExCommandSessionPanel}. `null` hides the panel.
 */
export interface AcExCommandSessionUiState {
  prompt: string
  confirmEnabled: boolean
  metrics: AcExCommandSessionMetrics | null
  chips: AcExCommandSessionChip[]
}

/** Click handlers for confirm / cancel / chips. */
export interface AcExCommandSessionPanelHandlers {
  onConfirm: () => void
  onCancel: () => void
  onChip: (id: string) => void
}

/** Widget mounted at the top of the session panel (left of the help icon). */
export interface AcExSessionAccessory {
  /** Stable id so a re-show can replace rather than stack. */
  id: string
  /** Called when the session panel is shown. `host` is the accessory content slot. */
  mount(host: HTMLElement): void
  /** Called on hide or when a different accessory replaces this one. */
  unmount(): void
}

/**
 * Bottom session panel for the offline HTML viewer.
 *
 * Thin adapter around shared {@link AcUiMobileSessionPanel}.
 */
export class AcExCommandSessionPanel {
  private readonly panel: AcUiMobileSessionPanel
  private readonly i18n: AcExHtmlI18n
  private readonly rootEl: HTMLElement
  private handlers: AcExCommandSessionPanelHandlers | null = null
  private lastState: AcExCommandSessionUiState | null = null
  private accessory: AcExSessionAccessory | null = null
  private layoutMql: MediaQueryList | null = null
  private readonly onLayoutChange = () => {
    if (this.lastState) this.applyState(this.lastState)
  }

  /**
   * @param host - Element that receives the overlay (typically `#mlcad-canvas-host`
   *   or `#mlcad-root`).
   * @param i18n - Offline HTML i18n.
   */
  constructor(host: HTMLElement, i18n: AcExHtmlI18n) {
    this.i18n = i18n
    this.rootEl = host
    this.syncCollapsedHeightVar()

    this.panel = new AcUiMobileSessionPanel({
      host,
      activeClass: 'ml-mobile-cmd-active',
      isPhoneLayout: acexHtmlIsPhoneLayout,
      helpDocsUrl: () =>
        acexDocsUrl(ACEX_DOCS_PATH_MAGNIFIER, this.i18n.locale),
      helpHost: () => document.getElementById('mlcad-root') ?? document.body,
      labels: () => sessionLabels(this.i18n)
    })

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.layoutMql = window.matchMedia(
        `(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`
      )
      this.layoutMql.addEventListener('change', this.onLayoutChange)
    }
  }

  /** Underlying shared panel root (for drawer inset measurement). */
  get panelElement(): HTMLElement | null {
    return this.rootEl.querySelector('.ml-mobile-cmd-panel')
  }

  /** Whether the session panel is currently shown. */
  get isOpen(): boolean {
    return this.panel.isOpen
  }

  /** Wires confirm / cancel / chip clicks. */
  setHandlers(handlers: AcExCommandSessionPanelHandlers | null): void {
    this.handlers = handlers
  }

  /** Applies session UI or hides the panel when `state` is null. */
  setState(state: AcExCommandSessionUiState | null): void {
    this.lastState = state
    const active = state != null
    document
      .getElementById('mlcad-root')
      ?.classList.toggle('mlcad-session-active', active)

    const statusEl = document.getElementById('mlcad-status-bar')
    if (statusEl) {
      // Session prompt lives in the panel; avoid a duplicate top banner.
      if (active) {
        statusEl.hidden = true
        statusEl.textContent = ''
      }
    }

    if (!state) {
      this.setAccessory(null)
      this.panel.hide()
      return
    }

    this.applyState(state)
  }

  /**
   * Mounts widgets at the top of the session panel (left of the help icon).
   * Pass `null` to clear custom content; the help icon remains while the
   * panel is open. Same `id` is a no-op so live metric updates do not remount.
   */
  setAccessory(next: AcExSessionAccessory | null): void {
    if ((this.accessory?.id ?? null) === (next?.id ?? null)) return
    this.accessory?.unmount()
    this.panel.clearAccessory()
    this.accessory = next
    if (next) {
      this.panel.prepareAccessory()
      next.mount(this.panel.accessoryHost)
    }
  }

  /** Re-applies metric labels after a locale change. */
  refreshLabels(): void {
    this.panel.refreshLabels()
    if (this.lastState) this.applyState(this.lastState)
  }

  /** Removes listeners and DOM. */
  dispose(): void {
    this.layoutMql?.removeEventListener('change', this.onLayoutChange)
    this.setAccessory(null)
    this.panel.dispose()
  }

  private applyState(state: AcExCommandSessionUiState): void {
    this.syncCollapsedHeightVar()
    const handlers = this.handlers
    this.panel.show(
      {
        prompt: state.prompt,
        allowNone: state.confirmEnabled,
        // Always show metric chrome; absolute X/Y when no base point yet.
        showMetrics: true,
        keywords: state.chips.map(chip => ({
          displayName: chip.label,
          id: chip.id,
          enabled: true
        }))
      },
      {
        onConfirm: () => handlers?.onConfirm(),
        onCancel: () => handlers?.onCancel(),
        onKeyword: (id: string) => handlers?.onChip(id)
      }
    )
    this.panel.prepareAccessory()

    if (state.metrics) {
      this.panel.setMetrics(state.metrics.hasBasePoint, {
        length: state.metrics.lengthText,
        angle: state.metrics.angleText,
        dx: state.metrics.dxText,
        dy: state.metrics.dyText,
        x: state.metrics.xText,
        y: state.metrics.yText
      })
    } else {
      // No rubber-band yet: absolute X/Y labels (matches prior HTML behavior).
      this.panel.setMetrics(false, {
        length: '0',
        angle: '0',
        dx: '0',
        dy: '0',
        x: '0',
        y: '0'
      })
    }
  }

  private syncCollapsedHeightVar(): void {
    const fromToolbar =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--mlcad-toolbar-phone-height')
        .trim() || '56px'
    this.rootEl.style.setProperty(
      '--ml-mobile-cmd-collapsed-height',
      fromToolbar
    )
  }
}

function sessionLabels(i18n: AcExHtmlI18n): AcUiMobileSessionPanelLabels {
  return {
    length: i18n.t('session.length'),
    angle: i18n.t('session.angle'),
    dx: i18n.t('session.dx'),
    dy: i18n.t('session.dy'),
    x: i18n.t('session.x'),
    y: i18n.t('session.y'),
    confirm: i18n.t('session.confirm'),
    cancel: i18n.t('session.cancel'),
    help: i18n.t('session.help'),
    back: i18n.t('session.back'),
    collapse: i18n.t('session.collapse'),
    expand: i18n.t('session.expand')
  }
}
