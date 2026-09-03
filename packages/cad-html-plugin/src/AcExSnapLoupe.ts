import type { AcExOsnapMode } from './AcExOsnap'
import { acexOsnapModeToMarkerType } from './AcExOsnap'
import type { AcExOsnapMarkerShape } from './AcExOsnapMarker'

/** Square loupe size in CSS pixels. */
export const ACEX_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACEX_SNAP_LOUPE_ZOOM = 3
/** Horizontal offset of the loupe from the canvas host left, in CSS pixels. */
export const ACEX_SNAP_LOUPE_INSET_PX = 8
/**
 * Vertical offset of the loupe from the canvas host top, in CSS pixels.
 * Leaves room for `#mlcad-status-bar` (top inset + two 12px lines + gap).
 */
export const ACEX_SNAP_LOUPE_TOP_INSET_PX = 56

/**
 * DOM chrome for the offline HTML snap loupe (border and OSNAP glyph).
 * Geometry is drawn into a WebGL scissor by the viewer runtime.
 */
export class AcExSnapLoupe {
  /** Root HUD element (border), positioned over the overlay. */
  private readonly root: HTMLDivElement
  /** OSNAP glyph drawn inside the loupe when a snap is active. */
  private readonly marker: HTMLDivElement
  /** Last applied OSNAP marker CSS shape class suffix. */
  private markerShape: AcExOsnapMarkerShape = 'rect'
  /** Whether the HUD is currently displayed. */
  private visible = false

  /**
   * Creates the loupe HUD and attaches it to the canvas host.
   *
   * @param host - Element that contains the WebGL canvas (typically `#mlcad-canvas-host`).
   */
  constructor(host: HTMLElement) {
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
    this.root.style.left = `${ACEX_SNAP_LOUPE_INSET_PX}px`
    this.root.style.top = `${ACEX_SNAP_LOUPE_TOP_INSET_PX}px`
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

/**
 * Maps a canvas-space delta (snap − finger) into loupe-local pixels.
 *
 * The loupe center corresponds to the finger sample; the snap glyph is
 * offset from that center by `delta * zoom`.
 *
 * @param dx - Canvas-space X from finger to snap (CSS pixels).
 * @param dy - Canvas-space Y from finger to snap (CSS pixels).
 * @param size - Loupe width/height in CSS pixels; defaults to
 *   {@link ACEX_SNAP_LOUPE_SIZE_PX}.
 * @param zoom - Magnification relative to the main view; defaults to
 *   {@link ACEX_SNAP_LOUPE_ZOOM}.
 * @returns Loupe-local coordinates with origin at the loupe top-left.
 */
export function acexLoupeLocalFromCanvasDelta(
  dx: number,
  dy: number,
  size: number = ACEX_SNAP_LOUPE_SIZE_PX,
  zoom: number = ACEX_SNAP_LOUPE_ZOOM
): { x: number; y: number } {
  return {
    x: size / 2 + dx * zoom,
    y: size / 2 + dy * zoom
  }
}
