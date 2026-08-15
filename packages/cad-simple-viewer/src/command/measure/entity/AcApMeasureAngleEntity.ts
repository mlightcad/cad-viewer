import {
  type AcDbDatabase,
  AcDbLine,
  type AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot
} from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementAngle} from '../../../util'
import type { AcTrView2d } from '../../../view'
import { serializeMeasurementStyle } from '../AcApMeasurementSidecar'
import {
  getMeasurementStyle,
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  drawMeasureAngleArcOnCanvas,
  measureAngleDeg
} from './AcApMeasureDrawUtil'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'

/**
 * Angle measurement overlay entity.
 *
 * Renders two transient CAD arm lines from the vertex, HTML dots at vertex and
 * arm ends, a canvas arc between the arms, and a degree badge along the angle
 * bisector. Redraws the arc on view changes.
 */
export class AcApMeasureAngleEntity extends AcApMeasureEntity {
  /** Angle vertex in world coordinates. */
  private readonly vertex: AcGePoint3dLike
  /** First arm endpoint in world coordinates. */
  private readonly arm1: AcGePoint3dLike
  /** Second arm endpoint in world coordinates. */
  private readonly arm2: AcGePoint3dLike

  /**
   * Creates an angle measure entity from a vertex and two arm endpoints.
   *
   * @param vertex - Angle vertex
   * @param arm1 - First arm endpoint
   * @param arm2 - Second arm endpoint
   * @param options - Shared id, layout, and style options
   */
  constructor(
    vertex: AcGePoint3dLike,
    arm1: AcGePoint3dLike,
    arm2: AcGePoint3dLike,
    options: AcApMeasureEntityOptions
  ) {
    super(
      options.id ?? `angle-${Date.now()}`,
      options.layoutId,
      options.style
    )
    this.vertex = vertex
    this.arm1 = arm1
    this.arm2 = arm2
  }

  /**
   * Factory that builds an angle entity from vertex, arms, and style.
   *
   * @param vertex - Angle vertex
   * @param arm1 - First arm endpoint
   * @param arm2 - Second arm endpoint
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link AcApMeasureAngleEntity}
   */
  static create(
    vertex: AcGePoint3dLike,
    arm1: AcGePoint3dLike,
    arm2: AcGePoint3dLike,
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): AcApMeasureAngleEntity {
    return new AcApMeasureAngleEntity(vertex, arm1, arm2, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (the angle vertex).
   *
   * @returns Copy of {@link vertex} with `z: 0`
   */
  override primaryPoint(): AcGePoint3dLike {
    return { x: this.vertex.x, y: this.vertex.y, z: 0 }
  }

  /**
   * Serializes this angle measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @returns Record with `type: 'angle'` and vertex/arm geometry
   */
  toRecord(layoutId?: string): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'angle',
      layoutId,
      style: serializeMeasurementStyle(this.style),
      geometry: {
        type: 'angle',
        vertex: { x: this.vertex.x, y: this.vertex.y },
        arm1: { x: this.arm1.x, y: this.arm1.y },
        arm2: { x: this.arm2.x, y: this.arm2.y }
      }
    }
  }

  /**
   * Draws arm lines, dots, angle arc canvas, badge, and commit extras.
   *
   * Registers a `viewChanged` listener to repaint the persistent arc; dispose
   * extras remove the listener and transient lines.
   *
   * @param view - Active 2D view for transients and HTML overlays
   * @param db - Database used to format the angle label
   * @returns World-draw result including redraw/dispose hooks
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const color = this.style.color
    const degrees = measureAngleDeg(this.vertex, this.arm1, this.arm2)
    const line1 = new AcDbLine(this.vertex, this.arm1)
    line1.color = color
    line1.lineWeight = this.style.lineWeight
    view.addTransientEntity(line1)
    const line2 = new AcDbLine(this.vertex, this.arm2)
    line2.color = color
    line2.lineWeight = this.style.lineWeight
    view.addTransientEntity(line2)

    const layoutId = this.resolveLayoutId(view)
    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `angle-arc-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const paintArc = (paintStyle = this.style) =>
      drawMeasureAngleArcOnCanvas(
        persistOverlay.canvas,
        view,
        this.vertex,
        this.arm1,
        this.arm2,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintArc()
    const redrawPersist = () =>
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const dx1 = this.arm1.x - this.vertex.x
    const dy1 = this.arm1.y - this.vertex.y
    const dx2 = this.arm2.x - this.vertex.x
    const dy2 = this.arm2.y - this.vertex.y
    const wLen1 = Math.hypot(dx1, dy1)
    const wLen2 = Math.hypot(dx2, dy2)
    const u1x = wLen1 > 0 ? dx1 / wLen1 : 1
    const u1y = wLen1 > 0 ? dy1 / wLen1 : 0
    const u2x = wLen2 > 0 ? dx2 / wLen2 : 1
    const u2y = wLen2 > 0 ? dy2 / wLen2 : 0
    let bx = u1x + u2x
    let by = u1y + u2y
    const bLen = Math.hypot(bx, by)
    if (bLen > 0) {
      bx /= bLen
      by /= bLen
    } else {
      bx = -u1y
      by = u1x
    }
    const badgeOffset = Math.max(
      Math.min(wLen1, wLen2) * 0.4,
      Math.max(wLen1, wLen2) * 0.15
    )
    const badgeWorld = {
      x: this.vertex.x + bx * badgeOffset,
      y: this.vertex.y + by * badgeOffset
    }

    const group = this.createGroup(view)
      .add(
        new AcTrHtmlDot({
          id: `${this.entityId}-dotV`,
          color,
          worldPosition: this.vertex,
          layer: MEASUREMENT_LAYER
        }),
        new AcTrHtmlDot({
          id: `${this.entityId}-dot1`,
          color,
          worldPosition: this.arm1,
          layer: MEASUREMENT_LAYER
        }),
        new AcTrHtmlDot({
          id: `${this.entityId}-dot2`,
          color,
          worldPosition: this.arm2,
          layer: MEASUREMENT_LAYER
        }),
        new AcTrHtmlBadge({
          id: `${this.entityId}-badge`,
          color,
          text: formatMeasurementAngle(db, (degrees * Math.PI) / 180),
          worldPosition: badgeWorld,
          layer: MEASUREMENT_LAYER,
          fontSize: this.style.fontSize
        })
      )
      .addCanvas(persistOverlay)

    return {
      group,
      entityIds: [line1.objectId, line2.objectId],
      dispose: () => {
        view.removeTransientEntity(line1.objectId)
        view.removeTransientEntity(line2.objectId)
        view.events.viewChanged.removeEventListener(redrawPersist)
      },
      extras: {
        entityIds: [line1.objectId, line2.objectId],
        entities: [line1, line2],
        style: this.style,
        value: { kind: 'angle', radians: (degrees * Math.PI) / 180 },
        snapshot: this.toRecord(layoutId),
        redraw: paintArc
      }
    }
  }
}
