import { ML_UI_Z_DRAW_STYLE_TOOLBAR } from '../../global/AcEdUiLayout'
import { acedApplyUiTheme, resolveUiTheme } from '../../global/AcEdUiTheme'

/** DOM id of the injected stylesheet for desktop session accessory chrome. */
const STYLE_ID = 'ml-desktop-session-accessory-styles'

/** CSS rules for the top-center desktop accessory shell. */
const DESKTOP_ACCESSORY_CSS = `
  .ml-desktop-session-accessory {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: ${ML_UI_Z_DRAW_STYLE_TOOLBAR};
    display: none;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    box-sizing: border-box;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 6px;
    background: var(--ml-ui-bg, rgba(255, 255, 255, 0.96));
    box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
    color: var(--ml-ui-text, #303133);
    pointer-events: auto;
  }
  .ml-desktop-session-accessory.is-visible {
    display: inline-flex;
  }
  .ml-desktop-session-accessory__slot {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

/**
 * Top-center slot on the canvas for session accessory widgets on desktop layouts.
 * Callers mount into {@link host}; this chrome only owns shell visibility.
 */
export class AcEdDesktopSessionAccessoryChrome {
  /** Whether {@link injectCss} has already run for this document. */
  private static stylesInjected = false

  /** Outer shell positioned at the top center of the view container. */
  private readonly root: HTMLDivElement
  /** Inner mount row that receives accessory controls. */
  private readonly slot: HTMLDivElement

  /**
   * @param container - View container that receives the accessory overlay.
   */
  constructor(container: HTMLElement) {
    AcEdDesktopSessionAccessoryChrome.injectCss()

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }

    this.root = document.createElement('div')
    this.root.className = 'ml-desktop-session-accessory'
    this.root.hidden = true
    this.root.setAttribute('aria-hidden', 'true')

    this.slot = document.createElement('div')
    this.slot.className = 'ml-desktop-session-accessory__slot'
    this.root.appendChild(this.slot)
    this.sinkPointer(this.root)
    this.sinkPointer(this.slot)

    acedApplyUiTheme(resolveUiTheme(container), this.root)
    container.appendChild(this.root)
  }

  /** Mount row for session accessories. */
  get host(): HTMLElement {
    return this.slot
  }

  /** Shows the desktop accessory shell. */
  prepare(): void {
    this.root.hidden = false
    this.root.classList.add('is-visible')
    this.root.setAttribute('aria-hidden', 'false')
  }

  /** Hides the shell and clears the mount row. */
  clear(): void {
    this.slot.replaceChildren()
    this.root.hidden = true
    this.root.classList.remove('is-visible')
    this.root.setAttribute('aria-hidden', 'true')
  }

  /** Removes DOM. */
  dispose(): void {
    this.clear()
    this.root.remove()
  }

  /**
   * Stops `pointerdown` from bubbling to the canvas.
   *
   * @param el - Element that should absorb pointer-down events.
   */
  private sinkPointer(el: HTMLElement): void {
    el.addEventListener('pointerdown', event => {
      event.stopPropagation()
    })
  }

  /** Injects desktop accessory styles once into the document head. */
  private static injectCss(): void {
    if (this.stylesInjected) return
    if (typeof document === 'undefined') return
    this.stylesInjected = true
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = DESKTOP_ACCESSORY_CSS
    document.head.appendChild(style)
  }
}
