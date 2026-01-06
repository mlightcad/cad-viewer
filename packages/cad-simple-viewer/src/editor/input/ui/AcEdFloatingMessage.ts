import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdBaseView } from '../../view'

/**
 * AcEdFloatingMessage
 * -----------------------------------------------------------------------------
 * A lightweight floating UI component that displays a short text message
 * near the mouse cursor, similar to AutoCAD's dynamic prompt / tooltip.
 *
 * Responsibilities:
 * - Create and manage a floating DOM element with a text label
 * - Follow mouse movement while visible
 * - Automatically show / hide on mouse enter / leave
 * - Ensure the floating message stays inside parent bounds
 * - Manage its own DOM lifecycle and event listeners
 *
 * Non-Responsibilities (by design):
 * - No input boxes
 * - No keyboard handling
 * - No OSNAP logic
 * - No rubber-band / preview drawing
 * - No CAD command logic
 *
 * This class serves as a reusable base for more advanced floating UI
 * components such as `AcEdFloatingInput`, which extend this class
 * to add inputs, validation, OSNAP, and commit workflows.
 */
export class AcEdFloatingMessage {
  /** The view associated with the current editor context */
  protected view: AcEdBaseView

  /**
   * Parent element used for positioning and mouse tracking.
   * Typically the canvas container or viewport element.
   */
  protected parent: HTMLElement

  /**
   * Root container of the floating message.
   * Positioned absolutely and follows the mouse cursor.
   */
  protected container: HTMLDivElement

  /**
   * Text label element used to display the floating message.
   */
  protected label: HTMLSpanElement

  /** Whether the floating message is currently visible */
  protected visible = false

  /** Whether this instance has been permanently disposed */
  protected disposed = false

  /** Ensures CSS is injected only once globally */
  private static stylesInjected = false

  /** Cached event handler: mouse enter */
  protected boundOnMouseEnter: (e: MouseEvent) => void

  /** Cached event handler: mouse leave */
  protected boundOnMouseLeave: (e: MouseEvent) => void

  /** Cached event handler: mouse move */
  protected boundOnMouseMove: (e: MouseEvent) => void

  /**
   * Constructs a floating message widget.
   *
   * @param view   The active editor view
   * @param options.parent  Parent element used for positioning
   * @param options.message Initial message text
   */
  constructor(
    view: AcEdBaseView,
    options: {
      parent?: HTMLElement
      message?: string
    }
  ) {
    this.view = view
    this.parent = options.parent ?? document.body

    // Create container
    this.container = document.createElement('div')
    this.container.className = 'ml-floating-input'

    // Create message label
    this.label = document.createElement('span')
    this.label.className = 'ml-floating-input-label'
    this.label.textContent = options.message ?? ''
    this.container.appendChild(this.label)

    // Always append to body (inputs / overlays are ignored inside canvas)
    document.body.appendChild(this.container)

    // Bind handlers once so they can be removed safely
    this.boundOnMouseEnter = e => this.handleMouseEnter(e)
    this.boundOnMouseLeave = () => this.handleMouseLeave()
    this.boundOnMouseMove = e => this.handleMouseMove(e)

    // AutoCAD-like behavior:
    // - Show message when mouse enters parent
    // - Hide message when mouse leaves parent
    this.parent.addEventListener('mouseenter', this.boundOnMouseEnter)
    this.parent.addEventListener('mouseleave', this.boundOnMouseLeave)

    this.injectCSS()
  }

  /**
   * Injects minimal CSS required for the floating message.
   * This is done once globally to avoid duplicate styles.
   */
  protected injectCSS() {
    if (AcEdFloatingMessage.stylesInjected) return
    AcEdFloatingMessage.stylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-floating-input {
        position: absolute;
        display: flex;
        align-items: center;
        padding: 2px 4px;
        background: #444;
        color: #fff;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
      }
      .ml-floating-input-label {
        white-space: nowrap;
        color: #fff;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Indicates whether the floating message is currently visible.
   */
  get isVisible() {
    return this.visible
  }

  /**
   * Shows the floating message at the given mouse position
   * and starts tracking mouse movement.
   *
   * @param pos Mouse position in browser coordinates
   */
  showAt(pos: AcGePoint2dLike) {
    if (this.disposed) return

    this.visible = true
    this.container.style.display = 'flex'
    this.setPosition(pos)

    this.parent.addEventListener('mousemove', this.boundOnMouseMove)
  }

  /**
   * Hides the floating message and stops mouse tracking.
   * Safe to call multiple times.
   */
  hide() {
    if (!this.visible) return

    this.visible = false
    this.container.style.display = 'none'
    this.parent.removeEventListener('mousemove', this.boundOnMouseMove)
  }

  /**
   * Permanently disposes this floating message.
   *
   * - Removes all event listeners
   * - Removes DOM elements
   * - After disposal, the instance must not be reused
   */
  dispose() {
    if (this.disposed) return
    this.disposed = true

    this.hide()
    this.parent.removeEventListener('mouseenter', this.boundOnMouseEnter)
    this.parent.removeEventListener('mouseleave', this.boundOnMouseLeave)
    this.container.remove()
  }

  /**
   * Updates the position of the floating message to follow the mouse
   * while ensuring it stays within the parent bounds.
   *
   * @param pos Mouse position in browser coordinates
   */
  protected setPosition(pos: AcGePoint2dLike) {
    const parentRect = this.parent.getBoundingClientRect()
    const rect = this.container.getBoundingClientRect()

    const mousePos = {
      x: pos.x - parentRect.left,
      y: pos.y - parentRect.top
    }

    let left = pos.x - parentRect.left + 10
    let top = pos.y - parentRect.top + 10

    // Clamp to parent bounds
    left = Math.min(left, parentRect.width - rect.width)
    top = Math.min(top, parentRect.height - rect.height)
    left = Math.max(left, 0)
    top = Math.max(top, 0)

    this.container.style.left = `${left}px`
    this.container.style.top = `${top}px`

    return mousePos
  }

  /**
   * Mouse enter handler.
   * Shows the floating message at the current cursor position.
   */
  protected handleMouseEnter(e: MouseEvent) {
    this.showAt(e)
  }

  /**
   * Mouse leave handler.
   * Hides the floating message.
   */
  protected handleMouseLeave() {
    this.hide()
  }

  /**
   * Mouse move handler.
   * Updates floating message position.
   * Can be overridden by subclasses to extend behavior.
   */
  protected handleMouseMove(e: MouseEvent) {
    if (!this.visible) return
    this.setPosition(e)
  }
}
