/**
 * Configuration options for {@link AcApProgress}.
 */
export interface AcApProgressOptions {
  /**
   * Host element where overlay is mounted.
   * Use the CAD view container so mask is scoped to canvas area.
   * @defaultValue `document.body`
   */
  host?: HTMLElement

  /**
   * Size of the circular loader (width & height).
   * Accepts any valid CSS length value (e.g. "48px", "3rem", "25%").
   * @defaultValue `"48px"`
   */
  size?: string

  /**
   * Width of the spinner border stroke.
   * Should be a valid CSS length value.
   * @defaultValue `"5px"`
   */
  borderWidth?: string

  /**
   * Color of the animated spinner arc.
   * Accepts any valid CSS color format.
   * @defaultValue `"#0b84ff"`
   */
  color?: string

  /**
   * Whether a fullscreen overlay background is shown.
   * @defaultValue `true`
   */
  overlay?: boolean

  /**
   * Background color used when {@link overlay} is enabled.
   * @defaultValue `"rgba(0,0,0,0.18)"`
   */
  overlayColor?: string

  /**
   * Optional message text displayed under the spinner.
   * Hidden automatically if empty or undefined.
   * @defaultValue `""`
   */
  message?: string
}

/**
 * Displays a centered infinite circular loading indicator with optional text.
 *
 * Features:
 * - Framework-free — pure TypeScript & DOM
 * - Auto-injects required CSS once per document
 * - Shows/hides without removing DOM
 * - Dynamically update message text
 * - Safe for multiple instances
 *
 * @example
 * ```ts
 * const progress = new AcApProgress({ message: "Loading data…" });
 * progress.show();
 *
 * setTimeout(() => {
 *   progress.setMessage("Almost done…");
 * }, 1500);
 *
 * // progress.hide();
 * // progress.destroy();
 * ```
 */
export class AcApProgress {
  /**
   * ID assigned to the injected `<style>` element.
   * Used to ensure styles are only injected once.
   */
  public static readonly styleId: string = 'ml-ccl-loader-styles'

  /**
   * Tracks whether component CSS has already been injected.
   */
  public static stylesInjected = false

  /**
   * Root overlay container element appended to the configured host.
   */
  public root!: HTMLDivElement

  /**
   * Spinner circle element.
   */
  public spinner!: HTMLDivElement

  /**
   * Message text element displayed under the spinner.
   */
  public messageEl!: HTMLDivElement

  /**
   * Immutable resolved configuration for this instance.
   */
  public readonly options: Required<AcApProgressOptions>

  /**
   * Creates a new fullscreen infinite progress indicator.
   *
   * @param options - Optional {@link AcApProgressOptions} controlling appearance & behavior
   */
  constructor(options: AcApProgressOptions = {}) {
    this.options = {
      size: options.size ?? '48px',
      borderWidth: options.borderWidth ?? '5px',
      color: options.color ?? '#0b84ff',
      host: options.host ?? document.body,
      overlay: options.overlay ?? true,
      overlayColor: options.overlayColor ?? 'rgba(0,0,0,0.5)',
      message: options.message ?? ''
    }

    if (!AcApProgress.stylesInjected) {
      this.injectStyles()
    }

    this.createDom()
  }

  /**
   * Makes the progress indicator visible.
   * The DOM remains mounted for efficiency.
   *
   * @returns The current {@link AcApProgress} instance (for chaining)
   */
  public show(): this {
    this.root.style.display = 'flex'
    return this
  }

  /**
   * Hides the progress indicator without removing it from the DOM.
   *
   * @returns The current {@link AcApProgress} instance (for chaining)
   */
  public hide(): this {
    this.root.style.display = 'none'
    return this
  }

  /**
   * Updates the displayed message text beneath the spinner.
   *
   * If the message is empty or undefined, the message element is hidden.
   *
   * @param text - New message text
   * @returns The current {@link AcApProgress} instance (for chaining)
   */
  public setMessage(text = ''): this {
    this.messageEl.textContent = text
    this.messageEl.style.display = text ? 'block' : 'none'
    return this
  }

  /**
   * Completely removes the component from the DOM.
   * Safe to call multiple times.
   */
  public destroy(): void {
    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
  }

  /**
   * Creates required DOM elements and mounts them into configured host.
   * Called automatically by constructor.
   */
  private createDom(): void {
    const host = this.options.host
    const hostPosition = getComputedStyle(host).position
    if (hostPosition === 'static') {
      host.style.position = 'relative'
    }

    const root = document.createElement('div')
    root.className = 'ml-ccl-overlay'
    root.style.display = 'flex'
    root.style.background = this.options.overlay
      ? this.options.overlayColor
      : 'transparent'

    const spinner = document.createElement('div')
    spinner.className = 'ml-ccl-spinner'
    spinner.style.width = this.options.size
    spinner.style.height = this.options.size
    spinner.style.borderWidth = this.options.borderWidth
    spinner.style.borderTopColor = this.options.color

    const message = document.createElement('div')
    message.className = 'ml-ccl-message'
    message.textContent = this.options.message
    message.style.display = this.options.message ? 'block' : 'none'

    const wrapper = document.createElement('div')
    wrapper.className = 'ml-ccl-wrapper'
    wrapper.appendChild(spinner)
    wrapper.appendChild(message)

    root.appendChild(wrapper)
    host.appendChild(root)

    this.root = root
    this.spinner = spinner
    this.messageEl = message
  }

  /**
   * Injects required CSS into the document `<head>` if not already present.
   * Called automatically and only once globally.
   */
  private injectStyles(): void {
    if (document.getElementById(AcApProgress.styleId)) {
      AcApProgress.stylesInjected = true
      return
    }

    const css = `
  .ml-ccl-overlay {
    position: absolute;
    inset: 0;
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    pointer-events: auto;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
  }
  
  .ml-ccl-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .ml-ccl-spinner {
    border-radius: 50%;
    border-style: solid;
    border-color: rgba(0,0,0,0.25);
    border-top-color: #0b84ff;
    animation: ml-ccl-rotate 0.85s linear infinite;
    box-sizing: border-box;
  }
  
  .ml-ccl-message {
    margin-top: 12px;
    font-size: 14px;
    color: #FFF;
    text-align: center;
    user-select: none;
  }
  
  @keyframes ml-ccl-rotate {
    to { transform: rotate(360deg); }
  }
      `.trim()

    const style = document.createElement('style')
    style.id = AcApProgress.styleId
    style.textContent = css
    document.head.appendChild(style)

    AcApProgress.stylesInjected = true
  }
}
