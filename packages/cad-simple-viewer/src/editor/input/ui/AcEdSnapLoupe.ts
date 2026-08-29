import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import { AcEdBaseView } from '../../view'
import { AcEdMarker, AcEdMarkerType } from '../marker/AcEdMarker'
import {
  ACED_SNAP_LOUPE_INSET_PX,
  ACED_SNAP_LOUPE_SIZE_PX,
  ACED_SNAP_LOUPE_ZOOM,
  acedLoupeLocalFromCanvasDelta
} from './AcEdSnapLoupeMath'

export {
  ACED_SNAP_LOUPE_INSET_PX,
  ACED_SNAP_LOUPE_SIZE_PX,
  ACED_SNAP_LOUPE_ZOOM,
  acedLoupeLocalFromCanvasDelta
} from './AcEdSnapLoupeMath'

/**
 * DOM chrome for the mobile snap loupe: border, crosshair, and OSNAP glyph.
 *
 * CAD geometry is drawn by the view's overlay viewport; this widget only
 * drives that viewport and paints HUD on top.
 */
export class AcEdSnapLoupe {
  /** Whether the loupe stylesheet has been injected into `document.head`. */
  private static stylesInjected = false

  /** View whose overlay viewport shows the magnified CAD content. */
  private readonly view: AcEdBaseView
  /** Root HUD element (border + crosshair), positioned over the overlay. */
  private readonly root: HTMLDivElement
  /** OSNAP glyph drawn inside the loupe when a snap is active. */
  private readonly marker: AcEdMarker

  /**
   * Creates the loupe HUD and attaches it to the view container.
   *
   * @param view - View that owns the overlay viewport and coordinate helpers.
   */
  constructor(view: AcEdBaseView) {
    this.view = view
    AcEdSnapLoupe.injectCss()
    this.root = document.createElement('div')
    this.root.className = 'ml-snap-loupe'
    this.root.setAttribute('aria-hidden', 'true')
    const crosshair = document.createElement('div')
    crosshair.className = 'ml-snap-loupe-crosshair'
    this.root.appendChild(crosshair)
    const hostPosition = getComputedStyle(view.container).position
    if (hostPosition === 'static') {
      view.container.style.position = 'relative'
    }
    view.container.appendChild(this.root)
    this.marker = new AcEdMarker(
      'rect',
      12,
      'var(--ml-ui-canvas-line, green)',
      this.root
    )
    this.hide()
  }

  /**
   * Shows the loupe at the canvas-local sample and updates the overlay viewport.
   *
   * @param canvasX - Sample X in canvas CSS pixels.
   * @param canvasY - Sample Y in canvas CSS pixels.
   * @param snapCanvas - Snapped point in canvas CSS pixels, if any.
   * @param snapType - OSNAP marker shape when snapped.
   */
  show(
    canvasX: number,
    canvasY: number,
    snapCanvas?: { x: number; y: number },
    snapType?: AcEdMarkerType
  ) {
    const size = ACED_SNAP_LOUPE_SIZE_PX
    const inset = ACED_SNAP_LOUPE_INSET_PX
    const viewBox = acedLoupeViewBoxFromCanvasSample(this.view, canvasX, canvasY)
    this.view.setSnapLoupe({ x: inset, y: inset, size, viewBox })

    const host = this.view.canvasToContainer({ x: inset, y: inset })
    this.root.style.left = `${host.x}px`
    this.root.style.top = `${host.y}px`
    this.root.style.display = 'block'

    if (snapCanvas && snapType) {
      this.marker.type = snapType
      this.marker.setPosition(
        acedLoupeLocalFromCanvasDelta(snapCanvas.x - canvasX, snapCanvas.y - canvasY)
      )
    } else {
      this.marker.setPosition({ x: -1000, y: -1000 })
    }
  }

  /**
   * Hides the HUD and the overlay viewport.
   */
  hide() {
    this.root.style.display = 'none'
    this.view.setSnapLoupe(null)
    this.marker.setPosition({ x: -1000, y: -1000 })
  }

  /**
   * Hides the loupe and removes its DOM from the view container.
   */
  dispose() {
    this.hide()
    this.marker.destroy()
    this.root.remove()
  }

  /**
   * Injects loupe HUD styles into `document.head` once per page.
   */
  private static injectCss() {
    if (AcEdSnapLoupe.stylesInjected) return
    AcEdSnapLoupe.stylesInjected = true
    const style = document.createElement('style')
    style.id = 'ml-snap-loupe-style'
    style.textContent = `
      .ml-snap-loupe {
        position: absolute;
        width: ${ACED_SNAP_LOUPE_SIZE_PX}px;
        height: ${ACED_SNAP_LOUPE_SIZE_PX}px;
        box-sizing: border-box;
        border: 2px solid var(--ml-ui-canvas-line, #0f0);
        border-radius: 2px;
        pointer-events: none;
        z-index: 20;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      }
      .ml-snap-loupe-crosshair {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .ml-snap-loupe-crosshair::before,
      .ml-snap-loupe-crosshair::after {
        content: '';
        position: absolute;
        background: var(--ml-ui-canvas-line, #0f0);
        opacity: 0.85;
      }
      .ml-snap-loupe-crosshair::before {
        left: 50%;
        top: 0;
        width: 1px;
        height: 100%;
        transform: translateX(-50%);
      }
      .ml-snap-loupe-crosshair::after {
        top: 50%;
        left: 0;
        height: 1px;
        width: 100%;
        transform: translateY(-50%);
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * World box around a canvas sample that fills the loupe at {@link ACED_SNAP_LOUPE_ZOOM}.
 *
 * @param view - View used to convert canvas samples to world coordinates.
 * @param canvasX - Sample X in canvas CSS pixels (loupe center).
 * @param canvasY - Sample Y in canvas CSS pixels (loupe center).
 * @returns Axis-aligned world box mapped onto the square loupe.
 */
export function acedLoupeViewBoxFromCanvasSample(
  view: AcEdBaseView,
  canvasX: number,
  canvasY: number
): AcGeBox2d {
  const half = ACED_SNAP_LOUPE_SIZE_PX / ACED_SNAP_LOUPE_ZOOM / 2
  const p1 = view.screenToWorld({ x: canvasX - half, y: canvasY - half })
  const p2 = view.screenToWorld({ x: canvasX + half, y: canvasY + half })
  const box = new AcGeBox2d()
  box.expandByPoint(new AcGePoint2d(p1.x, p1.y))
  box.expandByPoint(new AcGePoint2d(p2.x, p2.y))
  return box
}
