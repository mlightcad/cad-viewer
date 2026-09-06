import {
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_SESSION_PANEL_MAX_WIDTH,
  ML_UI_SESSION_PANEL_WIDTH
} from '../editor/global/AcEdUiLayout'
import { AcUiHelpPanel } from './AcUiHelpPanel'

/** Keyword / action chip on the mobile session panel. */
export interface AcUiMobileSessionKeyword {
  /** Text shown on the chip. */
  displayName: string
  /** Token passed to {@link AcUiMobileSessionPanelCallbacks.onKeyword}. */
  id: string
  /** When false the chip is visible but not tappable. */
  enabled: boolean
}

/** Formatted metric strings ready to display. */
export interface AcUiMobileSessionMetricTexts {
  length: string
  angle: string
  dx: string
  dy: string
  x: string
  y: string
}

/** Localized chrome strings for the session panel. */
export interface AcUiMobileSessionPanelLabels {
  length: string
  angle: string
  dx: string
  dy: string
  x: string
  y: string
  confirm: string
  cancel: string
  help: string
  back: string
  collapse: string
  expand: string
}

/**
 * Callbacks for the mobile session panel.
 *
 * `onConfirm` is empty-Enter / `allowNone` (panel ✓).
 */
export interface AcUiMobileSessionPanelCallbacks {
  onConfirm: () => void
  onCancel: () => void
  onKeyword: (id: string) => void
}

/** Session content pushed into {@link AcUiMobileSessionPanel.show}. */
export interface AcUiMobileSessionPanelState {
  prompt: string
  keywords: AcUiMobileSessionKeyword[]
  allowNone: boolean
  /** When false, the metric row is hidden (actions-only). */
  showMetrics: boolean
}

/** Construction options for {@link AcUiMobileSessionPanel}. */
export interface AcUiMobileSessionPanelOptions {
  /** View / canvas host that receives the overlay and CSS variables. */
  host: HTMLElement
  /** Class toggled on `host` while the panel is open. */
  activeClass?: string
  /** Phone layout detector (≤600px). */
  isPhoneLayout: () => boolean
  /** Optional layout-change subscription used to re-place ✓/×. */
  subscribeLayout?: (cb: () => void) => () => void
  /** Resolves the magnifier help docs URL for the current locale. */
  helpDocsUrl: () => string
  /** Optional host for the full-screen help panel. */
  helpHost?: HTMLElement | (() => HTMLElement | null)
  /** Supplies localized labels (called on show / refreshLabels). */
  labels: () => AcUiMobileSessionPanelLabels
}

/** DOM id of the injected stylesheet. */
const STYLE_ID = 'ml-mobile-cmd-styles'

/** Zeroed metric texts used when no frozen readout is available. */
const ZERO_TEXTS: AcUiMobileSessionMetricTexts = {
  length: '0',
  angle: '0',
  dx: '0',
  dy: '0',
  x: '0',
  y: '0'
}

/**
 * Shared phone/pad session chrome: bottom panel with title bar (accessory +
 * help + collapse), in-panel prompt, live metrics, keyword chips, and ✓/×.
 *
 * Compact (collapsed) mode keeps a single-line prompt and confirm/cancel while
 * hiding metrics to reclaim canvas height and cover the bottom toolbar.
 */
export class AcUiMobileSessionPanel {
  private readonly host: HTMLElement
  private readonly activeClass: string
  private readonly isPhoneLayout: () => boolean
  private readonly subscribeLayout?: (cb: () => void) => () => void
  private readonly helpDocsUrl: () => string
  private readonly helpHostOpt?: HTMLElement | (() => HTMLElement | null)
  private readonly labelsFn: () => AcUiMobileSessionPanelLabels

