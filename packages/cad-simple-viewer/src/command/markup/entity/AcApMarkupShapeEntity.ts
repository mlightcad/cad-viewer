import { AcGePoint3d } from '@mlightcad/data-model'
import { AcTrHtmlCanvasOverlay, AcTrHtmlDot } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import {
  acapFitOverlayCanvas,
  type AcApOverlayWorldDrawResult} from '../../overlay'
import {
  acapLiveRectCorners,
  acapStrokeLiveCircle,
  acapStrokeLivePolyline
} from '../../overlay/AcApHtmlLivePreview'
import { strokeMarkupCloud } from '../AcApMarkupShapeBuilder'
import type { AcApMarkupShapeOutline } from '../AcApMarkupShapeCallout'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'
import {
  bindMarkupCenterMove,
  publishAttachedCallout
} from './AcApMarkupEntityGrips'

/**
 * Cloud / rect / circle markup with optional attached callout.
 *
 * Builds an HTML canvas shape, a center move grip, and optionally a
 * shape-attached leader + bubble via {@link publishAttachedCallout}.
 * No CAD transient entities.
 */
export class AcApMarkupShapeEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry is `cloud`, `rect`, or `circle`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Center grip for whole-shape move (delegates to the base implementation).
   *
   * @returns Geometry center as a single grip point.
   */
  override subGetGripPoints(): AcGePoint3d[] {
    return super.subGetGripPoints()
  }

  /**
   * Publish canvas shape, center dot, optional attached callout, and center move.
   *
   * @param view - Active 2D view.
   * @returns Built visuals with deferred center-move grip binding.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (
      geom.type !== 'cloud' &&
      geom.type !== 'rect' &&
      geom.type !== 'circle'
    ) {
      return this.emptyResult(this.createGroup())
    }
    const { color, canvasLineWidth, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for viewChanged and grips. */
    const cleanups: Array<() => void> = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    /** World position of the center move grip. */
    let centerPos: { x: number; y: number }
    /** Outline used to constrain an attached callout tip. */
    let outline: AcApMarkupShapeOutline
    /** Live drag translation applied while moving the center grip. */
    let liveOffset = { dx: 0, dy: 0 }

    if (geom.type === 'cloud') {
      centerPos = {
        x: (geom.corner1.x + geom.corner2.x) / 2,
        y: (geom.corner1.y + geom.corner2.y) / 2
      }
      outline = {
        kind: 'cloud',
        corner1: geom.corner1,
        corner2: geom.corner2
      }
    } else if (geom.type === 'rect') {
      centerPos = {
        x: (geom.corner1.x + geom.corner2.x) / 2,
        y: (geom.corner1.y + geom.corner2.y) / 2
      }
      outline = {
        kind: 'rect',
        corner1: geom.corner1,
        corner2: geom.corner2
      }
    } else {
      centerPos = { ...geom.center }
      outline = {
        kind: 'circle',
        center: geom.center,
        radius: geom.radius
      }
    }

    const container = view.container
    const overlay = new AcTrHtmlCanvasOverlay({
      id: `${this.record.id}-shape`,
      container,
      layer,
      layoutId
    })
    group.addCanvas(overlay)

    /**
     * Redraw the shape stroke with the current {@link liveOffset}.
     */
    const redrawShape = () => {
      const ctx = acapFitOverlayCanvas(overlay.canvas, container)
      if (!ctx) return
      const css = this.record.style.color
      if (geom.type === 'cloud') {
        strokeMarkupCloud(
          ctx,
          view,
          geom.corner1,
          geom.corner2,
          css,
          canvasLineWidth,
          liveOffset
        )
      } else if (geom.type === 'rect') {
        const corners = acapLiveRectCorners(geom.corner1, geom.corner2).map(
          p => ({
            x: p.x + liveOffset.dx,
            y: p.y + liveOffset.dy
          })
        )
        acapStrokeLivePolyline(ctx, view, corners, css, canvasLineWidth, {
          closed: true
        })
      } else {
        acapStrokeLiveCircle(
          ctx,
          view,
          {
            x: geom.center.x + liveOffset.dx,
            y: geom.center.y + liveOffset.dy
          },
          geom.radius,
          css,
          canvasLineWidth
        )
      }
    }
    redrawShape()
    view.events.viewChanged.addEventListener(redrawShape)
    cleanups.push(() =>
      view.events.viewChanged.removeEventListener(redrawShape)
    )

    const centerDot = new AcTrHtmlDot({
      id: `${this.record.id}-dot`,
      color,
      worldPosition: centerPos,
      layer,
      layoutId
    })
    group.add(centerDot)

    const attached = geom.callout
      ? publishAttachedCallout({
          view,
          group,
          record: this.record,
          callout: geom.callout,
          style: this.style(),
          cleanups,
          outline
        })
      : undefined

    pendingGrips.push(() => {
      attached?.bindGrips?.()
      cleanups.push(
        bindMarkupCenterMove({
          view,
          recordId: this.record.id,
          centerEl: centerDot,
          attached,
          onLiveOffset: (dx, dy) => {
            liveOffset = { dx, dy }
            redrawShape()
          }
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
