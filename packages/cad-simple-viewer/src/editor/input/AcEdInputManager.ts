import { AcGeBox2d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApI18n } from '../../i18n'
import { AcEdBaseView } from '../view'
import { AcEdPreviewJig } from './AcEdPreviewJig'
import {
  AcEdAngleHandler,
  AcEdDistanceHandler,
  AcEdIntegerHandler,
  AcEdNumericalHandler
} from './handler'
import {
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptPointOptions,
  AcEdPromptStringOptions
} from './prompt'

export interface AcEdPosition {
  world: AcGePoint3dLike
  screen: AcGePoint3dLike
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
  private previewEl: HTMLDivElement | null = null

  /** Last known mouse position relative to the canvas top-left. */
  private mouse: AcGePoint3dLike = { x: 0, y: 0, z: 0 }

  /** Stores last confirmed point from getPoint() or getBox() */
  private lastPoint: AcGePoint3dLike | null = null

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
    // The class’s constructor runs before the canvas is fully laid out, getBoundingClientRect()
    // may return incorrect width/height/position. requestAnimationFrame() runs after layout and
    // before painting, so the rect is guaranteed to be correct.
    requestAnimationFrame(() => {
      this.rect = this.canvas.getBoundingClientRect()
    })

    this.injectCSS()

