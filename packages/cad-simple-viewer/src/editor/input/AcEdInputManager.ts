import { AcGeBox2d, AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdBaseView } from '../view'

export interface AcEdPosition {
  world: AcGePoint2dLike
  screen: AcGePoint2dLike
}

/**
 * AcEdInputManager
 * -----------------
 * A fully type-safe TypeScript class providing CAD-style interactive user input
 * using floating HTML input boxes and mouse events. Supports collecting points,
 * distances, angles, numbers, strings, and selecting a 2-point rectangular box
 * using an HTML overlay rectangle (suitable when the main canvas is a THREE.js
 * WebGL canvas).
 */
export class AcEdInputManager {
  /** The view associated with this input operation */
  protected view: AcEdBaseView

  /** The HTML canvas element (e.g. the THREE.js renderer.domElement). */
  private canvas: HTMLCanvasElement

  /** Cached bounding rect of the canvas. Updated at construction and on demand. */
  private rect: DOMRect

  /** Currently active resolver for the awaiting promise (set by makePromise). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeResolver: ((value: any) => void) | null = null

  /** The currently visible floating input element (if any). */
  private inputEl: HTMLDivElement | null = null

  /** The overlay DIV used to preview the selection rectangle for getBox. */
  private previewRectEl: HTMLDivElement | null = null

  /** Last known mouse position relative to the canvas top-left. */
  private mouse: AcGePoint2dLike = { x: 0, y: 0 }

  /** Handler reference for Escape key cancellation. */
  private escHandler: ((e: KeyboardEvent) => void) | null = null

  /** Handler reference for canvas click events used to accept mouse input. */
  private clickHandler: ((e: MouseEvent) => void) | null = null

  /** Optional preview callback invoked on mousemove to update the preview rect. */
  private drawPreview: (() => void) | null = null

