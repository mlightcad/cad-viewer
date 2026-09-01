import { AcApI18n } from '../../../i18n/AcApI18n'
import {
  acedIsMobileOrPadUi,
  acedIsMobileUiLayout,
  acedSubscribeUiLayout,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_SESSION_PANEL_MAX_WIDTH,
  ML_UI_SESSION_PANEL_WIDTH
} from '../../global/AcEdUiLayout'
import type { AcEdMobileSessionMetrics } from './AcEdMobileSessionMetrics'

/** Keyword chip shown on the mobile session panel. */
export interface AcEdMobileKeywordChip {
  /** Text shown on the chip. */
  displayName: string
  /** Canonical keyword token passed to {@link AcEdMobileCommandChromeCallbacks.onKeyword}. */
  globalName: string
  /** When false the chip is visible but not tappable. */
  enabled: boolean
}

/** Formatted metric strings ready to display. */
export interface AcEdMobileMetricTexts {
  /** Distance from base point. */
  length: string
  /** Angle from base point. */
  angle: string
  /** Delta X from base point. */
  dx: string
  /** Delta Y from base point. */
  dy: string
  /** Absolute X. */
  x: string
  /** Absolute Y. */
  y: string
}

/**
 * Callbacks for the mobile command chrome.
 *
 * `onConfirm` is empty-Enter / `allowNone` (panel ✓). Typed coordinate commit
 * is a separate future path (numeric keypad) and must not use `onConfirm`.
 */
export interface AcEdMobileCommandChromeCallbacks {
  /** Panel ✓ — empty Enter / None. */
  onConfirm: () => void
  /** Panel × — Escape. */
  onCancel: () => void
  /** Keyword chip tap. */
  onKeyword: (globalName: string) => void
}

/** Session content pushed into {@link AcEdMobileCommandChrome.show}. */
export interface AcEdMobileCommandChromeState {
  /** Prompt text (without `[keywords]`). */
  prompt: string
  /** Visible keyword chips. */
  keywords: AcEdMobileKeywordChip[]
  /** Enables the ✓ button (maps to empty Enter). */
  allowNone: boolean
  /** When false, the metric row is hidden (typed-only numeric prompts). */
  showMetrics: boolean
}

/** DOM id of the injected stylesheet for mobile command chrome. */
const STYLE_ID = 'ml-mobile-cmd-styles'

/** Zeroed metric texts used when no frozen readout is available. */
const ZERO_TEXTS: AcEdMobileMetricTexts = {
  length: '0',
  angle: '0',
  dx: '0',
  dy: '0',
  x: '0',
  y: '0'
}

/**
 * Phone/pad replacement for the desktop command line and Dynamic Input:
 * a top prompt bar plus a bottom panel with live metrics, keyword chips,
 * and on-screen Confirm / Cancel.
 */
export class AcEdMobileCommandChrome {
  /** Whether {@link injectCss} has already run for this document. */
  private static stylesInjected = false