  private readonly root: HTMLDivElement
  private readonly panel: HTMLDivElement
  private readonly accessoryEl: HTMLDivElement
  private readonly accessoryContentEl: HTMLDivElement
  private readonly helpBtn: HTMLButtonElement
  private readonly collapseBtn: HTMLButtonElement
  private readonly promptEl: HTMLDivElement
  private readonly promptRow: HTMLDivElement
  private readonly compactActions: HTMLDivElement
  private readonly titleActions: HTMLDivElement
  private readonly chipsEl: HTMLDivElement
  private readonly absGroup: HTMLDivElement
  private readonly polarGroup: HTMLDivElement
  private readonly deltaGroup: HTMLDivElement
  private readonly absStack: HTMLDivElement
  private readonly polarStack: HTMLDivElement
  private readonly deltaStack: HTMLDivElement
  private readonly absActions: HTMLDivElement
  private readonly polarActions: HTMLDivElement
  private readonly deltaActions: HTMLDivElement
  private readonly sharedActions: HTMLDivElement
  private readonly cancelBtn: HTMLButtonElement
  private readonly confirmBtn: HTMLButtonElement
  private readonly metricButtons: Record<
    keyof AcUiMobileSessionMetricTexts,
    HTMLButtonElement
  >

  private helpPanel: AcUiHelpPanel | null = null
  private callbacks: AcUiMobileSessionPanelCallbacks | null = null
  private open = false
  private collapsed = false
  private showMetrics = false
  private hasBasePoint = false
  private frozenTexts: AcUiMobileSessionMetricTexts | null = null
  private frozenHasBasePoint = false
  private layoutUnsub?: () => void
  private accessoryObserver?: MutationObserver

