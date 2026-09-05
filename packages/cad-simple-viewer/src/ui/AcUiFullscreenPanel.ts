/**
 * Portable full-screen panel chrome (DOM + CSS only).
 *
 * Base for mobile “push” screens: header with back (`<`) + centered title and a
 * content region. Re-exported from
 * `@mlightcad/cad-simple-viewer/fullscreen-panel` so the offline HTML viewer
 * IIFE can import it without loading the rest of the viewer barrel.
 *
 * Callers supply localized labels — this module does not depend on i18n.
 */

/** DOM id of the injected stylesheet. */
const STYLE_ID = 'ml-ui-fullscreen-panel-styles'

/** History state marker written by {@link AcUiFullscreenPanel.show}. */
const HISTORY_STATE_KEY = 'mlcadFullscreenPanel'

/** Localized chrome strings for {@link AcUiFullscreenPanel}. */
export interface AcUiFullscreenPanelLabels {
  /** Header title (centered). */
  title: string
  /** Accessible name for the back (`<`) control. */
  back: string
}

/** Options for constructing {@link AcUiFullscreenPanel}. */
export interface AcUiFullscreenPanelOptions {
  /**
   * Element that receives the panel DOM. Defaults to `document.body`.
   * Offline HTML typically passes `#mlcad-root`.
   */
  host?: HTMLElement
  /**
   * Extra CSS class on the root (in addition to `ml-ui-fullscreen-panel`).
   * Useful for specialized subclasses (e.g. help).
   */
  rootClassName?: string
}

/**
 * Mobile-style full-screen overlay with a nav header and content body.
 *
 * Subclasses append widgets to {@link bodyEl}. Opening optionally pushes a
 * history entry so the system / gesture back dismisses the panel; the header
 * back control closes the UI immediately (iframe navigations can insert extra
 * history entries that would otherwise consume the first `history.back()`).
 */
export class AcUiFullscreenPanel {
  private static stylesInjected = false
  private static nextTitleId = 0

  private readonly mountHost: HTMLElement
  private readonly root: HTMLDivElement
  private readonly titleEl: HTMLSpanElement
  private readonly backBtn: HTMLButtonElement
  private readonly body: HTMLDivElement
  private readonly onPopState = () => this.onHistoryPop()
  private visible = false
  private historyPushed = false
  private labels: AcUiFullscreenPanelLabels = { title: '', back: 'Back' }

