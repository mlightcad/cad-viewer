import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdFloatingInputBoxes } from './AcEdFloatingInputBoxes'
import {
  AcEdFloatingInputCancelCallback,
  AcEdFloatingInputChangeCallback,
  AcEdFloatingInputCommitCallback,
  AcEdFloatingInputDrawPreviewCallback,
  AcEdFloatingInputDynamicValueCallback,
  AcEdFloatingInputOptions,
  AcEdFloatingInputValidationCallback
} from './AcEdFloatingInputTypes'

/**
 * A UI component providing a small floating input box used inside CAD editing
 * workflows. It supports both single-input (distance, angle, etc.) and
 * double-input (coordinate entry) modes.
 *
 * The component is responsible for:
 *
 * - Creating, styling, and destroying its HTML structure
 * - Handling keyboard events (Enter, Escape)
 * - Managing live validation (via built-in or custom callback)
 * - Emitting commit/change/cancel events
 * - Ensuring no memory leaks via `dispose()`
 *
 * This abstraction allows higher-level objects such as AcEdInputManager to
 * remain clean and free from DOM-handling logic.
 */
export class AcEdFloatingInput<T> {
  /**
   * Mouse position in the parent element of the floating input.
   */
  mousePos?: AcGePoint2dLike

  /** Inject styles only once */
  private static stylesInjected = false

  /**
   * Parent element for positioning. Defaults to body if not provided.
   */
  private parent: HTMLElement

  /**
   * Root container DIV used to position and style the floating widget.
   */
  private container: HTMLDivElement

  /**
   * X and Y Input elements.
   */
  private inputs: AcEdFloatingInputBoxes<T>

  /**
   * Callback functions
   */
  private onCommit?: AcEdFloatingInputCommitCallback<T>
  private onChange?: AcEdFloatingInputChangeCallback<T>
  private onCancel?: AcEdFloatingInputCancelCallback
  private validateFn: AcEdFloatingInputValidationCallback<T>
  private getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>
  private drawPreview?: AcEdFloatingInputDrawPreviewCallback

  /** Whether the widget is currently visible. */
  private visible = false

  /** Whether this instance has been disposed. */
  private disposed = false

  /**
   * Cached bound handler for mouse enter event—ensures removal works.
   */
  private boundOnMouseEnter: (e: MouseEvent) => void

  /**
   * Cached bound handler for mouse leave event—ensures removal works.
   */
  private boundOnMouseLeave: (e: MouseEvent) => void

  /**
   * Cached bound handler for mouse move event—ensures removal works.
   */
  private boundOnMouseMove: (e: MouseEvent) => void

  /**
   * Cached bound handler for click event—ensures removal works.
   */
  private boundOnClick: (e: MouseEvent) => void

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  /**
   * Constructs a new floating input widget with the given options.
   *
   * @param options Configuration object controlling behavior, callbacks,
   *                validation, and display mode.
   */
  constructor(options: AcEdFloatingInputOptions<T>) {
    this.parent = options.parent ?? document.body
    this.validateFn = options.validate
    this.getDynamicValue = options.getDynamicValue
    this.drawPreview = options.drawPreview

    this.onCommit = options.onCommit
    this.onChange = options.onChange
    this.onCancel = options.onCancel

    // Create DOM
    this.container = document.createElement('div')
    this.container.className = 'ml-floating-input'

    const label = document.createElement('span')
    label.className = 'ml-floating-input-label'
    label.textContent = options.message ?? ''
    this.container.appendChild(label)

    this.inputs = new AcEdFloatingInputBoxes<T>({
      parent: this.container,
      twoInputs: options.twoInputs,
      validate: this.validateFn,
      onCancel: this.onCancel,
      onCommit: this.onCommit,
      onChange: this.onChange
    })

    // Always add it as children of body element because the browser will ignore it completely if
    // adding an <input> element as a child of a <canvas> element.
    document.body.appendChild(this.container)

    // Bind events
    this.boundOnMouseEnter = e => this.handleMouseEnter(e)
    this.boundOnMouseLeave = () => this.handleMouseLeave()
    this.boundOnMouseMove = e => this.handleMouseMove(e)
    this.boundOnClick = e => this.handleClick(e)

    // When the mouse enters the parent element, show floating input as AutoCAD
    this.parent.addEventListener('mouseenter', this.boundOnMouseEnter)
    // When the mouse leaves the parent element, hide floating input as AutoCAD
    this.parent.addEventListener('mouseleave', this.boundOnMouseLeave)

    this.injectCSS()
  }

