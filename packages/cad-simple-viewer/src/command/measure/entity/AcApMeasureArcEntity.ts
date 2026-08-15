import type { AcDbDatabase } from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot
} from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementLength} from '../../../util'
import type { AcTrView2d } from '../../../view'
import { serializeMeasurementStyle } from '../AcApMeasurementSidecar'
import {
  getMeasurementStyle,
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  type AcApMeasureCircleGeom,
  drawMeasureArcOnCanvas,
  measureShortArcLength,
  measureShortArcMid
} from './AcApMeasureDrawUtil'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'

/**
 * Arc-length measurement overlay entity.
 *
 * Renders a canvas stroke of the shorter arc between two points on a circle,
 * HTML dots at the endpoints, and a length badge at the arc midpoint.
 * Redraws the arc on view changes.
 */
export class AcApMeasureArcEntity extends AcApMeasureEntity {
  /** Circle center and radius defining the measured arc. */
  private readonly geom: AcApMeasureCircleGeom
  /** Arc start point in world XY. */
  private readonly start: { x: number; y: number }
  /** Arc end point in world XY. */
  private readonly end: { x: number; y: number }

  /**
   * Creates an arc-length measure entity on the given circle.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param options - Shared id, layout, and style options
   */
  constructor(
    geom: AcApMeasureCircleGeom,
    start: { x: number; y: number },
    end: { x: number; y: number },
    options: AcApMeasureEntityOptions
  ) {
    super(options.id ?? `arc-${Date.now()}`, options.layoutId, options.style)
    this.geom = geom
    this.start = start
    this.end = end
  }

  /**
   * Factory that builds an arc entity from circle geometry, endpoints, and style.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link AcApMeasureArcEntity}
   */
  static create(
    geom: AcApMeasureCircleGeom,
    start: { x: number; y: number },
    end: { x: number; y: number },
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): AcApMeasureArcEntity {
    return new AcApMeasureArcEntity(geom, start, end, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (midpoint of the shorter arc).
   *
   * @returns World point on the shorter arc between {@link start} and {@link end}
   */
  override primaryPoint() {
    return measureShortArcMid(this.start, this.end, this.geom)
  }

  /**
   * Serializes this arc measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @returns Record with `type: 'arc'` and center/radius/start/end geometry
   */
  toRecord(layoutId?: string): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'arc',
      layoutId,
      style: serializeMeasurementStyle(this.style),
      geometry: {
        type: 'arc',
        center: { x: this.geom.cx, y: this.geom.cy },
        radius: this.geom.r,
        start: { x: this.start.x, y: this.start.y },
        end: { x: this.end.x, y: this.end.y }
      }
    }
  }

  /**
   * Draws the arc canvas stroke, endpoint dots, length badge, and extras.
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
    const arcLen = measureShortArcLength(this.start, this.end, this.geom)
    const mid = measureShortArcMid(this.start, this.end, this.geom)
    const layoutId = this.resolveLayoutId(view)

    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `arc-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const paintArc = (paintStyle = this.style) =>
      drawMeasureArcOnCanvas(
        persistOverlay.canvas,
        view,
        this.geom,
        this.start,
        this.end,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintArc()
    const redrawPersist = () =>
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(
        new AcTrHtmlDot({
          id: `${this.entityId}-dot1`,
          color,
          worldPosition: this.start,
          layer: MEASUREMENT_LAYER
        }),
        new AcTrHtmlDot({
          id: `${this.entityId}-dot2`,
          color,
          worldPosition: this.end,
          layer: MEASUREMENT_LAYER
        }),
        new AcTrHtmlBadge({
          id: `${this.entityId}-badge`,
          color,
          text: formatMeasurementLength(db, arcLen),
          worldPosition: mid,
          layer: MEASUREMENT_LAYER,
          fontSize: this.style.fontSize
        })
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
        snapshot: this.toRecord(layoutId),
        redraw: paintArc
      }
    }
  }
}
