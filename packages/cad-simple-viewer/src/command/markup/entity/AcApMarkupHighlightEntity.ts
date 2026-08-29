import { AcTrHtmlCanvasOverlay, AcTrHtmlGrip } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import {
  acapDrawOverlayHighlight,
  acapFitOverlayCanvas,
  type AcApOverlayWorldDrawResult
} from '../../overlay'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'

/**
 * Highlight rectangle markup (canvas fill + invisible center hit target).
 */
export class AcApMarkupHighlightEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type must be `highlight`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Highlight has no move grip in the current UX.
   *
   * @returns Empty grip list.
   */
  override subGetGripPoints() {
    return []
  }

  /**
   * Publish a canvas highlight fill/stroke and a center hit-target dot.
   *
   * @param view - Active 2D view for canvas sizing and viewChanged redraw.
   * @returns Group with canvas overlay and dispose for the redraw listener.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'highlight') {
      return this.emptyResult(this.createGroup())
    }
    const { color, canvasLineWidth, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for viewChanged redraw. */
    const cleanups: Array<() => void> = []

    const container = view.container
    const overlay = new AcTrHtmlCanvasOverlay({
      id: `${this.record.id}-hl`,
      container,
      layer,
      layoutId
    })
    group.addCanvas(overlay)

    const centerDot = new AcTrHtmlGrip({
      id: `${this.record.id}-dot`,
      color,
      worldPosition: {
        x: (geom.corner1.x + geom.corner2.x) / 2,
        y: (geom.corner1.y + geom.corner2.y) / 2
      },
      layer,
      layoutId
    })
    group.add(centerDot)
    this.seedOverlaySizes(view, [centerDot], [overlay.canvas])

    /**
     * Redraw the highlight rectangle in screen space.
     */
    const redraw = () => {
      const ctx = acapFitOverlayCanvas(overlay.canvas, container)
      if (!ctx) return
      acapDrawOverlayHighlight(
        ctx,
        view.worldToScreen(geom.corner1),
        view.worldToScreen(geom.corner2),
        this.record.style.color,
        canvasLineWidth,
        view,
        this.record.style.strokeWidthWcs
      )
    }
    redraw()
    view.events.viewChanged.addEventListener(redraw)
    cleanups.push(() => view.events.viewChanged.removeEventListener(redraw))

    return {
      group,
      entityIds: [],
      dispose: () => {
        for (const fn of cleanups) {
          try {
            fn()
          } catch {
            // ignore
          }
        }
      }
    }
  }
}