  /**
   * Injects minimal CSS required for the floating input and preview rectangle.
   * Useful when you do not have a separate CSS file.
   */
  private injectCSS() {
    if (AcEdFloatingInput.stylesInjected) return
    AcEdFloatingInput.stylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-floating-input {
        position: absolute;
        display: flex;
        align-items: center;
        padding: 2px 4px;
        background: #444; /* gray background for container */
        color: #fff; /* white text for message */
        border: none;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
      }
      .ml-floating-input input {
        font-size: 12px;
        padding: 2px 4px;
        margin-left: 6px;
        height: 22px;
        width: 90px; /* wider to show coordinates */
        background: #888; /* gray background for input */
        border: 1px solid #666; /* subtle border */
        border-radius: 2px;
      }
      .ml-floating-input input.invalid {
        border-color: red;
        color: red;
      }
      .ml-floating-input-label {
        white-space: nowrap;
        color: #fff; /* white label text */
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Indicates whether the floating input widget is currently visible.
   * Can be used by external code to check if the input is shown on the screen.
   */
  get isVisible() {
    return this.visible
  }

  /**
   * Shows the floating input box at the specified screen coordinates.
   * @param pos - The mouse position in browser
   */
  showAt(pos: AcGePoint2dLike): void {
    if (this.disposed) return
    this.container.style.display = 'flex'
    this.visible = true
    this.inputs.focus()
    this.setPosition(pos)

    // Listen to mouse move and click on parent
    this.parent.addEventListener('mousemove', this.boundOnMouseMove)
    this.parent.addEventListener('click', this.boundOnClick)
  }

  /**
   * Hides the floating input widget.
   *
   * - Removes the widget from view.
   * - Stops tracking mouse movement on the parent element.
   *
   * Safe to call multiple times; if the widget is already hidden, this method
   * does nothing.
   */
  hide() {
    if (!this.visible) return
    this.container.style.display = 'none'
    this.visible = false
    this.removeListener()
  }

  /**
   * Disposes the floating input widget permanently.
   *
   * - Removes all event listeners (keyboard, input, mouse move).
   * - Removes the widget's DOM container from the parent.
   * - Marks the widget as disposed; after this, it cannot be shown again.
   *
   * Safe to call multiple times; subsequent calls have no effect.
   */
  dispose() {
    if (this.disposed) return
    this.disposed = true

    this.inputs.dispose()
    this.removeListener(true)
    this.container.remove()
  }

  /**
   * Sets position of this floating input
   * @param pos - The mouse position in browser
   * @returns The mouse position in the parent element of the floating input.
   */
  setPosition(pos: AcGePoint2dLike) {
    const parentRect = this.parent.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    const mousePos = {
      x: pos.x - parentRect.left,
      y: pos.y - parentRect.top
    }
    this.mousePos = mousePos

    // Compute position within parent bounds
    let left = mousePos.x + 10
    let top = mousePos.y + 10
    if (left + containerRect.width > parentRect.right)
      left = parentRect.right - containerRect.width
    if (top + containerRect.height > parentRect.bottom)
      top = parentRect.bottom - containerRect.height
    if (left < parentRect.left) left = parentRect.left
    if (top < parentRect.top) top = parentRect.top

    this.container.style.left = `${left}px`
    this.container.style.top = `${top}px`

    return mousePos
  }

  /**
   * Removes event listeners bound to the parent element
   * @param isRemoveAll - If true, removes all of event listeners bound
   * to the parent element
   */
  private removeListener(isRemoveAll: boolean = false) {
    this.parent.removeEventListener('mousemove', this.boundOnMouseMove)
    this.parent.removeEventListener('click', this.boundOnClick)

    if (isRemoveAll) {
      this.parent.removeEventListener('mouseenter', this.boundOnMouseEnter)
      this.parent.removeEventListener('mouseleave', this.boundOnMouseLeave)
    }
  }

  /**
   * Handles mouse move events to show floating input.
   * @param e The mouse leave event.
   */
  private handleMouseEnter(e: MouseEvent) {
    this.showAt(e)
  }

  /**
   * Handles mouse move events to hide floating input.
   * @param e The mouse leave event.
   */
  private handleMouseLeave() {
    this.hide()
  }

  /**
   * Handles mouse move events to reposition the floating input.
   *
   * Ensures that the input box follows the cursor while staying entirely
   * within the bounds of the parent element. Applies a small offset
   * to avoid overlapping the cursor.
   *
   * @param e The mouse move event containing the current cursor position.
   */
  private handleMouseMove(e: MouseEvent) {
    if (!this.visible) return

    const mousePos = this.setPosition({ x: e.x, y: e.y })

    // Update input values if empty using dynamic value callback
    const defaults = this.getDynamicValue(mousePos.x, mousePos.y)
    this.inputs.setValue(defaults.raw)

    // If inputs lost focus due to some reason, let's try to focus them again.
    if (!this.inputs.focused) {
      this.inputs.focus()
    }

    this.drawPreview?.(mousePos.x, mousePos.y)
  }

  /**
   * Handles click events to commit inputs.
   *
   * @param e The click event containing the current cursor position.
   */
  private handleClick(e: MouseEvent) {
    if (!this.visible) return

    const mousePos = this.setPosition({ x: e.x, y: e.y })
    const defaults = this.getDynamicValue(mousePos.x, mousePos.y)
    this.onCommit?.(defaults.value)
  }
}
