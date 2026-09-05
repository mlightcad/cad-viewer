import type { AcExOsnapMode } from './AcExOsnap'
import { acexOsnapModeToMarkerType } from './AcExOsnap'
import type { AcExOsnapMarkerShape } from './AcExOsnapMarker'
import {
  ACEX_SNAP_LOUPE_TOP_INSET_PX,
  acexLoupeLocalFromCanvasDelta,
  acexResolveLoupePlacement
} from './AcExSnapLoupeMath'

export {
  ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX,
  ACEX_SNAP_LOUPE_INSET_PX,
  ACEX_SNAP_LOUPE_SIZE_PX,
  ACEX_SNAP_LOUPE_TOP_INSET_PX,
  ACEX_SNAP_LOUPE_ZOOM,
  acexLoupeLocalFromCanvasDelta,
  acexResolveLoupePlacement
} from './AcExSnapLoupeMath'

/**
 * DOM chrome for the offline HTML snap loupe (border and OSNAP glyph).
 * Geometry is drawn into a WebGL scissor by the viewer runtime.
 */
export class AcExSnapLoupe {
  /** Canvas host used for placement measurements. */
  private readonly host: HTMLElement
  /** Root HUD element (border), positioned over the overlay. */
  private readonly root: HTMLDivElement
  /** OSNAP glyph drawn inside the loupe when a snap is active. */
  private readonly marker: HTMLDivElement
  /** Last applied OSNAP marker CSS shape class suffix. */
  private markerShape: AcExOsnapMarkerShape = 'rect'
  /** Whether the HUD is currently displayed. */
  private visible = false
  /** Last resolved loupe top (host-local CSS px), for the WebGL scissor. */
  private lastTop = ACEX_SNAP_LOUPE_TOP_INSET_PX

  /**
   * Creates the loupe HUD and attaches it to the canvas host.
   *
   * @param host - Element that contains the WebGL canvas (typically `#mlcad-canvas-host`).
   */
  constructor(host: HTMLElement) {
    this.host = host
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }
    this.root = document.createElement('div')
    this.root.className = 'mlcad-snap-loupe'
    this.root.setAttribute('aria-hidden', 'true')
    this.root.style.display = 'none'
    this.marker = document.createElement('div')
    this.marker.className =
      'mlcad-osnap-marker mlcad-osnap-marker--rect mlcad-osnap-marker--hidden'
    this.root.appendChild(this.marker)
    host.appendChild(this.root)
  }

  /**
   * Whether the HUD is currently displayed.
   *
   * @returns True after {@link show} until {@link hide} or {@link remove}.
   */
  get isVisible(): boolean {
    return this.visible
  }

  /**
   * Host-local CSS Y of the loupe top edge from the last {@link show}.
   * Used by the WebGL scissor so chrome and geometry stay aligned.
   */
  get topInsetPx(): number {
    return this.lastTop
  }

  /**
   * Shows the HUD below the top status bar. `canvasX`/`canvasY` are the sample
   * in canvas CSS pixels; `snapCanvas` is the snapped canvas position when an
   * object snap hits.
   *
   * @param canvasX - Sample X in canvas CSS pixels (finger / loupe center).
   * @param canvasY - Sample Y in canvas CSS pixels.
   * @param snapCanvas - Snapped point in canvas CSS pixels, if any.
   * @param mode - Object-snap mode used to choose the glyph shape.
   */
  show(
    canvasX: number,
    canvasY: number,
    snapCanvas?: { x: number; y: number },
    mode?: AcExOsnapMode
  ) {
    const placement = acexResolveLoupePlacement(this.host)
    this.lastTop = placement.y
    this.root.style.left = `${placement.x}px`
    this.root.style.top = `${placement.y}px`
    this.root.style.display = 'block'
    this.visible = true
    if (snapCanvas && mode) {
      const shape = acexOsnapModeToMarkerType(mode)
      if (shape !== this.markerShape) {
        this.markerShape = shape
        this.marker.className = `mlcad-osnap-marker mlcad-osnap-marker--${shape}`
      } else {
        this.marker.classList.remove('mlcad-osnap-marker--hidden')
      }
      const local = acexLoupeLocalFromCanvasDelta(
        snapCanvas.x - canvasX,
        snapCanvas.y - canvasY
      )
      this.marker.style.left = `${local.x}px`
      this.marker.style.top = `${local.y}px`
      this.marker.classList.remove('mlcad-osnap-marker--hidden')
    } else {
      this.marker.classList.add('mlcad-osnap-marker--hidden')
    }
  }

  /**
   * Hides the HUD without removing it from the DOM.
   */
  hide() {
    this.visible = false
    this.root.style.display = 'none'
    this.marker.classList.add('mlcad-osnap-marker--hidden')
  }

  /**
   * Hides the loupe and removes its DOM from the host.
   */
  remove() {
    this.hide()
    this.root.remove()
  }
}
