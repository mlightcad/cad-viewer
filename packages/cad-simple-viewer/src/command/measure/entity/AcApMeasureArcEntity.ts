import { type AcDbDatabase, AcGeCircArc2d } from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot
} from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementLength
} from '../../../util'
import type { AcTrView2d } from '../../../view'
import {
  acapBindOverlayPointerDrag,
  acapPlaceOverlayHtml
} from '../../overlay'
import { runMeasurementEdit } from '../AcApMeasurementHistory'
import { republishMeasurement } from '../AcApMeasurementRepublish'
import { getMeasurementSnapshot, getMeasurementStyle, MEASUREMENT_LAYER } from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  type AcApMeasureCircleGeom,
  drawMeasureArcOnCanvas
} from './AcApMeasureDrawUtil'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'
import { selectMeasurementGroup } from './AcApMeasureEntityGrips'

type Point2 = { x: number; y: number }

/**
 * Project a free point onto a circle (for legacy short-arc records).
 */
function projectOntoCircle(
  geom: AcApMeasureCircleGeom,
  point: Point2
): Point2 {
  const dx = point.x - geom.cx
  const dy = point.y - geom.cy
  const len = Math.hypot(dx, dy)
  if (!(len > 1e-12)) {
    return { x: geom.cx + geom.r, y: geom.cy }
  }
  const s = geom.r / len
  return { x: geom.cx + dx * s, y: geom.cy + dy * s }
}

/**
 * Arc-length measurement overlay entity.
 *
 * Renders a canvas stroke of the measured arc, HTML dots at the control
 * points, and a length badge at the arc midpoint. Endpoint grips update the
 * measured value live and republish on commit.
 */
export class AcApMeasureArcEntity extends AcApMeasureEntity {
  /** Circle center and radius defining the measured arc. */
  private readonly geom: AcApMeasureCircleGeom
  /** Arc start point in world XY. */
  private readonly start: Point2
  /** Optional point on the measured sweep (distinguishes major vs minor arc). */
  private readonly through: Point2 | undefined
  /** Arc end point in world XY. */
  private readonly end: Point2

