import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdGripAppearance } from './AcEdGripAppearance'

/** Visual state of a grip handle. */
export type AcEdGripHandleState = 'normal' | 'hover' | 'hot'

/**
 * Interactive DOM grip square rendered in container-local screen coordinates.
 */
export class AcEdGripHandle {
  private readonly _el: HTMLElement
  private _state: AcEdGripHandleState = 'normal'

  constructor(
    private readonly _host: HTMLElement,
    appearance: AcEdGripAppearance
  ) {
    AcEdGripHandle.injectCSS()

    const hostPosition = getComputedStyle(this._host).position
    if (hostPosition === 'static') {
      this._host.style.position = 'relative'
    }

    this._el = document.createElement('div')
    this._el.className = 'ml-grip-handle ml-grip-handle-normal'
    this.applyAppearance(appearance)
    this._host.appendChild(this._el)
  }

  get element(): HTMLElement {
    return this._el
  }

  get state(): AcEdGripHandleState {
    return this._state
  }

  setState(state: AcEdGripHandleState) {
    if (this._state === state) return
    this._state = state
    this._el.className = `ml-grip-handle ml-grip-handle-${state}`
  }

  setPosition(pos: AcGePoint2dLike) {
    this._el.style.left = `${pos.x}px`
    this._el.style.top = `${pos.y}px`
  }

  applyAppearance(appearance: AcEdGripAppearance) {
    this._el.style.width = `${appearance.size}px`
    this._el.style.height = `${appearance.size}px`
    this._el.style.setProperty('--ml-ui-grip-normal', appearance.colorCss)
    this._el.style.setProperty('--ml-ui-grip-hot', appearance.hotColorCss)
  }

  destroy() {
    this._el.remove()
  }

  private static injectCSS() {
    if (document.getElementById('ml-grip-handle-style')) return

    const style = document.createElement('style')
    style.id = 'ml-grip-handle-style'
    style.textContent = `
      .ml-grip-handle {
        position: absolute;
        pointer-events: auto;
        transform: translate(-50%, -50%);
        z-index: 5;
        box-sizing: border-box;
        cursor: pointer;
      }

      .ml-grip-handle-normal {
        background: var(--ml-ui-grip-normal, #0080ff);
      }

      .ml-grip-handle-hover,
      .ml-grip-handle-hot {
        background: var(--ml-ui-grip-hot, #ff0000);
      }
    `
    document.head.appendChild(style)
  }
}