    // Update mouse position and adjust floating input position / preview
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      this.mouse.x = e.clientX - rect.left
      this.mouse.y = e.clientY - rect.top

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
        border: 1px dashed var(--line-color, #0f0);
        background: rgba(0, 255, 0, 0.04);
        pointer-events: none;
        z-index: 9999;
      }
      .aced-preview-line {
        position: absolute;
        height: 1px;
        background: var(--line-color, #0f0);
        transform-origin: 0 0;
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
   * Create a floating HTML line element (div) for previews.
   * If a parent is provided, the line is appended to the parent, otherwise to document.body.
   * @param parent Optional parent element to append the line to
   */
  private createLine(parent?: HTMLElement): HTMLDivElement {
    const line = document.createElement('div')
    line.className = 'aced-preview-line'

    if (parent) {
      parent.appendChild(line)
    } else {
      document.body.appendChild(line)
    }

    return line
  }

  /**
   * Create a parent container holding two line elements for preview.
   * Returns an object containing the parent and the two lines.
   */
  private createTwoLines(): {
    container: HTMLDivElement
    lineA: HTMLDivElement
    lineB: HTMLDivElement
  } {
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '0'
    container.style.height = '0'
    document.body.appendChild(container)

    const lineA = this.createLine(container)
    const lineB = this.createLine(container)

    return { container, lineA, lineB }
  }

  /**
   * Draw a line element from (x1, y1) to (x2, y2) with optional color and dashed style.
   */
  private drawLine(
    line: HTMLDivElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: { color?: string; dashed?: boolean }
  ) {
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    line.style.width = `${length}px`
    line.style.transform = `rotate(${angle}deg)`
    line.style.left = `${x1}px`
    line.style.top = `${y1}px`
    if (options?.color) line.style.background = options.color
    line.style.borderTop = options?.dashed
      ? '1px dashed var(--line-color, #0f0)'
      : 'none'
    line.style.background = options?.dashed
      ? 'transparent'
      : options?.color || line.style.background
  }

  /**
   * Remove UI elements and event handlers created for the active input session.
   */
  private cleanup(): void {
    if (this.inputEl) this.inputEl.remove()
    this.inputEl = null

    if (this.previewEl) this.previewEl.remove()
    this.previewEl = null

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
   * Format a number for display in input box.
   * Default: 3 decimal places for points/distance, 2 decimal places for angles.
   * @param value The numeric value
   * @param type Optional type: 'point' | 'distance' | 'angle'
   */
  private formatNumber(
    value: number,
    type: 'point' | 'distance' | 'angle'
  ): string {
    switch (type) {
      case 'angle':
        return value.toFixed(2)
      case 'distance':
      case 'point':
      default:
        return value.toFixed(3)
    }
  }

  /**
   * Public point input API.
   */
  async getPoint(options: AcEdPromptPointOptions): Promise<AcEdPosition> {
    return this.getPointInternal({ message: options.message, jig: options.jig })
  }

  /**
   * Shared point input logic used by getPoint() and getBox().
   * Accepts "x,y" typed input OR mouse click.
   */
  private getPointInternal(options?: {
    message: string
    noCleanup?: boolean
    jig?: AcEdPreviewJig<AcGePoint3dLike>
  }): Promise<AcEdPosition> {
    const message = options?.message ?? ''
    const noCleanup = options?.noCleanup ?? false
    const jig = options?.jig
    const promise = this.makePromise<AcEdPosition>()
    const resolver = this.activeResolver

    // Initial mouse → world
    const mouseScreen = { x: this.mouse.x, y: this.mouse.y }
    const mouseWorld = this.view.cwcs2Wcs(mouseScreen)

    const { container, inputX, inputY } = this.createInputBox(message, true)

    // Prefill values (editable)
    inputX.value = this.formatNumber(mouseWorld.x, 'point')
    if (inputY) inputY.value = this.formatNumber(mouseWorld.y, 'point')

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
    inputY?.addEventListener('input', () => {
      userTyped = true
      clearInvalid(inputY)
    })

    /** 🟦 Mouse move → update input + jig update + jig render */
    const mouseMoveHandler = () => {
      const w = this.view.cwcs2Wcs({ x: this.mouse.x, y: this.mouse.y })

      if (!userTyped) {
        inputX.value = this.formatNumber(w.x, 'point')
        if (inputY) inputY.value = this.formatNumber(w.y, 'point')
        if (inputY) inputY.select()
        inputX.select()
      }

      // Jig preview update
      if (jig) {
        jig.update({ x: w.x, y: w.y, z: 0 })
        jig.render()
      }
    }
    document.addEventListener('mousemove', mouseMoveHandler)

    /** 🟦 Enter key → resolve */
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

      cleanupEventListeners()

      const world = { x, y }
      const screen = this.view.wcs2Cwcs(world)

      jig?.end()

      try {
        resolver?.({ world: { ...world, z: 0 }, screen: { ...screen, z: 0 } })
        // Remember last picked world coordinate
        this.lastPoint = { ...world, z: 0 }
      } finally {
        if (!noCleanup) this.cleanup()
      }
    }

    container.addEventListener('keydown', keyHandler)

    /** 🟦 Mouse click resolves point */
    const clickHandlerLocal = (e: MouseEvent) => {
      const cx = e.clientX - this.rect.left
      const cy = e.clientY - this.rect.top

      const world = this.view.cwcs2Wcs({ x: cx, y: cy })
      const screen = this.view.wcs2Cwcs(world)

      cleanupEventListeners()

      jig?.end()

      try {
        resolver?.({ world: { ...world, z: 0 }, screen: { ...screen, z: 0 } })
        // Remember last picked world coordinate
        this.lastPoint = { ...world, z: 0 }
      } finally {
        if (!noCleanup) this.cleanup()
      }
    }

    this.clickHandler = clickHandlerLocal
    this.canvas.addEventListener('click', clickHandlerLocal)

    /** Helper to remove listeners and input box */
    const cleanupEventListeners = () => {
      container.removeEventListener('keydown', keyHandler)
      document.removeEventListener('mousemove', mouseMoveHandler)
      this.canvas.removeEventListener('click', clickHandlerLocal)

      if (this.inputEl === container) {
        container.remove()
        this.inputEl = null
      }
    }

    return promise
  }

  /**
   * Prompt the user to type a numeric value. If integerOnly is true, integers
   * are enforced. The input is validated and the box will be marked invalid if
   * the typed value does not conform, allowing the user to retype.
   */
  private getNumberTyped(
    message: string,
    handler: AcEdNumericalHandler | AcEdAngleHandler
  ): Promise<number> {
    const promise = this.makePromise<number>()
    const { inputX } = this.createInputBox(message, false)

    inputX.addEventListener('input', () => inputX.classList.remove('invalid'))

    inputX.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const value = handler.parse(inputX.value)
        if (value != null) {
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
  getDistance(options: AcEdPromptDistanceOptions): Promise<number> {
    // If no base point defined → fall back to typed numeric input
    if (!this.lastPoint) {
      // fallback to normal numeric input
      return this.getNumberTyped(
        options.message,
        new AcEdDistanceHandler(options)
      )
    }

    const promise = this.makePromise<number>()
    const resolver = this.activeResolver
    const handler = new AcEdDistanceHandler(options)
    const jig = options?.jig

    // Create input box
    const { inputX } = this.createInputBox(options.message, false)

    // Track if user typed manually
    let userTyped = false
    inputX.addEventListener('input', () => {
      userTyped = true
      inputX.classList.remove('invalid')
    })

    // create HTML preview line
    this.previewEl = this.createLine()

    const finish = (value: number): void => {
      this.cleanup() // internal cleanup (textbox, events, preview)
      jig?.end() // finalize jig
      resolver?.(value)
    }

    const drawPreview = (): void => {
      const world = this.view.cwcs2Wcs({
        x: this.mouse.x,
        y: this.mouse.y
      })

      const dx = world.x - this.lastPoint!.x
      const dy = world.y - this.lastPoint!.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Jig preview update
      if (jig) {
        jig.update(dist)
        jig.render()
      }

      // update input box only when user has not typed manually
      if (!userTyped) {
        inputX.value = this.formatNumber(dist, 'distance')
        inputX.focus()
        inputX.select()
      }

      // draw transient line
      const p1 = this.view.wcs2Cwcs(this.lastPoint!)
      const p2 = this.view.wcs2Cwcs(world)

      if (this.previewEl) {
        this.drawLine(
          this.previewEl,
          p1.x + this.rect.left,
          p1.y + this.rect.top,
          p2.x + this.rect.left,
          p2.y + this.rect.top,
          {
            dashed: options.useDashedLine
          }
        )
      }
    }

    this.drawPreview = drawPreview

    // Enter key resolves
    inputX.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const value = handler.parse(inputX.value)
        if (value != null) {
          finish(value)
        } else {
          inputX.classList.add('invalid')
        }
      }
    })

    // Mouse click resolves distance
    this.clickHandler = (e: MouseEvent) => {
      const world = this.view.cwcs2Wcs({
        x: e.clientX - this.rect.left,
        y: e.clientY - this.rect.top
      })
      const dx = world.x - this.lastPoint!.x
      const dy = world.y - this.lastPoint!.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      finish(dist)
    }
    this.canvas.addEventListener('click', this.clickHandler)

    return promise
  }

  /** Request an angle in degrees from the user. */
  getAngle(options: AcEdPromptAngleOptions): Promise<number> {
    if (!this.lastPoint) {
      return this.getNumberTyped(options.message, new AcEdAngleHandler(options))
    }

    const promise = this.makePromise<number>()
    const resolver = this.activeResolver
    const handler = new AcEdAngleHandler(options)

    const { inputX } = this.createInputBox(options.message, false)
    let userTyped = false
    inputX.addEventListener('input', () => {
      userTyped = true
      inputX.classList.remove('invalid')
    })

    // Create two-line preview
    const { container: lineContainer, lineA, lineB } = this.createTwoLines()
    this.previewEl = lineContainer

    const drawPreview = () => {
      const current = this.view.cwcs2Wcs({ x: this.mouse.x, y: this.mouse.y })
      const dx = current.x - this.lastPoint!.x
      const dy = current.y - this.lastPoint!.y
      const len = Math.sqrt(dx * dx + dy * dy)

      const ang = Math.atan2(dy, dx)
      const deg = (ang * 180) / Math.PI

      if (!userTyped) {
        inputX.value = this.formatNumber(deg, 'angle')
        inputX.focus()
        inputX.select()
      }

      const p1 = this.view.wcs2Cwcs(this.lastPoint!)
      const p2 = this.view.wcs2Cwcs(current)

      this.drawLine(
        lineA,
        p1.x + this.rect.left,
        p1.y + this.rect.top,
        p2.x + this.rect.left,
        p2.y + this.rect.top,
        { dashed: options.useDashedLine }
      )
      const pB = this.view.wcs2Cwcs({
        x: this.lastPoint!.x + len,
        y: this.lastPoint!.y
      })
      this.drawLine(
        lineB,
        p1.x + this.rect.left,
        p1.y + this.rect.top,
        pB.x + this.rect.left,
        pB.y + this.rect.top,
        { dashed: options.useDashedLine }
      )
    }

    this.drawPreview = drawPreview

    // Enter resolves
    inputX.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const value = handler.parse(inputX.value)
        if (value != null) {
          this.cleanup()
          resolver?.(value)
        } else {
          inputX.classList.add('invalid')
        }
      }
    })

    // Mouse click resolves
    this.clickHandler = (e: MouseEvent) => {
      const world = this.view.cwcs2Wcs({
        x: e.clientX - this.rect.left,
        y: e.clientY - this.rect.top
      })
      const dx = world.x - this.lastPoint!.x
      const dy = world.y - this.lastPoint!.y
      const ang = Math.atan2(dy, dx)
      const deg = (ang * 180) / Math.PI

      this.cleanup()
      resolver?.(deg)
    }
    this.canvas.addEventListener('click', this.clickHandler)

    return promise
  }

  /** Request a double/float from the user. */
  getDouble(options: AcEdPromptDistanceOptions): Promise<number> {
    return this.getNumberTyped(
      options.message,
      new AcEdDistanceHandler(options)
    )
  }

  /** Request an integer from the user. */
  getInteger(options: AcEdPromptIntegerOptions): Promise<number> {
    return this.getNumberTyped(options.message, new AcEdIntegerHandler(options))
  }

  /**
   * Prompt the user to type an arbitrary string. Resolved when Enter is pressed.
   */
  getString(options: AcEdPromptStringOptions): Promise<string> {
    const promise = this.makePromise<string>()
    const { inputX } = this.createInputBox(options.message, false)

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
  async getBox(): Promise<AcGeBox2d> {
    // Get first point
    const message1 = AcApI18n.t('main.inputManager.firstCorner')
    const p1 = await this.getPointInternal({
      message: message1,
      noCleanup: true
    })

    // Create preview rectangle
    this.previewEl = document.createElement('div')
    this.previewEl.className = 'aced-preview-rect'
    document.body.appendChild(this.previewEl)

    this.drawPreview = () => {
      if (!this.previewEl) return

      const x1 = p1.screen.x + this.rect.left
      const y1 = p1.screen.y + this.rect.top
      const x2 = this.mouse.x + this.rect.left
      const y2 = this.mouse.y + this.rect.top

      const left = Math.min(x1, x2)
      const top = Math.min(y1, y2)
      const width = Math.abs(x1 - x2)
      const height = Math.abs(y1 - y2)

      Object.assign(this.previewEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      })
    }

    // Second point
    const message2 = AcApI18n.t('main.inputManager.secondCorner')
    const p2 = await this.getPointInternal({
      message: message2,
      noCleanup: false
    })

    // Remove preview
    if (this.previewEl) {
      this.previewEl.remove()
      this.previewEl = null
    }
    this.drawPreview = null

    return new AcGeBox2d().expandByPoint(p1.world).expandByPoint(p2.world)
  }
}
