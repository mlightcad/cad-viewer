import {
  ACEX_DOCS_PATH_MAGNIFIER,
  acexDocsUrl
} from './AcExDocsUrl'
import { acexHtmlIsPhoneLayout } from './AcExHtmlDrawerSheet'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { ML_UI_MOBILE_MAX_WIDTH } from './AcExHtmlShell'
import { AcUiHelpPanel } from './AcExHtmlSimpleViewerUi'

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
 * Bottom session panel for the offline HTML viewer: live length/angle/Δ
 * readouts plus on-screen Confirm / Cancel. The existing
 * `#mlcad-status-bar` remains the prompt (top message bar).
 */
export class AcExCommandSessionPanel {
  private readonly root: HTMLElement
  private readonly i18n: AcExHtmlI18n
  private readonly absGroup: HTMLElement | null
  private readonly polarGroup: HTMLElement | null
  private readonly deltaGroup: HTMLElement | null
  private readonly absStack: HTMLElement | null
  private readonly absActions: HTMLElement | null
  private readonly polarActions: HTMLElement | null
  private readonly deltaActions: HTMLElement | null
  private readonly sharedActions: HTMLElement | null
  private readonly accessoryEl: HTMLElement
  private readonly accessoryContentEl: HTMLElement
  private readonly helpBtn: HTMLButtonElement | null
  private readonly chipsEl: HTMLElement
  private readonly cancelBtn: HTMLButtonElement
  private readonly confirmBtn: HTMLButtonElement
  private readonly metricEls: Record<
    'length' | 'angle' | 'dx' | 'dy' | 'x' | 'y',
    { btn: HTMLButtonElement; value: HTMLElement }
  >
  private handlers: AcExCommandSessionPanelHandlers | null = null
  private lastState: AcExCommandSessionUiState | null = null
  private accessory: AcExSessionAccessory | null = null
  private helpPanel: AcUiHelpPanel | null = null