  /**
   * Construct the manager and attach mousemove listener used for floating input
   * positioning and live preview updates.
   *
   * @param canvas The canvas element (usually THREE.js renderer.domElement)
   */
  constructor(view: AcEdBaseView) {
    this.view = view
    const canvas = view.canvas
    this.canvas = canvas
    this.rect = canvas.getBoundingClientRect()

    this.injectCSS()

    // Update mouse position and adjust floating input position / preview
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouse.x = e.clientX - this.rect.left
      this.mouse.y = e.clientY - this.rect.top

      if (this.inputEl) {
        // Proposed new position near cursor
        const left = e.clientX + 12
        const top = e.clientY + 12

        // Measure actual input size
        const rect = this.inputEl.getBoundingClientRect()
        const width = rect.width || 160 // fallback if width=0
        const height = rect.height || 28 // fallback if height=0

        // Clamp to canvas
        const pos = this.clampToCanvas(left, top, width, height)

        // Apply clamped position
        this.inputEl.style.left = `${pos.left}px`
        this.inputEl.style.top = `${pos.top}px`
      }

      if (this.drawPreview) this.drawPreview()
    })

    // Update rect on window resize to keep coordinates correct
    window.addEventListener(
      'resize',
      () => (this.rect = canvas.getBoundingClientRect())
    )
  }

  /**
   * Injects minimal CSS required for the floating input and preview rectangle.
   * Useful when you do not have a separate CSS file.
   */
  private injectCSS() {
    const style = document.createElement('style')
    style.textContent = `
      .floating-input {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        background: #444; /* gray background for container */
        color: #fff; /* white text for message */
        border: none;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
      }
      .floating-input input {
        font-size: 12px;
        padding: 2px 4px;
        height: 22px;
        width: 90px; /* wider to show coordinates */
        background: #888; /* gray background for input */
        border: 1px solid #666; /* subtle border */
        border-radius: 2px;
      }
      .floating-input input.invalid {
        border-color: red;
        color: red;
      }
      .aced-label {
        white-space: nowrap;
        color: #fff; /* white label text */
      }
      .aced-preview-rect {
        position: absolute;
        border: 1px dashed #0f0;
        background: rgba(0, 255, 0, 0.04);
        pointer-events: none;
        z-index: 9999;
      }
    `
    document.head.appendChild(style)
  }

  /** Clamp a box to stay fully inside the canvas area */
  private clampToCanvas(
    left: number,
    top: number,
    width: number,
    height: number
  ) {
    const r = this.rect

    // clamp left & top
    if (left < r.left) left = r.left
    if (top < r.top) top = r.top

    // clamp right & bottom
    const maxLeft = r.right - width
    const maxTop = r.bottom - height

    if (left > maxLeft) left = maxLeft
    if (top > maxTop) top = maxTop

    return { left, top }
  }

  /**
   * Create and show a floating HTML input form positioned near the mouse.
   * @param message The message label
   * @param twoInputs Whether to create two input boxes (e.g., for getPoint)
   * @returns The created DIV containing inputs
   */
  private createInputBox(message = '', twoInputs = false) {
    const container = document.createElement('div')
    container.className = 'floating-input'

    const label = document.createElement('span')
    label.className = 'aced-label'
    label.textContent = message
    container.appendChild(label)

    const inputX = document.createElement('input')
    inputX.type = 'text'
    container.appendChild(inputX)

    let inputY: HTMLInputElement | null = null
    if (twoInputs) {
      inputY = document.createElement('input')
      inputY.type = 'text'
      container.appendChild(inputY)
    }

    document.body.appendChild(container)
    this.inputEl = container

    // Position near mouse
    const rect = container.getBoundingClientRect()
    const pos = this.clampToCanvas(
      this.mouse.x + this.rect.left + 12,
      this.mouse.y + this.rect.top + 12,
      rect.width || 160,
      rect.height || 28
    )
    container.style.left = `${pos.left}px`
    container.style.top = `${pos.top}px`

    // Focus/select after mount
    setTimeout(() => {
      if (inputY) inputY.select()
      inputX.focus()
      inputX.select()
    }, 0)

    // Tab switching with selection
    if (inputY) {
      inputX.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          e.preventDefault()
          inputY.focus()
          setTimeout(() => inputY.select(), 0)
        }
      })
      inputY.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          e.preventDefault()
          inputX.focus()
          setTimeout(() => inputX.select(), 0)
        }
      })
    }

    return { container, inputX, inputY }
  }

  /**
   * Remove UI elements and event handlers created for the active input session.
   */
  private cleanup(): void {
    if (this.inputEl) this.inputEl.remove()
    this.inputEl = null

    if (this.previewRectEl) this.previewRectEl.remove()
    this.previewRectEl = null

    if (this.clickHandler)
      this.canvas.removeEventListener('click', this.clickHandler)
    this.clickHandler = null

    if (this.escHandler)
      document.removeEventListener('keydown', this.escHandler)
    this.escHandler = null

    this.drawPreview = null
    this.activeResolver = null
  }

  /**
   * Create a promise resolved by user input. Pressing Escape will reject.
   * The resolver is stored in `activeResolver` for internal use.
   */
  private makePromise<T>(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.activeResolver = resolve

      this.escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.cleanup()
          reject(new Error('cancelled'))
        }
      }

      document.addEventListener('keydown', this.escHandler)
    })
  }

  /**
   * Public point input API.
   */
  async getPoint(message: string): Promise<AcEdPosition> {
    return this.getPointInternal(message)
  }

  /**
   * Shared point input logic used by getPoint() and getBox().
   * Accepts "x,y" typed input OR mouse click.
   */
  private getPointInternal(
    message: string,
    options?: { noCleanup?: boolean }
  ): Promise<AcEdPosition> {
    const noCleanup = options?.noCleanup ?? false
    const promise = this.makePromise<AcEdPosition>()
    const resolver = this.activeResolver

    // Initial mouse → world
    const mouseScreen = { x: this.mouse.x, y: this.mouse.y }
    const mouseWorld = this.view.cwcs2Wcs(mouseScreen)

    const { container, inputX, inputY } = this.createInputBox(message, true)

    // Prefill values (editable)
    inputX.value = mouseWorld.x.toFixed(3)
    if (inputY) inputY.value = mouseWorld.y.toFixed(3)

    // Select immediately
    setTimeout(() => {
      if (inputY) inputY.select()
      inputX.focus()
      inputX.select()
    }, 0)

    // Track if user typed
    let userTyped = false

    const clearInvalid = (input: HTMLInputElement) =>
      input.classList.remove('invalid')

    // User edits → stop auto-select/update & clear red
    inputX.addEventListener('input', () => {
      userTyped = true
      clearInvalid(inputX)
    })
    if (inputY) {
      inputY.addEventListener('input', () => {
        userTyped = true
        clearInvalid(inputY)
      })
    }

    // Mouse-move → update coords + ALWAYS SELECT if user has not typed
    const mouseMoveHandler = () => {
      if (!userTyped) {
        const w = this.view.cwcs2Wcs({ x: this.mouse.x, y: this.mouse.y })
        inputX.value = w.x.toFixed(3)
        if (inputY) inputY.value = w.y.toFixed(3)

        // Auto-select text (Option A)
        if (inputY) inputY.select()
        inputX.select()
      }
    }
    document.addEventListener('mousemove', mouseMoveHandler)

    // Handle Enter key
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return

      const x = parseFloat(inputX.value.trim())
      const y = inputY ? parseFloat(inputY.value.trim()) : NaN

      let ok = true

      if (isNaN(x)) {
        inputX.classList.add('invalid')
        ok = false
      }
      if (inputY && isNaN(y)) {
        inputY.classList.add('invalid')
        ok = false
      }

      if (!ok) return

      // Valid → cleanup & resolve
      container.removeEventListener('keydown', keyHandler)
      document.removeEventListener('mousemove', mouseMoveHandler)

      if (this.inputEl === container) {
        container.remove()
        this.inputEl = null
      }

      const world = { x, y }
      const screen = this.view.wcs2Cwcs(world)

      try {
        resolver?.({ world, screen })
      } finally {
        if (!noCleanup) this.cleanup()
      }
    }

    container.addEventListener('keydown', keyHandler)

    // Mouse click resolves p
    const clickHandlerLocal = (e: MouseEvent) => {
      const cx = e.clientX - this.rect.left
      const cy = e.clientY - this.rect.top

      const world = this.view.cwcs2Wcs({ x: cx, y: cy })
      const screen = this.view.wcs2Cwcs(world)

      container.removeEventListener('keydown', keyHandler)
      document.removeEventListener('mousemove', mouseMoveHandler)

      if (this.inputEl === container) {
        container.remove()
        this.inputEl = null
      }

      try {
        resolver?.({ world, screen })
      } finally {
        if (!noCleanup) this.cleanup()
      }
    }

    this.clickHandler = clickHandlerLocal
    this.canvas.addEventListener('click', clickHandlerLocal)

    return promise
  }

  /**
   * Prompt the user to type a numeric value. If integerOnly is true, integers
   * are enforced. The input is validated and the box will be marked invalid if
   * the typed value does not conform, allowing the user to retype.
   */
  private getNumberTyped(
    message: string,
    integerOnly = false
  ): Promise<number> {
    const promise = this.makePromise<number>()
    const { inputX } = this.createInputBox(message, false)

    inputX.addEventListener('input', () => inputX.classList.remove('invalid'))

    inputX.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const value = integerOnly
          ? parseInt(inputX.value, 10)
          : parseFloat(inputX.value)
        if (!isNaN(value)) {
          this.cleanup()
          this.activeResolver?.(value)
        } else {
          inputX.classList.add('invalid')
        }
      }
    })

    return promise
  }

  /** Request a distance (number) from the user. */
  getDistance(): Promise<number> {
    return this.getNumberTyped('distance')
  }

  /** Request an angle in degrees from the user. */
  getAngle(): Promise<number> {
    return this.getNumberTyped('angle (deg)')
  }

  /** Request a double/float from the user. */
  getDouble(): Promise<number> {
    return this.getNumberTyped('double')
  }

  /** Request an integer from the user. */
  getInteger(): Promise<number> {
    return this.getNumberTyped('integer', true)
  }

  /**
   * Prompt the user to type an arbitrary string. Resolved when Enter is pressed.
   */
  getString(message: string): Promise<string> {
    const promise = this.makePromise<string>()
    const { inputX } = this.createInputBox(message, false)

    inputX.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const val = inputX.value
        this.cleanup()
        this.activeResolver?.(val)
      }
    })

    return promise
  }

  /**
   * Prompt the user to specify a rectangular box by selecting two corners.
   * Each corner may be specified by clicking on the canvas or typing "x,y".
   * A live HTML overlay rectangle previews the box as the user moves the mouse.
   */
  async getBox(
    message1: string = 'Specify the first corner or',
    message2: string = 'Specify the second corner or'
  ): Promise<AcGeBox2d> {
    // Get first point
    const p1 = await this.getPointInternal(message1, { noCleanup: true })

    // Create preview rectangle
    this.previewRectEl = document.createElement('div')
    this.previewRectEl.className = 'aced-preview-rect'
    document.body.appendChild(this.previewRectEl)

    this.drawPreview = () => {
      if (!this.previewRectEl) return

      const x1 = p1.screen.x + this.rect.left
      const y1 = p1.screen.y + this.rect.top
      const x2 = this.mouse.x + this.rect.left
      const y2 = this.mouse.y + this.rect.top

      const left = Math.min(x1, x2)
      const top = Math.min(y1, y2)
      const width = Math.abs(x1 - x2)
      const height = Math.abs(y1 - y2)

      Object.assign(this.previewRectEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      })
    }

    // Second point
    const p2 = await this.getPointInternal(message2, { noCleanup: false })

    // Remove preview
    if (this.previewRectEl) {
      this.previewRectEl.remove()
      this.previewRectEl = null
    }
    this.drawPreview = null

    return new AcGeBox2d().expandByPoint(p1.world).expandByPoint(p2.world)
  }
}
