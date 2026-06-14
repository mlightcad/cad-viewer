import type { AcExOsnapMode } from './AcExOsnap'
import { acExOsnapModeToMarkerType } from './AcExOsnap'

/**
 * Visual shape of an object-snap marker in the offline HTML viewer.
 *
 * Selected by {@link acExOsnapModeToMarkerType} from {@link AcExOsnapMode}:
 * - `rect` — endpoint, node
 * - `triangle` — midpoint
 * - `circle` — center
 * - `diamond` — quadrant
 * - `x` — nearest
 * - `intersection` — curve intersection (square with X)
 */
export type AcExOsnapMarkerShape =
  | 'rect'
  | 'triangle'
  | 'x'
  | 'circle'
  | 'diamond'
  | 'intersection'

/**
 * Screen-space object snap marker for the offline HTML viewer.
 *
 * Renders a small glyph at the snapped screen position during measurement.
 * Shape follows {@link acExOsnapModeToMarkerType} so behavior matches the
 * main CAD viewer (square, triangle, circle, diamond, X).
 */
export class AcExOsnapMarker {
  private readonly el: HTMLDivElement
  private shape: AcExOsnapMarkerShape = 'rect'

  /**
   * @param host - Container positioned over the canvas (usually `#mlcad-root`).
   */
  constructor(private readonly host: HTMLElement) {
    AcExOsnapMarker.injectCss()
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }
    this.el = document.createElement('div')
    this.el.className = 'mlcad-osnap-marker mlcad-osnap-marker--hidden'
    host.appendChild(this.el)
    this.applyShape('rect')
  }

  /** Hides the marker. */
  hide(): void {
    this.el.classList.add('mlcad-osnap-marker--hidden')
  }

  /**
   * Shows the marker at screen coordinates.
   *
   * @param clientX - Viewport X in pixels.
   * @param clientY - Viewport Y in pixels.
   * @param mode - Snap mode (determines marker shape).
   */
  show(clientX: number, clientY: number, mode: AcExOsnapMode): void {
    const rect = this.host.getBoundingClientRect()
    const shape = acExOsnapModeToMarkerType(mode)
    if (shape !== this.shape) {
      this.applyShape(shape)
    }
    this.el.style.left = `${clientX - rect.left}px`
    this.el.style.top = `${clientY - rect.top}px`
    this.el.classList.remove('mlcad-osnap-marker--hidden')
  }

  /** Removes the marker element from the DOM. */
  remove(): void {
    this.el.remove()
  }

  private applyShape(shape: AcExOsnapMarkerShape): void {
    this.shape = shape
    this.el.className = `mlcad-osnap-marker mlcad-osnap-marker--${shape}`
  }

  private static injectCss(): void {
    if (document.getElementById('mlcad-osnap-marker-style')) return
    const style = document.createElement('style')
    style.id = 'mlcad-osnap-marker-style'
    style.textContent = `
      .mlcad-osnap-marker {
        position: absolute;
        pointer-events: none;
        z-index: 6;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        color: var(--mlcad-measure-accent, #08e8de);
      }
      .mlcad-osnap-marker--hidden { display: none; }
      .mlcad-osnap-marker--rect {
        width: 12px; height: 12px;
        border: 2px solid currentColor;
        background: transparent;
      }
      .mlcad-osnap-marker--triangle {
        width: 12px;
        height: 10px;
        background: currentColor;
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        /* Centroid of the upward triangle is 2/3 of the height from the apex. */
        transform: translate(-50%, -66.6667%);
      }
      .mlcad-osnap-marker--circle {
        width: 12px; height: 12px;
        border: 2px solid currentColor;
        border-radius: 50%;
        background: transparent;
      }
      .mlcad-osnap-marker--diamond {
        width: 10px; height: 10px;
        border: 2px solid currentColor;
        background: transparent;
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .mlcad-osnap-marker--x {
        width: 12px; height: 12px;
      }
      .mlcad-osnap-marker--x::before,
      .mlcad-osnap-marker--x::after {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        width: 100%; height: 2px;
        background: currentColor;
        transform-origin: center;
      }
      .mlcad-osnap-marker--x::before {
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .mlcad-osnap-marker--x::after {
        transform: translate(-50%, -50%) rotate(-45deg);
      }
      .mlcad-osnap-marker--intersection {
        width: 12px; height: 12px;
        border: 2px solid currentColor;
        background: transparent;
      }
      .mlcad-osnap-marker--intersection::before,
      .mlcad-osnap-marker--intersection::after {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        width: 70%; height: 2px;
        background: currentColor;
        transform-origin: center;
      }
      .mlcad-osnap-marker--intersection::before {
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .mlcad-osnap-marker--intersection::after {
        transform: translate(-50%, -50%) rotate(-45deg);
      }
    `
    document.head.appendChild(style)
  }
}