  constructor(host: HTMLElement, i18n: AcExHtmlI18n) {
    this.i18n = i18n
    this.root = host
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')
    this.root.classList.add('mlcad-command-session')

    this.absGroup = host.querySelector('.mlcad-session-group-abs')
    this.polarGroup = host.querySelector('.mlcad-session-group-polar')
    this.deltaGroup = host.querySelector('.mlcad-session-group-delta')
    this.absStack = host.querySelector('[data-session-stack="abs"]')
    this.absActions = host.querySelector('[data-session-actions="abs"]')
    this.polarActions = host.querySelector('[data-session-actions="polar"]')
    this.deltaActions = host.querySelector('[data-session-actions="delta"]')
    this.sharedActions = host.querySelector('[data-session-actions="shared"]')
    this.accessoryEl =
      (host.querySelector('.mlcad-session-accessory') as HTMLElement) ??
      host.insertBefore(
        Object.assign(document.createElement('div'), {
          className: 'mlcad-session-accessory',
          hidden: true
        }),
        host.firstChild
      )
    this.accessoryContentEl =
      (this.accessoryEl.querySelector(
        '.mlcad-session-accessory-content'
      ) as HTMLElement) ??
      (() => {
        const el = document.createElement('div')
        el.className = 'mlcad-session-accessory-content'
        this.accessoryEl.insertBefore(el, this.accessoryEl.firstChild)
        return el
      })()
    this.helpBtn = this.accessoryEl.querySelector(
      '.mlcad-session-help'
    ) as HTMLButtonElement | null
    this.chipsEl = host.querySelector('.mlcad-session-chips') as HTMLElement
    this.cancelBtn = host.querySelector(
      '.mlcad-session-cancel'
    ) as HTMLButtonElement
    this.confirmBtn = host.querySelector(
      '.mlcad-session-confirm'
    ) as HTMLButtonElement

    this.metricEls = {
      length: bindMetric(host, 'length'),
      angle: bindMetric(host, 'angle'),
      dx: bindMetric(host, 'dx'),
      dy: bindMetric(host, 'dy'),
      x: bindMetric(host, 'x'),
      y: bindMetric(host, 'y')
    }

    this.cancelBtn?.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.handlers?.onCancel()
    })
    this.confirmBtn?.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      if (this.confirmBtn.disabled) return
      this.handlers?.onConfirm()
    })
    this.helpBtn?.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.openHelpPanel()
    })

    this.relabel()

    if (typeof window !== 'undefined' && window.matchMedia) {
      window
        .matchMedia(`(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`)
        .addEventListener('change', () => {
          if (this.lastState) this.renderMetrics(this.lastState.metrics)
        })
    }
  }

  /** Wires confirm / cancel / chip clicks. */
  setHandlers(handlers: AcExCommandSessionPanelHandlers | null): void {
    this.handlers = handlers
  }

  /** Applies session UI or hides the panel when `state` is null. */
  setState(state: AcExCommandSessionUiState | null): void {
    this.lastState = state
    const active = state != null
    this.root.hidden = !active
    this.root.setAttribute('aria-hidden', active ? 'false' : 'true')
    document
      .getElementById('mlcad-root')
      ?.classList.toggle('mlcad-session-active', active)

    if (!state) {
      this.setAccessory(null)
      this.accessoryEl.hidden = true
      return
    }

    this.accessoryEl.hidden = false
    this.confirmBtn.disabled = !state.confirmEnabled
    this.renderMetrics(state.metrics)
    this.renderChips(state.chips)
  }

  /**
   * Mounts widgets at the top of the session panel (left of the help icon).
   * Pass `null` to clear custom content; the help icon remains while the
   * panel is open. Same `id` is a no-op so live metric updates do not remount.
   */
  setAccessory(next: AcExSessionAccessory | null): void {
    if ((this.accessory?.id ?? null) === (next?.id ?? null)) return
    this.accessory?.unmount()
    this.accessoryContentEl.replaceChildren()
    this.accessory = next
    if (next) {
      this.accessoryEl.hidden = false
      next.mount(this.accessoryContentEl)
    }
  }

  /** Re-applies metric labels after a locale change. */
  refreshLabels(): void {
    this.relabel()
    this.helpPanel?.setLabels(this.helpLabels())
    if (this.lastState) this.setState(this.lastState)
  }

  /** Localized chrome strings for the full-screen help panel. */
  private helpLabels(): { title: string; back: string } {
    return {
      title: this.i18n.t('session.help'),
      back: this.i18n.t('session.back')
    }
  }

  /** Opens the full-screen magnifier help panel. */
  private openHelpPanel(): void {
    if (!this.helpPanel) {
      this.helpPanel = new AcUiHelpPanel({
        host: document.getElementById('mlcad-root') ?? document.body
      })
    }
    this.helpPanel.showDocs({
      url: acexDocsUrl(ACEX_DOCS_PATH_MAGNIFIER, this.i18n.locale),
      labels: this.helpLabels()
    })
  }

  private renderMetrics(metrics: AcExCommandSessionMetrics | null): void {
    const relative = metrics?.hasBasePoint === true
    // No rubber-band yet (and markup): still show X/Y labels, not an empty actions row.
    const absolute = !relative
    const phone = acexHtmlIsPhoneLayout()
    this.root.classList.toggle('is-relative', relative)
    this.root.classList.toggle('is-absolute', absolute)
    this.root.classList.remove('is-actions-only')
    if (this.polarGroup) this.polarGroup.hidden = !relative
    if (this.deltaGroup) this.deltaGroup.hidden = !relative
    if (this.absStack) this.absStack.hidden = !absolute
    if (this.absGroup) this.absGroup.hidden = phone ? relative : !absolute
    if (phone && relative) {
      this.polarActions?.appendChild(this.cancelBtn)
      this.deltaActions?.appendChild(this.confirmBtn)
    } else if (phone) {
      this.absActions?.append(this.cancelBtn, this.confirmBtn)
    } else {
      this.sharedActions?.append(this.cancelBtn, this.confirmBtn)
    }
    this.metricEls.length.btn.hidden = !relative
    this.metricEls.angle.btn.hidden = !relative
    this.metricEls.dx.btn.hidden = !relative
    this.metricEls.dy.btn.hidden = !relative
    this.metricEls.x.btn.hidden = !absolute
    this.metricEls.y.btn.hidden = !absolute
    if (!metrics) return
    this.metricEls.length.value.textContent = metrics.lengthText
    this.metricEls.angle.value.textContent = metrics.angleText
    this.metricEls.dx.value.textContent = metrics.dxText
    this.metricEls.dy.value.textContent = metrics.dyText
    this.metricEls.x.value.textContent = metrics.xText
    this.metricEls.y.value.textContent = metrics.yText
  }

  private renderChips(_chips: AcExCommandSessionChip[]): void {
    if (!this.chipsEl) return
    this.chipsEl.replaceChildren()
    this.chipsEl.hidden = true
  }

  private relabel(): void {
    setMetricLabel(this.metricEls.length.btn, this.i18n.t('session.length'))
    setMetricLabel(this.metricEls.angle.btn, this.i18n.t('session.angle'))
    setMetricLabel(this.metricEls.dx.btn, this.i18n.t('session.dx'))
    setMetricLabel(this.metricEls.dy.btn, this.i18n.t('session.dy'))
    setMetricLabel(this.metricEls.x.btn, this.i18n.t('session.x'))
    setMetricLabel(this.metricEls.y.btn, this.i18n.t('session.y'))
    this.confirmBtn?.setAttribute(
      'aria-label',
      this.i18n.t('session.confirm')
    )
    this.cancelBtn?.setAttribute('aria-label', this.i18n.t('session.cancel'))
    this.helpBtn?.setAttribute('aria-label', this.i18n.t('session.help'))
  }
}

function bindMetric(
  host: HTMLElement,
  id: string
): { btn: HTMLButtonElement; value: HTMLElement } {
  const btn = host.querySelector(
    `[data-session-metric="${id}"]`
  ) as HTMLButtonElement
  const value =
    (btn?.querySelector('.mlcad-session-metric-value') as HTMLElement) ??
    document.createElement('span')
  return { btn, value }
}

function setMetricLabel(btn: HTMLButtonElement | undefined, text: string): void {
  const label = btn?.querySelector('.mlcad-session-metric-label')
  if (label) label.textContent = text
}
