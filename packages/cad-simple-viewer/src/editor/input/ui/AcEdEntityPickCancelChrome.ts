/**
 * Mobile-only cancel control shown while an entity pick prompt is active.
 *
 * Positioned at the top-right of the view, below an optional message / status
 * bar so prompts do not cover the button.
 *
 * @module AcEdEntityPickCancelChrome
 * @packageDocumentation
 */

import { createIconElement, ICON_CLOSE } from '../../../ui/icons'
import { ML_UI_Z_ENTITY_PICK_CANCEL } from '../../global/AcEdUiLayout'
import { acedApplyUiTheme, resolveUiTheme } from '../../global/AcEdUiTheme'

const STYLE_ID = 'ml-entity-pick-cancel-styles'

const CANCEL_CSS = `
  .ml-entity-pick-cancel {
    position: absolute;
    top: 48px;
    right: 12px;
    z-index: ${ML_UI_Z_ENTITY_PICK_CANCEL};
    width: 36px;
    height: 36px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 8px;
    background: var(--ml-ui-bg, rgba(255, 255, 255, 0.96));
    box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
    color: var(--ml-ui-text, #303133);
    cursor: pointer;
    pointer-events: auto;
    box-sizing: border-box;
  }
  .ml-entity-pick-cancel[hidden] {
    display: none !important;
  }
  .ml-entity-pick-cancel .ml-ex-ui-icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
  }
  .ml-entity-pick-cancel .ml-ex-ui-icon svg {
    width: 18px;
    height: 18px;
  }
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CANCEL_CSS
  document.head.appendChild(style)
}

/** Options for {@link AcEdEntityPickCancelChrome}. */
export interface AcEdEntityPickCancelChromeOptions {
  /** View container that hosts the button. */
  container: HTMLElement
  /** Click cancels the active entity pick. */
  onCancel: () => void
  /** Accessible label. @defaultValue `'Cancel'` */
  label?: string
  /**
   * CSS top offset so the button sits below a message / status bar.
   * @defaultValue `48`
   */
  topOffsetPx?: number
}

/**
 * Shows a floating X button used to abort entity selection on mobile layouts.
 */
export class AcEdEntityPickCancelChrome {
  private readonly button: HTMLButtonElement
  private readonly onCancel: () => void
  private visible = false

  /**
   * @param options - Host container and cancel callback.
   */
  constructor(private readonly options: AcEdEntityPickCancelChromeOptions) {
    ensureStyles()
    this.onCancel = options.onCancel

    if (getComputedStyle(options.container).position === 'static') {
      options.container.style.position = 'relative'
    }

    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'ml-entity-pick-cancel'
    this.button.hidden = true
    const label = options.label ?? 'Cancel'
    this.button.title = label
    this.button.setAttribute('aria-label', label)
    if (options.topOffsetPx != null) {
      this.button.style.top = `${options.topOffsetPx}px`
    }
    this.button.appendChild(createIconElement(ICON_CLOSE))
    this.button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.onCancel()
    })
    acedApplyUiTheme(resolveUiTheme(options.container), this.button)
    options.container.appendChild(this.button)
  }

  /**
   * Updates the accessible label.
   *
   * @param label - New label.
   */
  setLabel(label: string): void {
    this.button.title = label
    this.button.setAttribute('aria-label', label)
  }

  /**
   * Positions the button below a message / status bar.
   *
   * @param topOffsetPx - CSS top in pixels.
   */
  setTopOffset(topOffsetPx: number): void {
    this.button.style.top = `${topOffsetPx}px`
  }

  /** Shows the cancel button. */
  show(): void {
    this.visible = true
    this.button.hidden = false
    acedApplyUiTheme(resolveUiTheme(this.options.container), this.button)
  }

  /** Hides the cancel button. */
  hide(): void {
    this.visible = false
    this.button.hidden = true
  }

  /** Whether the button is currently shown. */
  get isVisible(): boolean {
    return this.visible
  }

  /** Removes the button from the DOM. */
  dispose(): void {
    this.button.remove()
  }
}
