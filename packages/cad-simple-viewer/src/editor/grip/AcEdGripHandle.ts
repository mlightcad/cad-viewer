import { AcGePoint2dLike } from '@mlightcad/data-model'
import { injectMlGripHandleCss } from '@mlightcad/three-renderer'

import {
  type AcEdGripAppearance,
  applyGripAppearanceToHost
} from './AcEdGripAppearance'

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
    injectMlGripHandleCss()

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
    applyGripAppearanceToHost(this._host, appearance)
  }

  destroy() {
    this._el.remove()
  }
}