  /** View container that receives the overlay and CSS variables. */
  private readonly host: HTMLElement
  /** Root overlay element (prompt + panel). */
  private readonly root: HTMLDivElement
  /** Top prompt status bar. */
  private readonly promptEl: HTMLDivElement
  /** Bottom session panel. */
  private readonly panel: HTMLDivElement
  /** Absolute X/Y metric group. */
  private readonly absGroup: HTMLDivElement
  /** Length/angle metric group. */
  private readonly polarGroup: HTMLDivElement
  /** Delta X/Y metric group. */
  private readonly deltaGroup: HTMLDivElement
  /** Stack holding absolute metric buttons. */
  private readonly absStack: HTMLDivElement
  /** Stack holding polar metric buttons. */
  private readonly polarStack: HTMLDivElement
  /** Stack holding delta metric buttons. */
  private readonly deltaStack: HTMLDivElement
  /** Confirm/cancel actions beside absolute metrics (phone). */
  private readonly absActions: HTMLDivElement
  /** Cancel action beside polar metrics (phone). */
  private readonly polarActions: HTMLDivElement
  /** Confirm action beside delta metrics (phone). */
  private readonly deltaActions: HTMLDivElement
  /** Shared confirm/cancel row used on pad layouts. */
  private readonly sharedActions: HTMLDivElement
  /** Mount row for session accessories at the top of the panel. */
  private readonly accessoryEl: HTMLDivElement
  /** Keyword chip container. */
  private readonly chipsEl: HTMLDivElement
  /** Panel cancel (Escape) button. */
  private readonly cancelBtn: HTMLButtonElement
  /** Panel confirm (empty Enter / None) button. */
  private readonly confirmBtn: HTMLButtonElement
  /** Metric readout buttons keyed by metric id. */
  private readonly metricButtons: Record<
    keyof AcEdMobileMetricTexts,
    HTMLButtonElement
  >
  /** Active session callbacks, or `null` when hidden. */
  private callbacks: AcEdMobileCommandChromeCallbacks | null = null
  /** Whether the chrome is currently shown. */
  private open = false
  /** Whether the metric row should be shown for the current prompt. */
  private showMetrics = false
  /** Whether the current prompt has a base point (relative metrics). */
  private hasBasePoint = false
  /** Last live readout; restored across hide/show so a lift does not zero values. */
  private frozenTexts: AcEdMobileMetricTexts | null = null
  /** Base-point flag paired with {@link frozenTexts}. */
  private frozenHasBasePoint = false
  /** Unsubscribe for locale-change relabeling. */
  private localeUnsub?: () => void
  /** Unsubscribe for layout-change metric visibility. */
  private layoutUnsub?: () => void

