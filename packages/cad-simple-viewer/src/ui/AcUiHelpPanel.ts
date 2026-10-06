/**
 * Full-screen help browser built on {@link AcUiFullscreenPanel}.
 *
 * Loads a docs URL in an iframe. Portable (no i18n dependency).
 */

import {
  AcUiFullscreenPanel,
  type AcUiFullscreenPanelLabels,
  type AcUiFullscreenPanelOptions
} from './AcUiFullscreenPanel'

/** Localized chrome strings for {@link AcUiHelpPanel}. */
export type AcUiHelpPanelLabels = AcUiFullscreenPanelLabels

/** Options for constructing {@link AcUiHelpPanel}. */
export type AcUiHelpPanelOptions = AcUiFullscreenPanelOptions

/** Options for {@link AcUiHelpPanel.show}. */
export interface AcUiHelpPanelShowOptions {
  /** Absolute docs URL loaded in the iframe. */
  url: string
  /** Localized title and back aria-label. */
  labels: AcUiHelpPanelLabels
}

/**
 * Mobile full-screen help overlay (nav chrome + docs iframe).
 */
export class AcUiHelpPanel extends AcUiFullscreenPanel {
  private readonly frameWrap: HTMLDivElement
  private readonly iframe: HTMLIFrameElement
  private readonly loadingEl: HTMLDivElement
  private readonly onFrameLoad = () => this.setLoading(false)
  private loading = false

  /**
   * @param options - Optional mount host for the overlay root.
   */
  constructor(options: AcUiHelpPanelOptions = {}) {
    super({
      ...options,
      rootClassName: ['ml-ui-help-panel', options.rootClassName]
        .filter(Boolean)
        .join(' ')
    })

    this.frameWrap = document.createElement('div')
    this.frameWrap.className = 'ml-ui-help-panel__frame-wrap'

    this.iframe = document.createElement('iframe')
    this.iframe.className = 'ml-ui-help-panel__frame'
    this.iframe.title = 'Help'
    this.iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
    this.iframe.addEventListener('load', this.onFrameLoad)

    this.loadingEl = document.createElement('div')
    this.loadingEl.className = 'ml-ui-help-panel__loading'
    this.loadingEl.setAttribute('aria-hidden', 'true')
    this.loadingEl.innerHTML =
      '<div class="ml-ui-help-panel__spinner" aria-hidden="true"></div>'

    this.frameWrap.append(this.iframe, this.loadingEl)
    this.bodyEl.appendChild(this.frameWrap)
    AcUiHelpPanel.injectHelpCss()
  }

  /**
   * Shows the panel and loads `url`.
   *
   * @param options - Docs URL and localized chrome labels.
   */
  showDocs(options: AcUiHelpPanelShowOptions): void {
    this.iframe.title = options.labels.title
    const nextUrl = options.url
    const currentSrc = this.iframe.getAttribute('src')
    if (currentSrc !== nextUrl) {
      this.setLoading(true)
      this.iframe.src = nextUrl
    } else if (!this.loading) {
      // Already showing this document — keep content visible.
      this.setLoading(false)
    }
    this.show(options.labels)
  }

  /**
   * Updates chrome labels without changing the open/closed state.
   *
   * @param labels - Localized title and back aria-label.
   */
  override setLabels(labels: AcUiHelpPanelLabels): void {
    this.iframe.title = labels.title
    super.setLabels(labels)
  }

  override dispose(): void {
    this.iframe.removeEventListener('load', this.onFrameLoad)
    super.dispose()
  }

  protected override onHidden(): void {
    this.setLoading(false)
    // Drop the document so a later open with the same URL still reloads if needed.
    this.iframe.removeAttribute('src')
  }

  private setLoading(active: boolean): void {
    this.loading = active
    this.loadingEl.classList.toggle('is-active', active)
    this.loadingEl.setAttribute('aria-hidden', active ? 'false' : 'true')
    this.loadingEl.setAttribute('aria-busy', active ? 'true' : 'false')
    this.rootEl.classList.toggle('is-loading', active)
  }

  private static helpStylesInjected = false

  private static injectHelpCss(): void {
    if (this.helpStylesInjected) return
    if (typeof document === 'undefined') return
    this.helpStylesInjected = true
    const style = document.createElement('style')
    style.id = 'ml-ui-help-panel-styles'
    style.textContent = `
      .ml-ui-help-panel__frame-wrap {
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: #fff;
      }
      .ml-ui-help-panel__frame {
        flex: 1;
        width: 100%;
        min-height: 0;
        border: 0;
        background: #fff;
        opacity: 1;
        transition: opacity 0.18s ease;
      }
      .ml-ui-help-panel.is-loading .ml-ui-help-panel__frame {
        opacity: 0;
      }
      .ml-ui-help-panel__loading {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        background: var(--ml-ui-bg, var(--mlcad-ui-bg, #1c1e22));
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.18s ease, visibility 0.18s ease;
      }
      .ml-ui-help-panel__loading.is-active {
        opacity: 1;
        visibility: visible;
      }
      .ml-ui-help-panel__spinner {
        box-sizing: border-box;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.18);
        border-top-color: var(--ml-ui-accent, var(--mlcad-accent, #08e8de));
        animation: ml-ui-help-panel-spin 0.75s linear infinite;
      }
      @keyframes ml-ui-help-panel-spin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }
}
