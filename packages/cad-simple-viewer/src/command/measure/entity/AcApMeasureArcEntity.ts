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
import { getMeasurementStyle, MEASUREMENT_LAYER } from '../AcApMeasurementStore'
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

type Point2 = { x: number; y: number }

/**
 * Arc-length measurement overlay entity.
 *
 * Renders a canvas stroke of the measured arc (the sweep that contains
 * {@link through} when present, otherwise the shorter arc), HTML dots at
 * the control points, and a length badge at the arc midpoint.
 * Redraws the arc on view changes.
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
  private resolveMeasuredArc(): AcGeCircArc2d | null {
    if (this.through) {
      return AcGeCircArc2d.tryCreateByThreePoints(
        this.start,
        this.through,
        this.end
      )
    }
    return AcGeCircArc2d.tryCreateShorterArc(this.start, this.end, {
      x: this.geom.cx,
      y: this.geom.cy
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
    const mid = this.resolveMeasuredArc()?.midPoint
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
   * Registers a `viewChanged` listener to repaint the arc; dispose extras
   * remove the listener.
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the arc-length label
   * @returns World-draw result including redraw/dispose hooks
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const color = this.style.color
    const arcLen = this.resolveMeasuredArc()?.length ?? 0
    const mid = this.primaryPoint()
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
      worldPosition: this.start,
      layer: MEASUREMENT_LAYER
    })
    const dotThrough = this.through
      ? new AcTrHtmlDot({
          id: `${this.entityId}-dot-through`,
          color,
          worldPosition: this.through,
          layer: MEASUREMENT_LAYER
        })
      : undefined
    const dot2 = new AcTrHtmlDot({
      id: `${this.entityId}-dot2`,
      color,
      worldPosition: this.end,
      layer: MEASUREMENT_LAYER
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementLength(db, arcLen),
      worldPosition: mid,
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
        this.geom,
        this.start,
        this.end,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight),
        this.through
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

    return {
      group,
      entityIds: [],
      dispose: () => {
        view.events.viewChanged.removeEventListener(redrawPersist)
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