  /**
   * @param host - View container that receives the overlay (and CSS variables).
   */
  constructor(host: HTMLElement) {
    this.host = host
    AcEdMobileCommandChrome.injectCss()

    this.root = document.createElement('div')
    this.root.className = 'ml-mobile-cmd'
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')

    this.promptEl = document.createElement('div')
    this.promptEl.className = 'ml-mobile-cmd-prompt'
    this.promptEl.setAttribute('role', 'status')

    const panel = document.createElement('div')
    panel.className = 'ml-mobile-cmd-panel'
    this.panel = panel

    this.metricButtons = {
      length: this.makeMetricButton('length'),
      angle: this.makeMetricButton('angle'),
      dx: this.makeMetricButton('dx'),
      dy: this.makeMetricButton('dy'),
      x: this.makeMetricButton('x'),
      y: this.makeMetricButton('y')
    }

    this.absStack = document.createElement('div')
    this.absStack.className = 'ml-mobile-cmd-metric-stack'
    this.absStack.append(this.metricButtons.x, this.metricButtons.y)

    this.polarStack = document.createElement('div')
    this.polarStack.className = 'ml-mobile-cmd-metric-stack'
    this.polarStack.append(this.metricButtons.length, this.metricButtons.angle)

    this.deltaStack = document.createElement('div')
    this.deltaStack.className = 'ml-mobile-cmd-metric-stack'
    this.deltaStack.append(this.metricButtons.dx, this.metricButtons.dy)

    this.accessoryEl = document.createElement('div')
    this.accessoryEl.className = 'ml-mobile-cmd-accessory'
    this.accessoryEl.hidden = true
    this.sinkPointer(this.accessoryEl)

    this.chipsEl = document.createElement('div')
    this.chipsEl.className = 'ml-mobile-cmd-chips'

    this.cancelBtn = document.createElement('button')
    this.cancelBtn.type = 'button'
    this.cancelBtn.className = 'ml-mobile-cmd-cancel'
    this.cancelBtn.innerHTML = cancelIcon()
    this.cancelBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.callbacks?.onCancel()
    })
    this.sinkPointer(this.cancelBtn)

    this.confirmBtn = document.createElement('button')
    this.confirmBtn.type = 'button'
    this.confirmBtn.className = 'ml-mobile-cmd-confirm'
    this.confirmBtn.innerHTML = confirmIcon()
    this.confirmBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      if (this.confirmBtn.disabled) return
      this.callbacks?.onConfirm()
    })
    this.sinkPointer(this.confirmBtn)

    this.absActions = document.createElement('div')
    this.absActions.className = 'ml-mobile-cmd-actions'
    this.polarActions = document.createElement('div')
    this.polarActions.className = 'ml-mobile-cmd-actions'
    this.deltaActions = document.createElement('div')
    this.deltaActions.className = 'ml-mobile-cmd-actions'
    this.sharedActions = document.createElement('div')
    this.sharedActions.className =
      'ml-mobile-cmd-actions ml-mobile-cmd-actions-shared'

    this.absGroup = document.createElement('div')
    this.absGroup.className = 'ml-mobile-cmd-group ml-mobile-cmd-group-abs'
    this.absGroup.append(this.absStack, this.absActions)

    this.polarGroup = document.createElement('div')
    this.polarGroup.className = 'ml-mobile-cmd-group ml-mobile-cmd-group-polar'
    this.polarGroup.append(this.polarStack, this.polarActions)

    this.deltaGroup = document.createElement('div')
    this.deltaGroup.className = 'ml-mobile-cmd-group ml-mobile-cmd-group-delta'
    this.deltaGroup.append(this.deltaStack, this.deltaActions)

    panel.append(
      this.accessoryEl,
      this.chipsEl,
      this.absGroup,
      this.polarGroup,
      this.deltaGroup,
      this.sharedActions
    )
    this.root.append(this.promptEl, panel)
    this.sinkPointer(panel)

    host.appendChild(this.root)

    this.relabel()
    AcApI18n.events.localeChanged.addEventListener(this.boundRelabel)
    this.localeUnsub = () => {
      AcApI18n.events.localeChanged.removeEventListener(this.boundRelabel)
    }
  }

  /** Relabel handler bound for locale-change subscription. */
  private readonly boundRelabel = () => this.relabel()

  /** Whether the chrome is currently shown. */
  get isOpen(): boolean {
    return this.open
  }

  /**
   * Shows the chrome for an input session. No-op on desktop layouts.
   *
   * @param state - Prompt, keywords, and metric visibility for the session.
   * @param callbacks - Confirm / cancel / keyword handlers.
   */
  show(
    state: AcEdMobileCommandChromeState,
    callbacks: AcEdMobileCommandChromeCallbacks
  ): void {
    if (!acedIsMobileOrPadUi()) {
      this.hide()
      return
    }
    this.callbacks = callbacks
    this.open = true
    this.showMetrics = state.showMetrics
    this.root.hidden = false
    this.root.setAttribute('aria-hidden', 'false')
    this.host.classList.add('ml-mobile-cmd-active')
    this.host.style.setProperty('--ml-mobile-cmd-prompt-height', '40px')
    this.promptEl.textContent = stripPromptColon(state.prompt)
    this.confirmBtn.disabled = !state.allowNone
    this.renderChips(state.keywords)
    if (this.frozenTexts) {
      this.setMetricTexts(this.frozenTexts, this.frozenHasBasePoint)
    } else {
      this.setMetricTexts(ZERO_TEXTS, false)
    }
    this.layoutUnsub?.()
    this.layoutUnsub = acedSubscribeUiLayout(() => {
      if (this.open) this.applyMetricVisibility()
    })
    this.applyMetricVisibility()
    this.relabel()
  }

  /**
   * Updates prompt / keywords / ✓ without tearing down the session.
   *
   * @param partial - Fields to update; omitted fields keep their current values.
   */
  update(partial: Partial<AcEdMobileCommandChromeState>): void {
    if (!this.open) return
    if (partial.prompt != null) {
      this.promptEl.textContent = stripPromptColon(partial.prompt)
    }
    if (partial.allowNone != null) {
      this.confirmBtn.disabled = !partial.allowNone
    }
    if (partial.keywords) {
      this.renderChips(partial.keywords)
    }
    if (partial.showMetrics != null) {
      this.showMetrics = partial.showMetrics
      this.applyMetricVisibility()
    }
  }

  /**
   * Pushes live metric values. Phase 1 displays them read-only; the metric
   * buttons stay disabled as a hook for the numeric keypad.
   *
   * @param metrics - Live numeric metrics including base-point state.
   * @param texts - Formatted strings for display.
   */
  setMetrics(metrics: AcEdMobileSessionMetrics, texts: AcEdMobileMetricTexts) {
    if (!this.open) return
    this.hasBasePoint = metrics.hasBasePoint
    this.frozenTexts = { ...texts }
    this.frozenHasBasePoint = metrics.hasBasePoint
    this.setMetricTexts(texts, metrics.hasBasePoint)
    this.applyMetricVisibility()
  }

  /** Hides the chrome and clears session callbacks. */
  hide(): void {
    this.open = false
    this.callbacks = null
    this.clearAccessory()
    this.layoutUnsub?.()
    this.layoutUnsub = undefined
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')
    this.host.classList.remove('ml-mobile-cmd-active')
    this.host.style.removeProperty('--ml-mobile-cmd-prompt-height')
  }

  /** Removes DOM and locale listeners. */
  dispose(): void {
    this.hide()
    this.localeUnsub?.()
    this.root.remove()
  }

  /**
   * Creates a disabled metric readout button for the keypad hook.
   *
   * @param id - Metric identifier stored on `dataset.metric`.
   * @returns Button with label and value spans.
   */
  private makeMetricButton(id: keyof AcEdMobileMetricTexts): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-mobile-cmd-metric'
    btn.dataset.metric = id
    // Phase 1: tappable hook for the keypad, but clicks are ignored.
    btn.disabled = true
    const label = document.createElement('span')
    label.className = 'ml-mobile-cmd-metric-label'
    const value = document.createElement('span')
    value.className = 'ml-mobile-cmd-metric-value'
    value.textContent = '0'
    btn.append(label, value)
    return btn
  }

  /**
   * Writes formatted metric strings into the metric buttons.
   *
   * @param texts - Formatted values for each metric.
   * @param hasBasePoint - Whether relative metrics apply.
   */
  private setMetricTexts(
    texts: AcEdMobileMetricTexts,
    hasBasePoint: boolean
  ): void {
    this.metricButtons.length.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.length
    this.metricButtons.angle.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.angle
    this.metricButtons.dx.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.dx
    this.metricButtons.dy.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.dy
    this.metricButtons.x.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.x
    this.metricButtons.y.querySelector(
      '.ml-mobile-cmd-metric-value'
    )!.textContent = texts.y
    this.hasBasePoint = hasBasePoint
  }

  /**
   * Shows or hides metric groups and places confirm/cancel for phone vs pad.
   */
  private applyMetricVisibility(): void {
    const relative = this.showMetrics && this.hasBasePoint
    const absolute = this.showMetrics && !this.hasBasePoint
    const phone = acedIsMobileUiLayout()
    this.metricButtons.length.hidden = !relative
    this.metricButtons.angle.hidden = !relative
    this.metricButtons.dx.hidden = !relative
    this.metricButtons.dy.hidden = !relative
    this.metricButtons.x.hidden = !absolute
    this.metricButtons.y.hidden = !absolute
    this.panel.classList.toggle('is-relative', relative)
    this.panel.classList.toggle('is-absolute', absolute)
    this.panel.classList.toggle('is-actions-only', !relative && !absolute)
    this.polarGroup.hidden = !relative
    this.deltaGroup.hidden = !relative
    this.absStack.hidden = !absolute
    this.absGroup.hidden = phone ? relative : !absolute
    if (phone && relative) {
      this.polarActions.appendChild(this.cancelBtn)
      this.deltaActions.appendChild(this.confirmBtn)
    } else if (phone) {
      this.absActions.append(this.cancelBtn, this.confirmBtn)
    } else {
      this.sharedActions.append(this.cancelBtn, this.confirmBtn)
    }
  }

  /** Mount row for session accessories at the top of the bottom panel. */
  get accessoryHost(): HTMLElement {
    return this.accessoryEl
  }

  /** Shows the mobile accessory row. */
  prepareAccessory(): void {
    this.accessoryEl.hidden = false
  }

  /** Hides the accessory row and clears its children. */
  clearAccessory(): void {
    this.accessoryEl.replaceChildren()
    this.accessoryEl.hidden = true
  }

  /**
   * Rebuilds keyword chips from the current session state.
   *
   * @param keywords - Chips to render; empty hides the row.
   */
  private renderChips(keywords: AcEdMobileKeywordChip[]): void {
    this.chipsEl.replaceChildren()
    this.chipsEl.hidden = keywords.length === 0
    for (const kw of keywords) {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'ml-mobile-cmd-chip'
      chip.textContent = kw.displayName
      chip.disabled = !kw.enabled
      chip.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (!kw.enabled) return
        this.callbacks?.onKeyword(kw.globalName)
      })
      this.sinkPointer(chip)
      this.chipsEl.appendChild(chip)
    }
  }

  /** Refreshes metric labels and button aria-labels from i18n. */
  private relabel(): void {
    const t = (key: string) => AcApI18n.t(key)
    this.metricButtons.length.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.length')
    this.metricButtons.angle.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.angle')
    this.metricButtons.dx.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.dx')
    this.metricButtons.dy.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.dy')
    this.metricButtons.x.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.x')
    this.metricButtons.y.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t('main.mobileCommand.y')
    this.confirmBtn.setAttribute(
      'aria-label',
      t('main.mobileCommand.confirm')
    )
    this.cancelBtn.setAttribute('aria-label', t('main.mobileCommand.cancel'))
  }

  /**
   * Stops `pointerdown` from bubbling to the canvas while still allowing the
   * event to reach interactive children (e.g. ACI palette long-press loupe).
   *
   * Must use the bubble phase: capture + `stopPropagation` on the accessory /
   * panel would prevent descendants from receiving pointer events at all.
   */
  private sinkPointer(el: HTMLElement): void {
    el.addEventListener('pointerdown', e => {
      e.stopPropagation()
    })
  }

  /** Injects mobile command chrome styles once into the document head. */
  private static injectCss(): void {
    if (this.stylesInjected) return
    if (typeof document === 'undefined') return
    this.stylesInjected = true
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = MOBILE_CMD_CSS
    document.head.appendChild(style)
  }
}

