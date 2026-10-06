import {
  AcGePoint3d,
  type AcGeVector3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlCanvasOverlay,
  AcTrHtmlGrip
} from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import {
  acapBindOverlayPointerDrag,
  acapDrawOverlayArrowHead,
  acapFitOverlayCanvas,
  type AcApOverlayWorldDrawResult,
  acapPlaceOverlayHtml,
  acapScaledOverlayArrowSize,
  acapScaledOverlayLineWidth
} from '../../overlay'
import { runMarkupEdit } from '../AcApMarkupHistory'
import { republishMarkup } from '../AcApMarkupRepublish'
import { getMarkupStore } from '../AcApMarkupStore'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'
import { selectMarkupGroup } from './AcApMarkupEntityGrips'

/**
 * Line or arrow markup with endpoint grips.
 *
 * Draws an HTML canvas stroke (and arrow head when applicable) plus endpoint
 * HTML dots. No CAD transient entities.
 */
export class AcApMarkupSegmentEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type is `line` or `arrow`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Grip 0 = start endpoint, grip 1 = end endpoint.
   *
   * @returns Start and end points in WCS, or empty when geometry is wrong type.
   */
  override subGetGripPoints(): AcGePoint3d[] {
    const geom = this.record.geometry
    if (geom.type !== 'line' && geom.type !== 'arrow') return []
    return [
      new AcGePoint3d(geom.start.x, geom.start.y, 0),
      new AcGePoint3d(geom.end.x, geom.end.y, 0)
    ]
  }

  /**
   * Move start and/or end by the given offset for the selected grip indices.
   *
   * @param indices - Grip indices (`0` start, `1` end).
   * @param offset - World-space translation.
   * @returns This entity for chaining.
   */
  override subMoveGripPointsAt(
    indices: number[],
    offset: AcGeVector3dLike
  ): this {
    const geom = this.record.geometry
    if (geom.type !== 'line' && geom.type !== 'arrow') return this
    let start = { ...geom.start }
    let end = { ...geom.end }
    for (const index of indices) {
      if (index === 0) {
        start = { x: start.x + offset.x, y: start.y + offset.y }
      } else if (index === 1) {
        end = { x: end.x + offset.x, y: end.y + offset.y }
      }
    }
    this.record = {
      ...this.record,
      geometry:
        geom.type === 'arrow'
          ? { type: 'arrow', start, end }
          : { type: 'line', start, end }
    }
    return this
  }

  /**
   * Publish canvas stroke, endpoint dots, optional arrow head, and endpoint grips.
   *
   * @param view - Active 2D view.
   * @returns Built visuals; {@link AcApOverlayWorldDrawResult.bindGrips} binds
   *   endpoint drags after the group is published.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'line' && geom.type !== 'arrow') {
      return this.emptyResult(this.createGroup())
    }
    const { color, canvasLineWidth, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for viewChanged and pointer drags. */
    const cleanups: Array<() => void> = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    /** Live endpoints mutated during grip drag before store commit. */
    const live = {
      start: { ...geom.start },
      end: { ...geom.end }
    }

    const startDot = new AcTrHtmlGrip({
      id: `${this.record.id}-dot1`,
      color,
      worldPosition: live.start,
      layer,
      layoutId
    })
    const endDot = new AcTrHtmlGrip({
      id: `${this.record.id}-dot2`,
      color,
      worldPosition: live.end,
      layer,
      layoutId
    })
    group.add(startDot, endDot)

    const container = view.container
    const overlay = new AcTrHtmlCanvasOverlay({
      id: `${this.record.id}-stroke`,
      container,
      layer,
      layoutId
    })
    group.addCanvas(overlay)
    this.seedOverlaySizes(view, [startDot, endDot], [overlay.canvas])
    /** Endpoints captured when an endpoint drag starts (for zero-delta). */
    let dragStart = {
      start: { ...live.start },
      end: { ...live.end }
    }
    /** Whether this segment draws an arrow head at the end. */
    const isArrow = geom.type === 'arrow'
    /**
     * Redraw canvas stroke / arrow head from {@link live} endpoints.
     */
    const redrawStroke = () => {
      const ctx = acapFitOverlayCanvas(overlay.canvas, container)
      if (!ctx) return
      const a = view.worldToScreen(live.start)
      const b = view.worldToScreen(live.end)
      ctx.strokeStyle = this.record.style.color
      const strokeWidth = acapScaledOverlayLineWidth(
        canvasLineWidth,
        overlay.canvas,
        view,
        this.record.style.strokeWidthWcs
      )
      ctx.lineWidth = strokeWidth
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      if (isArrow) {
        acapDrawOverlayArrowHead(
          ctx,
          a,
          b,
          this.record.style.color,
          acapScaledOverlayArrowSize(
            overlay.canvas,
            view,
            this.record.style.arrowSizeWcs
          )
        )
      }
    }
    redrawStroke()
    view.events.viewChanged.addEventListener(redrawStroke)
    cleanups.push(() =>
      view.events.viewChanged.removeEventListener(redrawStroke)
    )

    /**
     * Select the markup when an endpoint drag begins.
     */
    const beginEndpointDrag = () => {
      selectMarkupGroup(view, this.record.id)
      dragStart = {
        start: { ...live.start },
        end: { ...live.end }
      }
    }
    /**
     * Commit live endpoints to the store and republish.
     */
    const commitEndpoints = () => {
      const startDelta = Math.hypot(
        live.start.x - dragStart.start.x,
        live.start.y - dragStart.start.y
      )
      const endDelta = Math.hypot(
        live.end.x - dragStart.end.x,
        live.end.y - dragStart.end.y
      )
      if (startDelta < 1e-9 && endDelta < 1e-9) {
        redrawStroke()
        return
      }
      runMarkupEdit(view, isArrow ? 'Move Arrow' : 'Move Line', () => {
        const updated = getMarkupStore().updateGeometry(
          this.record.id,
          isArrow
            ? {
                type: 'arrow',
                start: { ...live.start },
                end: { ...live.end }
              }
            : {
                type: 'line',
                start: { ...live.start },
                end: { ...live.end }
              }
        )
        if (updated) {
          republishMarkup(view, updated)
        }
      })
    }
    pendingGrips.push(() => {
      cleanups.push(
        acapBindOverlayPointerDrag({
          view,
          el: startDot.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.start = point
            acapPlaceOverlayHtml(view, startDot, point)
            redrawStroke()
          },
          onCommit: commitEndpoints
        }),
        acapBindOverlayPointerDrag({
          view,
          el: endDot.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.end = point
            acapPlaceOverlayHtml(view, endDot, point)
            redrawStroke()
          },
          onCommit: commitEndpoints
        })
      )
    })

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
      },
      bindGrips: () => {
        for (const bind of pendingGrips) bind()
      }
    }
  }
}