  /**
   * @param options - Optional mount host and root class.
   */
  constructor(options: AcUiFullscreenPanelOptions = {}) {
    AcUiFullscreenPanel.injectCss()

    this.mountHost = options.host ?? document.body

    this.root = document.createElement('div')
    this.root.className = ['ml-ui-fullscreen-panel', options.rootClassName]
      .filter(Boolean)
      .join(' ')
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')
    this.root.setAttribute('role', 'dialog')
    this.root.setAttribute('aria-modal', 'true')

    const header = document.createElement('header')
    header.className = 'ml-ui-fullscreen-panel__header'

    this.backBtn = document.createElement('button')
    this.backBtn.type = 'button'
    this.backBtn.className = 'ml-ui-fullscreen-panel__back'
    this.backBtn.innerHTML = backChevronIcon()
    this.backBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.requestClose()
    })

    this.titleEl = document.createElement('span')
    this.titleEl.className = 'ml-ui-fullscreen-panel__title'
    this.titleEl.id = `ml-ui-fullscreen-panel-title-${AcUiFullscreenPanel.nextTitleId++}`
    this.root.setAttribute('aria-labelledby', this.titleEl.id)

    // Trailing spacer mirrors the back button so the title stays optically centered.
    const spacer = document.createElement('span')
    spacer.className = 'ml-ui-fullscreen-panel__spacer'
    spacer.setAttribute('aria-hidden', 'true')

    header.append(this.backBtn, this.titleEl, spacer)

    this.body = document.createElement('div')
    this.body.className = 'ml-ui-fullscreen-panel__body'

    this.root.append(header, this.body)
    this.mountHost.appendChild(this.root)
    this.applyLabels(this.labels)
  }

  /** Content host for subclasses / callers. */
  get bodyEl(): HTMLElement {
    return this.body
  }

  /** Root overlay element. */
  get rootEl(): HTMLElement {
    return this.root
  }

  /** Whether the panel is currently shown. */
  get isOpen(): boolean {
    return this.visible
  }

  /**
   * Shows the panel. Pushes a history entry the first time so system back can
   * dismiss it.
   *
   * @param labels - Localized title and back aria-label.
   */
  show(labels: AcUiFullscreenPanelLabels): void {
    this.applyLabels(labels)

    if (this.visible) return

    this.visible = true
    this.root.hidden = false
    this.root.setAttribute('aria-hidden', 'false')
    document.body.classList.add('ml-ui-fullscreen-panel-open')

    try {
      history.pushState({ [HISTORY_STATE_KEY]: true }, '')
      this.historyPushed = true
      window.addEventListener('popstate', this.onPopState)
    } catch {
      this.historyPushed = false
    }

    this.backBtn.focus()
  }

  /**
   * Updates chrome labels without changing the open/closed state.
   *
   * @param labels - Localized title and back aria-label.
   */
  setLabels(labels: AcUiFullscreenPanelLabels): void {
    this.applyLabels(labels)
  }

  /**
   * Closes via the header back control. Hides immediately, then unwinds at most
   * one history entry we pushed (does not wait on `popstate`, so iframe-added
   * history entries cannot steal the first tap).
   */
  requestClose(): void {
    if (!this.visible) return
    const pushed = this.historyPushed
    this.detachHistory()
    this.hideUi()
    if (!pushed) return
    // Swallow the popstate from our intentional history.back() so it does not
    // race with a later open.
    const swallow = () => {
      window.removeEventListener('popstate', swallow)
    }
    window.addEventListener('popstate', swallow)
    try {
      history.back()
    } catch {
      window.removeEventListener('popstate', swallow)
    }
  }

  /** Tears down DOM and history listeners. */
  dispose(): void {
    if (this.visible && this.historyPushed) {
      this.detachHistory()
      const swallow = () => {
        window.removeEventListener('popstate', swallow)
      }
      window.addEventListener('popstate', swallow)
      try {
        history.back()
      } catch {
        window.removeEventListener('popstate', swallow)
      }
    } else {
      this.detachHistory()
    }
    this.hideUi()
    this.root.remove()
  }

  /** Hook for subclasses when the panel is hidden. */
  protected onHidden(): void {
    // no-op
  }

  private applyLabels(labels: AcUiFullscreenPanelLabels): void {
    this.labels = labels
    this.titleEl.textContent = labels.title
    this.backBtn.setAttribute('aria-label', labels.back)
  }

  private onHistoryPop(): void {
    this.historyPushed = false
    this.detachHistory()
    this.hideUi()
  }

  private detachHistory(): void {
    window.removeEventListener('popstate', this.onPopState)
    this.historyPushed = false
  }

  private hideUi(): void {
    if (!this.visible) {
      this.onHidden()
      return
    }
    this.visible = false
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('ml-ui-fullscreen-panel-open')
    this.onHidden()
  }

  private static injectCss(): void {
    if (this.stylesInjected) return
    if (typeof document === 'undefined') return
    this.stylesInjected = true
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = FULLSCREEN_PANEL_CSS
    document.head.appendChild(style)
  }
}

/** Left-pointing chevron for the back control. */
function backChevronIcon(): string {
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>'
}

const FULLSCREEN_PANEL_CSS = `
  body.ml-ui-fullscreen-panel-open {
    overflow: hidden;
  }
  .ml-ui-fullscreen-panel {
    position: fixed;
    inset: 0;
    z-index: 10060;
    display: flex;
    flex-direction: column;
    background: var(--ml-ui-bg, var(--mlcad-ui-bg, #1c1e22));
    color: var(--ml-ui-text, var(--mlcad-ui-text, #e8eaed));
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .ml-ui-fullscreen-panel[hidden] {
    display: none !important;
  }
  .ml-ui-fullscreen-panel__header {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    column-gap: 4px;
    min-height: 48px;
    padding-top: env(safe-area-inset-top, 0px);
    padding-left: max(4px, env(safe-area-inset-left, 0px));
    padding-right: max(4px, env(safe-area-inset-right, 0px));
    border-bottom: 1px solid var(--ml-ui-border, var(--mlcad-ui-border, rgba(255, 255, 255, 0.12)));
    background: var(--ml-ui-bg-elevated, var(--mlcad-ui-bg-elevated, rgba(28, 30, 34, 0.98)));
  }
  .ml-ui-fullscreen-panel__back {
    box-sizing: border-box;
    grid-column: 1;
    justify-self: start;
    width: 44px;
    height: 44px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--ml-ui-accent, var(--mlcad-accent, #08e8de));
    cursor: pointer;
    line-height: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .ml-ui-fullscreen-panel__back:active {
    background: rgba(255, 255, 255, 0.08);
  }
  .ml-ui-fullscreen-panel__back svg {
    display: block;
  }
  .ml-ui-fullscreen-panel__title {
    grid-column: 2;
    min-width: 0;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ml-ui-fullscreen-panel__spacer {
    grid-column: 3;
    width: 44px;
    height: 44px;
    justify-self: end;
  }
  .ml-ui-fullscreen-panel__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
`