/**
 * Strips a trailing colon from prompt text for the mobile prompt bar.
 *
 * @param message - Raw prompt message, possibly ending with `:` or `：`.
 * @returns Trimmed message without a trailing colon.
 */
function stripPromptColon(message: string): string {
  return message.trim().replace(/[：:]\s*$/, '')
}

/** SVG markup for the cancel (×) button. */
function cancelIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/></svg>'
}

/** SVG markup for the confirm (✓) button. */
function confirmIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.36 9.25-9.26 1.4 1.41z"/></svg>'
}

/** CSS rules for the mobile command prompt and session panel. */
const MOBILE_CMD_CSS = `
  .ml-mobile-cmd {
    pointer-events: none;
  }
  .ml-mobile-cmd-prompt {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    z-index: 40;
    min-height: 32px;
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--ml-ui-bg, rgba(32, 34, 38, 0.94));
    color: var(--ml-ui-text, #e8eaed);
    border: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
    box-shadow: var(--ml-ui-shadow, 0 2px 12px rgba(0, 0, 0, 0.35));
    font-size: 13px;
    line-height: 1.35;
    pointer-events: none;
  }
  .ml-mobile-cmd-panel {
    pointer-events: auto;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--ml-ui-bg, rgba(28, 30, 34, 0.96));
    color: var(--ml-ui-text, #e8eaed);
    border-top: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
  }
  .ml-mobile-cmd-group {
    display: flex;
    align-items: stretch;
    gap: 8px;
    min-width: 0;
  }
  .ml-mobile-cmd-group[hidden] {
    display: none;
  }
  .ml-mobile-cmd-panel.is-relative .ml-mobile-cmd-group-polar {
    border-bottom: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
    padding-bottom: 0;
  }
  .ml-mobile-cmd-group:not(:has(.ml-mobile-cmd-metric-stack:not([hidden]))) {
    justify-content: flex-end;
  }
  .ml-mobile-cmd-metric-stack {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
  }
  .ml-mobile-cmd-metric-stack[hidden] {
    display: none;
  }
  .ml-mobile-cmd-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex: 0 0 auto;
    align-self: stretch;
    padding-left: 12px;
    border-left: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
  }
  .ml-mobile-cmd-group:not(:has(.ml-mobile-cmd-metric-stack:not([hidden])))
    .ml-mobile-cmd-actions {
    border-left: 0;
    padding-left: 0;
  }
  .ml-mobile-cmd-metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 2px 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    min-height: 28px;
    min-width: 0;
    width: 100%;
  }
  .ml-mobile-cmd-metric[hidden] {
    display: none;
  }
  .ml-mobile-cmd-metric-label {
    flex: 0 0 auto;
    color: var(--ml-ui-muted, #9aa0a6);
    font-size: 12px;
  }
  .ml-mobile-cmd-metric-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }
  .ml-mobile-cmd-accessory {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ml-mobile-cmd-accessory:not([hidden]) {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
  }
  .ml-mobile-cmd-accessory[hidden] {
    display: none;
  }
  .ml-mobile-cmd-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ml-mobile-cmd-chips:not([hidden]) {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
  }
  .ml-mobile-cmd-chips[hidden] {
    display: none;
  }
  .ml-mobile-cmd-chip {
    min-height: 32px;
    padding: 4px 10px;
    border-radius: 16px;
    border: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.16));
    background: var(--ml-ui-bg-elevated, rgba(255, 255, 255, 0.06));
    color: var(--ml-ui-accent, #08e8de);
    font-size: 13px;
  }
  .ml-mobile-cmd-chip:disabled {
    opacity: 0.45;
  }
  .ml-mobile-cmd-cancel,
  .ml-mobile-cmd-confirm {
    box-sizing: border-box;
    flex: 0 0 36px;
    align-self: center;
    margin: 0;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 50%;
    border: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
    cursor: pointer;
    color: #fff;
  }
  .ml-mobile-cmd-cancel svg,
  .ml-mobile-cmd-confirm svg {
    display: block;
    width: 18px;
    height: 18px;
  }
  .ml-mobile-cmd-cancel {
    background: #5c6370;
  }
  .ml-mobile-cmd-confirm {
    background: var(--ml-ui-accent, #1a8cff);
  }
  .ml-mobile-cmd-confirm:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .ml-mobile-cmd-actions-shared {
    display: none;
  }
  @media (min-width: ${ML_UI_MOBILE_MAX_WIDTH + 1}px) {
    .ml-mobile-cmd-panel {
      left: 50%;
      right: auto;
      box-sizing: border-box;
      width: ${ML_UI_SESSION_PANEL_WIDTH}px;
      max-width: ${ML_UI_SESSION_PANEL_MAX_WIDTH};
      transform: translateX(-50%);
      border-radius: 12px 12px 0 0;
      border: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
      border-bottom: 0;
    }
    .ml-mobile-cmd-metric-stack {
      flex-direction: row;
      align-items: center;
      gap: 16px;
    }
    .ml-mobile-cmd-metric {
      flex: 1;
    }
    .ml-mobile-cmd-group .ml-mobile-cmd-actions {
      display: none;
    }
    .ml-mobile-cmd-actions-shared {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
    }
    .ml-mobile-cmd-panel.is-absolute .ml-mobile-cmd-group-abs {
      align-items: center;
    }
    .ml-mobile-cmd-panel.is-absolute .ml-mobile-cmd-actions-shared {
      align-self: center;
    }
    .ml-mobile-cmd-panel.is-relative:not([hidden]),
    .ml-mobile-cmd-panel.is-absolute:not([hidden]) {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: stretch;
      row-gap: 0;
    }
    .ml-mobile-cmd-panel.is-relative {
      grid-template-areas:
        'accessory accessory'
        'chips chips'
        'polar shared'
        'delta shared';
    }
    .ml-mobile-cmd-panel.is-absolute {
      grid-template-areas:
        'accessory accessory'
        'chips chips'
        'abs shared';
    }
    .ml-mobile-cmd-group-polar { grid-area: polar; }
    .ml-mobile-cmd-group-delta { grid-area: delta; }
    .ml-mobile-cmd-group-abs { grid-area: abs; }
    .ml-mobile-cmd-actions-shared { grid-area: shared; }
    .ml-mobile-cmd-accessory { grid-area: accessory; }
    .ml-mobile-cmd-chips { grid-area: chips; }
    .ml-mobile-cmd-panel.is-relative .ml-mobile-cmd-group-polar {
      padding-bottom: 6px;
    }
    .ml-mobile-cmd-panel.is-relative .ml-mobile-cmd-group-delta {
      padding-top: 6px;
    }
    .ml-mobile-cmd-panel.is-actions-only {
      display: flex;
      flex-direction: column;
    }
    .ml-mobile-cmd-panel.is-actions-only .ml-mobile-cmd-actions-shared {
      border-left: 0;
      padding-left: 0;
      justify-content: flex-end;
      align-self: flex-end;
    }
  }
`
