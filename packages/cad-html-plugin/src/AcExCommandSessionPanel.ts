import { acExHtmlIsPhoneLayout } from './AcExHtmlDrawerSheet'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { ML_UI_MOBILE_MAX_WIDTH } from './AcExHtmlShell'

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
  private readonly chipsEl: HTMLElement
  private readonly cancelBtn: HTMLButtonElement
  private readonly confirmBtn: HTMLButtonElement
  private readonly metricEls: Record<
    'length' | 'angle' | 'dx' | 'dy' | 'x' | 'y',
    { btn: HTMLButtonElement; value: HTMLElement }
  >
  private handlers: AcExCommandSessionPanelHandlers | null = null
  private lastState: AcExCommandSessionUiState | null = null

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

    if (!state) return

    this.confirmBtn.disabled = !state.confirmEnabled
    this.renderMetrics(state.metrics)
    this.renderChips(state.chips)
  }

  /** Re-applies metric labels after a locale change. */
  refreshLabels(): void {
    this.relabel()
    if (this.lastState) this.setState(this.lastState)
  }

  private renderMetrics(metrics: AcExCommandSessionMetrics | null): void {
    const relative = metrics?.hasBasePoint === true
    // No rubber-band yet (and markup): still show X/Y labels, not an empty actions row.
    const absolute = !relative
    const phone = acExHtmlIsPhoneLayout()
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