  /**
   * Creates an arc-length measure entity on the given circle.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param options - Shared id, layout, and style options
   * @param through - Point on the measured sweep; omit for legacy short-arc records
   */
  constructor(
    geom: AcApMeasureCircleGeom,
    start: Point2,
    end: Point2,
    options: AcApMeasureEntityOptions,
    through?: Point2
  ) {
    super(
      options.id ?? `arc-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.geom = geom
    this.start = start
    this.end = end
    this.through = through
  }

  /**
   * Reconstructs the measured sweep from stored control points.
   */
  private resolveMeasuredArc(
    geom: AcApMeasureCircleGeom,
    start: Point2,
    end: Point2,
    through?: Point2
  ): AcGeCircArc2d | null {
    if (through) {
      return AcGeCircArc2d.tryCreateByThreePoints(start, through, end)
    }
    return AcGeCircArc2d.tryCreateShorterArc(start, end, {
      x: geom.cx,
      y: geom.cy
    })
  }

  /**
   * Factory that builds an arc entity from circle geometry, endpoints, and style.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param style - Measurement visual style
   * @param options - Optional id, layout, and through-point overrides
   * @returns New {@link AcApMeasureArcEntity}
   */
  static create(
    geom: AcApMeasureCircleGeom,
    start: Point2,
    end: Point2,
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string; through?: Point2 }
  ): AcApMeasureArcEntity {
    return new AcApMeasureArcEntity(
      geom,
      start,
      end,
      {
        style,
        id: options?.id,
        layoutId: options?.layoutId
      },
      options?.through
    )
  }

  /**
   * Primary anchor for the measurement (midpoint of the measured sweep).
   *
   * @returns World point on the arc between {@link start} and {@link end}
   */
  override primaryPoint() {
    const mid = this.resolveMeasuredArc(
      this.geom,
      this.start,
      this.end,
      this.through
    )?.midPoint
    return mid
      ? { x: mid.x, y: mid.y, z: 0 }
      : { x: this.start.x, y: this.start.y, z: 0 }
  }

  /**
   * Serializes this arc measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'arc'` and center/radius/start/through/end geometry
   */
  toRecord(layoutId?: string, view?: AcTrView2d): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'arc',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'arc',
        center: { x: this.geom.cx, y: this.geom.cy },
        radius: this.geom.r,
        start: { x: this.start.x, y: this.start.y },
        end: { x: this.end.x, y: this.end.y },
        ...(this.through
          ? { through: { x: this.through.x, y: this.through.y } }
          : {})
      }
    }
  }

  /**
   * Draws the arc canvas stroke, control-point dots, length badge, and extras.
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the arc-length label
   * @returns World-draw result including redraw/dispose hooks
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const hasThrough = this.through != null
    const live = {
      geom: { ...this.geom } as AcApMeasureCircleGeom,
      start: { ...this.start } as Point2,
      end: { ...this.end } as Point2,
      through: this.through ? ({ ...this.through } as Point2) : undefined
    }

    const resolveArc = () =>
      this.resolveMeasuredArc(live.geom, live.start, live.end, live.through)

    const syncGeomFromThreePoints = (): boolean => {
      if (!live.through) return true
      const arc = AcGeCircArc2d.tryCreateByThreePoints(
        live.start,
        live.through,
        live.end
      )
      if (!arc) return false
      live.geom = {
        cx: arc.center.x,
        cy: arc.center.y,
        r: arc.radius
      }
      return true
    }

    let arcLen = resolveArc()?.length ?? 0
    const midPoint = (): Point2 => {
      const mid = resolveArc()?.midPoint
      return mid
        ? { x: mid.x, y: mid.y }
        : { x: live.start.x, y: live.start.y }
    }

    const color = this.style.color
    const layoutId = this.resolveLayoutId(view)

    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `arc-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const dot1 = new AcTrHtmlDot({
      id: `${this.entityId}-dot1`,
      color,
      worldPosition: live.start,
      layer: MEASUREMENT_LAYER
    })
    const dotThrough = live.through
      ? new AcTrHtmlDot({
          id: `${this.entityId}-dot-through`,
          color,
          worldPosition: live.through,
          layer: MEASUREMENT_LAYER
        })
      : undefined
    const dot2 = new AcTrHtmlDot({
      id: `${this.entityId}-dot2`,
      color,
      worldPosition: live.end,
      layer: MEASUREMENT_LAYER
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementLength(db, arcLen),
      worldPosition: midPoint(),
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize
    })
    this.seedOverlaySizes(
      view,
      dotThrough ? [dot1, dotThrough, dot2, badge] : [dot1, dot2, badge],
      [persistOverlay.canvas]
    )
    const paintArc = (paintStyle = this.style) =>
      drawMeasureArcOnCanvas(
        persistOverlay.canvas,
        view,
        live.geom,
        live.start,
        live.end,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight),
        live.through
      )
    paintArc()
    const redrawPersist = () =>
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(
        dot1,
        ...(dotThrough ? [dotThrough] : []),
        dot2,
        badge
      )
      .addCanvas(persistOverlay)

    const cleanups: Array<() => void> = [
      () => view.events.viewChanged.removeEventListener(redrawPersist)
    ]
    const pendingGrips: Array<() => void> = []
    let dragStart = {
      start: { ...live.start },
      end: { ...live.end },
      through: live.through ? { ...live.through } : undefined,
      geom: { ...live.geom }
    }

    const refreshLive = () => {
      const valid = syncGeomFromThreePoints()
      const arc = valid ? resolveArc() : null
      arcLen = arc?.length ?? 0
      badge.setText(formatMeasurementLength(db, arcLen))
      acapPlaceOverlayHtml(view, badge, midPoint())
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
      view.isHtmlDirty = true
    }

    const restoreDragStart = () => {
      live.start = { ...dragStart.start }
      live.end = { ...dragStart.end }
      live.through = dragStart.through ? { ...dragStart.through } : undefined
      live.geom = { ...dragStart.geom }
      acapPlaceOverlayHtml(view, dot1, live.start)
      acapPlaceOverlayHtml(view, dot2, live.end)
      if (dotThrough && live.through) {
        acapPlaceOverlayHtml(view, dotThrough, live.through)
      }
      refreshLive()
    }

    const beginEndpointDrag = () => {
      selectMeasurementGroup(view, this.entityId)
      dragStart = {
        start: { ...live.start },
        end: { ...live.end },
        through: live.through ? { ...live.through } : undefined,
        geom: { ...live.geom }
      }
    }

    const commitEndpoints = () => {
      const delta =
        Math.hypot(
          live.start.x - dragStart.start.x,
          live.start.y - dragStart.start.y
        ) +
        Math.hypot(live.end.x - dragStart.end.x, live.end.y - dragStart.end.y) +
        (live.through && dragStart.through
          ? Math.hypot(
              live.through.x - dragStart.through.x,
              live.through.y - dragStart.through.y
            )
          : 0)
      if (delta < 1e-9) {
        refreshLive()
        return
      }
      if (!syncGeomFromThreePoints()) {
        restoreDragStart()
        return
      }
      const snap = getMeasurementSnapshot(this.entityId)
      const geometry: AcApMeasurementRecord['geometry'] = {
        type: 'arc',
        center: { x: live.geom.cx, y: live.geom.cy },
        radius: live.geom.r,
        start: { ...live.start },
        end: { ...live.end },
        ...(live.through ? { through: { ...live.through } } : {})
      }
      const record: AcApMeasurementRecord = snap
        ? { ...snap, geometry }
        : {
            id: this.entityId,
            type: 'arc',
            layoutId,
            style: this.serializeStyle(view),
            geometry
          }
      runMeasurementEdit(view, 'Move Arc', () => {
        republishMeasurement(view, db, record)
      })
    }

    const constrainEndpoint = (point: Point2): Point2 =>
      hasThrough ? point : projectOntoCircle(live.geom, point)

    pendingGrips.push(() => {
      cleanups.push(
        acapBindOverlayPointerDrag({
          view,
          el: dot1.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.start = constrainEndpoint(point)
            acapPlaceOverlayHtml(view, dot1, live.start)
            refreshLive()
          },
          onCommit: commitEndpoints
        }),
        acapBindOverlayPointerDrag({
          view,
          el: dot2.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.end = constrainEndpoint(point)
            acapPlaceOverlayHtml(view, dot2, live.end)
            refreshLive()
          },
          onCommit: commitEndpoints
        })
      )
      if (dotThrough && live.through) {
        cleanups.push(
          acapBindOverlayPointerDrag({
            view,
            el: dotThrough.element,
            onDragStart: beginEndpointDrag,
            onMove: point => {
              live.through = point
              acapPlaceOverlayHtml(view, dotThrough, point)
              refreshLive()
            },
            onCommit: commitEndpoints
          })
        )
      }
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
      },
      extras: {
        style: this.style,
        value: { kind: 'length', value: arcLen },
        snapshot: this.toRecord(layoutId, view),
        redraw: paintArc
      }
    }
  }
}
