import type { AcEdSessionAccessory } from '../../command/AcEdSessionAccessory'
import { ML_UI_Z_DRAW_STYLE_TOOLBAR } from '../../global/AcEdUiLayout'
import { acedApplyUiTheme, resolveUiTheme } from '../../global/AcEdUiTheme'

const STYLE_ID = 'ml-desktop-session-accessory-styles'

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
 * Top-center slot on the canvas for {@link AcEdSessionAccessory} widgets on
 * desktop layouts.
 */
export class AcEdDesktopSessionAccessoryChrome {
  private static stylesInjected = false

  private readonly root: HTMLDivElement
  private readonly slot: HTMLDivElement
  private accessory: AcEdSessionAccessory | null = null

  /**
   * @param host - View container that receives the accessory overlay.
   */
  constructor(host: HTMLElement) {
    AcEdDesktopSessionAccessoryChrome.injectCss()

    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
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

    acedApplyUiTheme(resolveUiTheme(host), this.root)
    host.appendChild(this.root)
  }

  /** Whether an accessory is currently mounted. */
  get hasAccessory(): boolean {
    return this.accessory != null
  }

  /**
   * Mounts `next`, replacing any prior accessory with the same or different id.
   *
   * @param next - Accessory to show, or `null` to clear the slot.
   */
  setAccessory(next: AcEdSessionAccessory | null): void {
    if ((this.accessory?.id ?? null) === (next?.id ?? null) && next != null) {
      return
    }
    this.accessory?.unmount()
    this.slot.replaceChildren()
    this.accessory = next
    if (next) {
      this.root.hidden = false
      this.root.classList.add('is-visible')
      this.root.setAttribute('aria-hidden', 'false')
      next.mount(this.slot)
    } else {
      this.root.hidden = true
      this.root.classList.remove('is-visible')
      this.root.setAttribute('aria-hidden', 'true')
    }
  }

  /** Removes DOM and unmounts any active accessory. */
  dispose(): void {
    this.setAccessory(null)
    this.root.remove()
  }

  private sinkPointer(el: HTMLElement): void {
    el.addEventListener('pointerdown', event => {
      event.stopPropagation()
    })
  }

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