  constructor(options: AcUiMobileSessionPanelOptions) {
    this.host = options.host
    this.activeClass = options.activeClass ?? 'ml-mobile-cmd-active'
    this.isPhoneLayout = options.isPhoneLayout
    this.subscribeLayout = options.subscribeLayout
    this.helpDocsUrl = options.helpDocsUrl
    this.helpHostOpt = options.helpHost
    this.labelsFn = options.labels

    AcUiMobileSessionPanel.injectCss()

    this.root = document.createElement('div')
    this.root.className = 'ml-mobile-cmd'
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')

    this.panel = document.createElement('div')
    this.panel.className = 'ml-mobile-cmd-panel'

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
    this.accessoryEl.addEventListener('click', e => {
      if (!this.collapsed) return
      const target = e.target as HTMLElement | null
      if (target?.closest('button')) return
      this.setCollapsed(false)
    })

    this.accessoryContentEl = document.createElement('div')
    this.accessoryContentEl.className = 'ml-mobile-cmd-accessory-content'

    this.helpBtn = document.createElement('button')
    this.helpBtn.type = 'button'
    this.helpBtn.className = 'ml-mobile-cmd-help'
    this.helpBtn.innerHTML = helpIcon()
    this.helpBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.openHelpPanel()
    })
    this.sinkPointer(this.helpBtn)

    this.collapseBtn = document.createElement('button')
    this.collapseBtn.type = 'button'
    this.collapseBtn.className = 'ml-mobile-cmd-collapse'
    this.collapseBtn.innerHTML = collapseIcon()
    this.collapseBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.setCollapsed(!this.collapsed)
    })
    this.sinkPointer(this.collapseBtn)

    this.titleActions = document.createElement('div')
    this.titleActions.className = 'ml-mobile-cmd-title-actions'
    this.titleActions.append(this.helpBtn, this.collapseBtn)
    this.accessoryEl.append(this.accessoryContentEl, this.titleActions)

    this.promptEl = document.createElement('div')
    this.promptEl.className = 'ml-mobile-cmd-prompt'
    this.promptEl.setAttribute('role', 'status')

    this.compactActions = document.createElement('div')
    this.compactActions.className = 'ml-mobile-cmd-actions-compact'

    this.promptRow = document.createElement('div')
    this.promptRow.className = 'ml-mobile-cmd-prompt-row'
    this.chipsEl = document.createElement('div')
    this.chipsEl.className = 'ml-mobile-cmd-chips'
    this.promptRow.append(this.promptEl, this.chipsEl)

    this.accessoryObserver = new MutationObserver(() => {
      if (this.open) this.applyMetricVisibility()
    })
    this.accessoryObserver.observe(this.accessoryContentEl, {
      childList: true
    })

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

    this.panel.append(
      this.accessoryEl,
      this.promptRow,
      this.absGroup,
      this.polarGroup,
      this.deltaGroup,
      this.sharedActions
    )
    this.root.appendChild(this.panel)
    this.sinkPointer(this.panel)

    this.host.appendChild(this.root)
    this.refreshLabels()
  }

  /** Whether the panel is currently shown. */
  get isOpen(): boolean {
    return this.open
  }

  /** Whether the panel is in compact (collapsed) mode. */
  get isCollapsed(): boolean {
    return this.collapsed
  }

  /** Mount slot for custom session accessories (left of help / collapse). */
  get accessoryHost(): HTMLElement {
    return this.accessoryContentEl
  }

  /**
   * Shows the panel for an input session.
   *
   * @param state - Prompt, keywords, and metric visibility.
   * @param callbacks - Confirm / cancel / keyword handlers.
   */
  show(
    state: AcUiMobileSessionPanelState,
    callbacks: AcUiMobileSessionPanelCallbacks
  ): void {
    this.callbacks = callbacks
    this.open = true
    this.showMetrics = state.showMetrics
    this.root.hidden = false
    this.root.setAttribute('aria-hidden', 'false')
    this.host.classList.add(this.activeClass)
    this.promptEl.textContent = stripPromptColon(state.prompt)
    this.confirmBtn.disabled = !state.allowNone
    this.prepareAccessory()
    this.renderChips(state.keywords)
    if (this.frozenTexts) {
      this.setMetricTexts(this.frozenTexts, this.frozenHasBasePoint)
    } else {
      this.setMetricTexts(ZERO_TEXTS, false)
    }
    this.layoutUnsub?.()
    this.layoutUnsub = this.subscribeLayout?.(() => {
      if (this.open) this.applyMetricVisibility()
    })
    this.applyMetricVisibility()
    this.refreshLabels()
  }

  /**
   * Updates prompt / keywords / ✓ without tearing down the session.
   *
   * @param partial - Fields to update; omitted fields keep current values.
   */
  update(partial: Partial<AcUiMobileSessionPanelState>): void {
    if (!this.open) return
    if (partial.prompt != null) {
      this.promptEl.textContent = stripPromptColon(partial.prompt)
    }
    if (partial.allowNone != null) {
      this.confirmBtn.disabled = !partial.allowNone
    }
    if (partial.keywords) {
      this.renderChips(partial.keywords)
      this.applyMetricVisibility()
    }
    if (partial.showMetrics != null) {
      this.showMetrics = partial.showMetrics
      this.applyMetricVisibility()
    }
  }

  /**
   * Pushes live metric values (read-only; buttons stay disabled for keypad hook).
   *
   * @param hasBasePoint - Whether relative metrics apply.
   * @param texts - Formatted strings for display.
   */
  setMetrics(hasBasePoint: boolean, texts: AcUiMobileSessionMetricTexts): void {
    if (!this.open) return
    this.hasBasePoint = hasBasePoint
    this.frozenTexts = { ...texts }
    this.frozenHasBasePoint = hasBasePoint
    this.setMetricTexts(texts, hasBasePoint)
    this.applyMetricVisibility()
  }

  /** Expands or collapses the panel into compact mode. */
  setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) return
    this.collapsed = collapsed
    this.panel.classList.toggle('is-collapsed', collapsed)
    this.collapseBtn.innerHTML = collapsed ? expandIcon() : collapseIcon()
    this.refreshCollapseLabel()
    if (this.open) this.applyMetricVisibility()
  }

  /** Shows the accessory / title row (custom content slot + help + collapse). */
  prepareAccessory(): void {
    this.accessoryEl.hidden = false
  }

  /** Clears custom accessory content; help / collapse stay while open. */
  clearAccessory(): void {
    this.accessoryContentEl.replaceChildren()
  }

  /** Hides the panel and clears session callbacks. */
  hide(): void {
    this.open = false
    this.callbacks = null
    this.clearAccessory()
    this.accessoryEl.hidden = true
    this.setCollapsed(false)
    this.layoutUnsub?.()
    this.layoutUnsub = undefined
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')
    this.host.classList.remove(this.activeClass)
  }

  /** Re-applies metric / action aria labels from {@link labels}. */
  refreshLabels(): void {
    const t = this.labelsFn()
    this.metricButtons.length.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.length
    this.metricButtons.angle.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.angle
    this.metricButtons.dx.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.dx
    this.metricButtons.dy.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.dy
    this.metricButtons.x.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.x
    this.metricButtons.y.querySelector(
      '.ml-mobile-cmd-metric-label'
    )!.textContent = t.y
    this.confirmBtn.setAttribute('aria-label', t.confirm)
    this.cancelBtn.setAttribute('aria-label', t.cancel)
    this.helpBtn.setAttribute('aria-label', t.help)
    this.refreshCollapseLabel()
    this.helpPanel?.setLabels({ title: t.help, back: t.back })
  }

  /** Removes DOM. */
  dispose(): void {
    this.hide()
    this.accessoryObserver?.disconnect()
    this.accessoryObserver = undefined
    this.helpPanel?.dispose()
    this.helpPanel = null
    this.root.remove()
  }

  /** True when custom session widgets are mounted in the accessory slot. */
  private hasAccessoryWidgets(): boolean {
    return this.accessoryContentEl.childElementCount > 0
  }

  /**
   * Places the prompt (and keyword chips) in the title row when there is no
   * accessory widget; otherwise keeps them on the message row. Compact mode
   * keeps widgets when present, otherwise shows a truncated prompt.
   */
  private syncPromptPlacement(collapsed: boolean): void {
    const hasWidgets = this.hasAccessoryWidgets()
    const promptInTitle = !hasWidgets
    const hasChips = this.chipsEl.childElementCount > 0
    this.panel.classList.toggle('is-prompt-in-title', promptInTitle)
    this.helpBtn.hidden = collapsed

    this.accessoryEl.hidden = false
    this.accessoryEl.appendChild(this.titleActions)
    this.chipsEl.hidden = collapsed || !hasChips

    if (collapsed) {
      this.promptRow.classList.remove('is-in-title')
      if (promptInTitle) {
        this.accessoryEl.insertBefore(this.promptEl, this.titleActions)
        this.promptEl.hidden = false
      } else {
        this.promptEl.hidden = true
        this.promptRow.appendChild(this.promptEl)
      }
      this.promptRow.appendChild(this.chipsEl)
      // Keep an empty prompt row out of the compact chrome.
      if (this.promptRow.parentElement === this.accessoryEl) {
        this.panel.insertBefore(this.promptRow, this.absGroup)
      }
      this.promptRow.hidden = true
      this.accessoryEl.appendChild(this.compactActions)
      this.compactActions.append(this.cancelBtn, this.confirmBtn)
      return
    }

    this.promptEl.hidden = false
    this.compactActions.replaceChildren()
    if (this.compactActions.parentElement === this.accessoryEl) {
      this.compactActions.remove()
    }

    // Prompt + chips share one flex-wrap cluster (title or message band).
    this.promptRow.append(this.promptEl, this.chipsEl)
    this.promptRow.hidden = false

    if (promptInTitle) {
      this.promptRow.classList.add('is-in-title')
      this.accessoryEl.insertBefore(this.promptRow, this.titleActions)
    } else {
      this.promptRow.classList.remove('is-in-title')
      if (this.promptRow.parentElement === this.accessoryEl) {
        this.panel.insertBefore(this.promptRow, this.absGroup)
      }
    }
  }

  private refreshCollapseLabel(): void {
    const t = this.labelsFn()
    this.collapseBtn.setAttribute(
      'aria-label',
      this.collapsed ? t.expand : t.collapse
    )
    this.collapseBtn.setAttribute('aria-expanded', String(!this.collapsed))
  }

  private makeMetricButton(
    id: keyof AcUiMobileSessionMetricTexts
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-mobile-cmd-metric'
    btn.dataset.metric = id
    btn.disabled = true
    const label = document.createElement('span')
    label.className = 'ml-mobile-cmd-metric-label'
    const value = document.createElement('span')
    value.className = 'ml-mobile-cmd-metric-value'
    value.textContent = '0'
    btn.append(label, value)
    return btn
  }

  private setMetricTexts(
    texts: AcUiMobileSessionMetricTexts,
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

  private applyMetricVisibility(): void {
    const relative = this.showMetrics && this.hasBasePoint
    const absolute = this.showMetrics && !this.hasBasePoint
    const phone = this.isPhoneLayout()
    const collapsed = this.collapsed

    this.metricButtons.length.hidden = !relative
    this.metricButtons.angle.hidden = !relative
    this.metricButtons.dx.hidden = !relative
    this.metricButtons.dy.hidden = !relative
    this.metricButtons.x.hidden = !absolute
    this.metricButtons.y.hidden = !absolute

    this.panel.classList.toggle('is-relative', relative && !collapsed)
    this.panel.classList.toggle('is-absolute', absolute && !collapsed)
    this.panel.classList.toggle(
      'is-actions-only',
      !collapsed && !relative && !absolute
    )
    this.panel.classList.toggle('is-collapsed', collapsed)

    this.polarGroup.hidden = collapsed || !relative
    this.deltaGroup.hidden = collapsed || !relative
    this.absStack.hidden = !absolute
    this.absGroup.hidden = collapsed
      ? true
      : phone
        ? relative
        : !absolute
    this.chipsEl.hidden = collapsed || this.chipsEl.childElementCount === 0

    this.syncPromptPlacement(collapsed)

    if (collapsed) {
      // Actions already placed by syncPromptPlacement.
    } else if (phone && relative) {
      this.polarActions.appendChild(this.cancelBtn)
      this.deltaActions.appendChild(this.confirmBtn)
    } else if (phone) {
      this.absActions.append(this.cancelBtn, this.confirmBtn)
    } else {
      this.sharedActions.append(this.cancelBtn, this.confirmBtn)
    }
  }

  private renderChips(keywords: AcUiMobileSessionKeyword[]): void {
    this.chipsEl.replaceChildren()
    this.chipsEl.hidden = this.collapsed || keywords.length === 0
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
        this.callbacks?.onKeyword(kw.id)
      })
      this.sinkPointer(chip)
      this.chipsEl.appendChild(chip)
    }
  }

  private openHelpPanel(): void {
    if (!this.helpPanel) {
      const host =
        typeof this.helpHostOpt === 'function'
          ? this.helpHostOpt()
          : this.helpHostOpt
      this.helpPanel = new AcUiHelpPanel(host ? { host } : undefined)
    }
    const t = this.labelsFn()
    this.helpPanel.showDocs({
      url: this.helpDocsUrl(),
      labels: { title: t.help, back: t.back }
    })
  }

  private sinkPointer(el: HTMLElement): void {
    el.addEventListener('pointerdown', e => {
      e.stopPropagation()
    })
  }

  private static injectCss(): void {
    if (typeof document === 'undefined') return
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = MOBILE_CMD_CSS
  }
}
/** Strips a trailing colon from prompt text. */
function stripPromptColon(message: string): string {
  return message.trim().replace(/[：:]\s*$/, '')
}

function helpIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm1.6-5.35c-.62.36-1 .9-1 1.55h-1.5c0-1.18.6-2.05 1.45-2.55.62-.36.95-.7.95-1.25 0-.7-.55-1.2-1.4-1.2-.9 0-1.45.5-1.55 1.3H8.9C9.1 7.95 10.35 7 12.1 7c1.85 0 3.15 1.05 3.15 2.55 0 .95-.5 1.7-1.65 2.3z"/></svg>'
}

function collapseIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
}

function expandIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>'
}

function cancelIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/></svg>'
}

function confirmIcon(): string {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.36 9.25-9.26 1.4 1.41z"/></svg>'
}

/** CSS for the shared mobile session panel. */
const MOBILE_CMD_CSS = `
  .ml-mobile-cmd {
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
    box-sizing: border-box;
  }
  .ml-mobile-cmd-panel.is-collapsed {
    height: calc(
      var(--ml-mobile-cmd-collapsed-height, 56px) + env(safe-area-inset-bottom, 0px)
    );
    min-height: calc(
      var(--ml-mobile-cmd-collapsed-height, 56px) + env(safe-area-inset-bottom, 0px)
    );
    padding: 0 12px env(safe-area-inset-bottom, 0px);
    gap: 0;
    justify-content: center;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-accessory {
    padding-bottom: 0;
    border-bottom: 0;
    flex: 1;
    min-width: 0;
  }
  .ml-mobile-cmd-prompt-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .ml-mobile-cmd-prompt-row[hidden] {
    display: none;
  }
  .ml-mobile-cmd-prompt-row:not([hidden]) {
    box-sizing: border-box;
    min-height: 32px;
    padding-top: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
  }
  .ml-mobile-cmd-prompt-row.is-in-title {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    padding: 0;
    border-bottom: 0;
  }
  .ml-mobile-cmd-prompt {
    flex: 1 1 10em;
    min-width: min(100%, 8em);
    box-sizing: border-box;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ml-ui-text, #e8eaed);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-prompt {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-prompt[hidden] {
    display: none;
  }
  .ml-mobile-cmd-actions-compact {
    display: none;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 0 0 auto;
    margin-left: 8px;
    padding-left: 0;
    border-left: 0;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-actions-compact {
    display: flex;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-help[hidden] {
    display: none;
  }
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-title-actions {
    margin-left: 0;
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
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-height: 32px;
  }
  .ml-mobile-cmd-accessory:not([hidden]) {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
  }
  .ml-mobile-cmd-accessory[hidden] {
    display: none;
  }
  .ml-mobile-cmd-accessory-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ml-mobile-cmd-accessory-content:empty {
    display: none;
  }
  .ml-mobile-cmd-panel.is-prompt-in-title .ml-mobile-cmd-prompt {
    flex: 1 1 10em;
    min-width: min(100%, 8em);
  }
  .ml-mobile-cmd-panel.is-prompt-in-title .ml-mobile-cmd-chips {
    flex: 0 1 auto;
  }
  .ml-mobile-cmd-title-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0;
    margin-left: auto;
  }
  .ml-mobile-cmd-help,
  .ml-mobile-cmd-collapse {
    box-sizing: border-box;
    flex: 0 0 auto;
    margin: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--ml-ui-muted, #9aa0a6);
    cursor: pointer;
    line-height: 0;
  }
  .ml-mobile-cmd-help:hover,
  .ml-mobile-cmd-help:focus-visible,
  .ml-mobile-cmd-collapse:hover,
  .ml-mobile-cmd-collapse:focus-visible {
    color: var(--ml-ui-accent, #08e8de);
  }
  .ml-mobile-cmd-help svg,
  .ml-mobile-cmd-collapse svg {
    display: block;
    width: 18px;
    height: 18px;
  }
  .ml-mobile-cmd-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 0 1 auto;
    min-width: 0;
  }
  .ml-mobile-cmd-chips:not([hidden]) {
    padding: 0;
    border: 0;
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
  .ml-mobile-cmd-panel.is-collapsed .ml-mobile-cmd-actions-shared {
    display: none !important;
  }
  @media (min-width: ${ML_UI_SESSION_PANEL_WIDTH}px) {
    .ml-mobile-cmd-metric-stack {
      flex-direction: row;
      align-items: center;
      gap: 16px;
    }
    .ml-mobile-cmd-metric {
      flex: 1;
    }
  }
  @media (min-width: ${ML_UI_MOBILE_MAX_WIDTH + 1}px) {
    .ml-mobile-cmd-panel {
      left: 50%;
      right: auto;
      width: ${ML_UI_SESSION_PANEL_WIDTH}px;
      max-width: ${ML_UI_SESSION_PANEL_MAX_WIDTH};
      transform: translateX(-50%);
      border-radius: 12px 12px 0 0;
      border: 1px solid var(--ml-ui-border, rgba(255, 255, 255, 0.12));
      border-bottom: 0;
    }
    .ml-mobile-cmd-panel.is-collapsed {
      width: ${ML_UI_SESSION_PANEL_WIDTH}px;
      max-width: ${ML_UI_SESSION_PANEL_MAX_WIDTH};
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
      column-gap: 8px;
    }
    .ml-mobile-cmd-panel.is-relative {
      grid-template-areas:
        'accessory accessory'
        'prompt prompt'
        'polar shared'
        'delta shared';
    }
    .ml-mobile-cmd-panel.is-absolute {
      grid-template-areas:
        'accessory accessory'
        'prompt prompt'
        'abs shared';
    }
    .ml-mobile-cmd-panel.is-prompt-in-title.is-relative {
      grid-template-areas:
        'accessory accessory'
        'polar shared'
        'delta shared';
    }
    .ml-mobile-cmd-panel.is-prompt-in-title.is-absolute {
      grid-template-areas:
        'accessory accessory'
        'abs shared';
    }
    .ml-mobile-cmd-group-polar { grid-area: polar; }
    .ml-mobile-cmd-group-delta { grid-area: delta; }
    .ml-mobile-cmd-group-abs { grid-area: abs; }
    .ml-mobile-cmd-actions-shared { grid-area: shared; }
    .ml-mobile-cmd-accessory { grid-area: accessory; }
    .ml-mobile-cmd-prompt-row { grid-area: prompt; }
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
    .ml-mobile-cmd-panel.is-collapsed {
      display: flex !important;
      flex-direction: row;
      align-items: center;
      transform: translateX(-50%);
    }
  }
`
