import { AcGePoint2dLike } from '@mlightcad/geometry-engine'

/**
 * Supported marker shapes.
 */
export type AcEdMarkerType = 'circle' | 'triangle' | 'rect'

/**
 * Represents a single marker displayed in screen coordinates.
 *
 * A marker is a small shape (circle, triangle, or rectangle) rendered using DOM elements.
 * Its appearance is determined by type, size, and color.
 *
 * The marker:
 * - Is absolutely positioned on the screen.
 * - Cannot receive pointer events.
 * - Automatically injects required CSS once globally.
 */
export class AcEdMarker {
  /** DOM element representing the marker */
  private _el: HTMLElement

  /** Size (width = height) of the marker in pixels */
  private _size: number

  /** Marker shape type */
  private _type: AcEdMarkerType

  /** Marker stroke or fill color */
  private _color: string

  /**
   * Creates a new OSNAP marker instance.
   *
   * @param type - Shape type of the marker (`circle`, `triangle`, `rect`)
   * @param size - Size of the marker (width/height in px; triangle uses font-size)
   * @param color - Marker color (CSS color string)
   */
  constructor(
    type: AcEdMarkerType = 'rect',
    size: number = 8,
    color: string = 'green'
  ) {
    this._type = type
    this._size = size
    this._color = color

    // Ensure CSS is injected once
    AcEdMarker.injectCSS()

    // Create marker DOM
    this._el = document.createElement('div')
    this._el.classList.add('ml-marker')
    this._el.style.color = color

    this.applyShape()

    // Attach to document
    document.body.appendChild(this._el)
  }

  /**
   * Gets the current marker color.
   */
  public get color(): string {
    return this._color
  }

  /**
   * Sets marker color and updates DOM immediately.
   */
  public set color(value: string) {
    this._color = value
    this._el.style.color = value
  }

  /**
   * Gets the current marker type.
   */
  public get type(): AcEdMarkerType {
    return this._type
  }

  /**
   * Sets the marker type and updates DOM shape instantly.
   */
  public set type(value: AcEdMarkerType) {
    this._type = value
    this.applyShape()
  }

  /**
   * Injects required CSS into the document.
   * Ensures that CSS is only injected one time.
   */
  private static injectCSS() {
    if (document.getElementById('ml-marker-style')) return

    const style = document.createElement('style')
    style.id = 'ml-marker-style'
    style.textContent = `
      .ml-marker {
        position: absolute;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 999999;
      }
      .ml-marker-circle {
        border-radius: 50%;
        border: 2px solid currentColor;
        background: transparent;
      }
      .ml-marker-rect {
        border: 2px solid currentColor;
        background: transparent;
      }
      .ml-marker-triangle {
        width: 0;
        height: 0;
        border-left: 0.5em solid transparent;
        border-right: 0.5em solid transparent;
        border-bottom: 1em solid currentColor;
        transform: translate(-50%, -100%);
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Applies the appropriate CSS class and size properties
   * according to the marker's chosen shape type.
   */
  private applyShape() {
    switch (this._type) {
      case 'circle':
        this._el.classList.add('ml-marker-circle')
        this._el.style.width = `${this._size}px`
        this._el.style.height = `${this._size}px`
        break

      case 'rect':
        this._el.classList.add('ml-marker-rect')
        this._el.style.width = `${this._size}px`
        this._el.style.height = `${this._size}px`
        break

      case 'triangle':
        this._el.classList.add('ml-marker-triangle')
        this._el.style.fontSize = `${this._size}px` // font-size scales triangle
        break
    }
  }

  /**
   * Sets the screen position of the marker.
   *
   * @param pos - Position in screen coordinate in pixels
   */
  public setPosition(pos: AcGePoint2dLike) {
    this._el.style.left = `${pos.x}px`
    this._el.style.top = `${pos.y}px`
  }

  /**
   * Removes the marker from DOM and cleans up resources.
   * Should be called when the marker is no longer needed.
   */
  public destroy() {
    this._el.remove()
  }
}
