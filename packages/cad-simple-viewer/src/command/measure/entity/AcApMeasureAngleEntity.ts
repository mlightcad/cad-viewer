import {
  type AcDbDatabase,
  type AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlGrip
} from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementAngle
} from '../../../util'
import type { AcTrView2d } from '../../../view'
import {
  acapBindOverlayPointerDrag,
  acapPlaceOverlayHtml
} from '../../overlay'
import { runMeasurementEdit } from '../AcApMeasurementHistory'
import { republishMeasurement } from '../AcApMeasurementRepublish'
import {
  getMeasurementSnapshot,
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
import {
  measureAngleBadgeWorld,
  selectMeasurementGroup
} from './AcApMeasureEntityGrips'

type Point2 = { x: number; y: number }

/**
 * Angle measurement overlay entity.
 *
 * Renders two arm lines and an angle arc on an HTML canvas, HTML dots at the
 * vertex and arm ends, and a degree badge along the angle bisector.
 * Endpoint grips update the measured value live and republish on commit.
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
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
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
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'angle'` and vertex/arm geometry
   */
  toRecord(layoutId?: string, view?: AcTrView2d): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'angle',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'angle',
        vertex: { x: this.vertex.x, y: this.vertex.y },
        arm1: { x: this.arm1.x, y: this.arm1.y },
        arm2: { x: this.arm2.x, y: this.arm2.y }
      }
    }
  }

  /**
   * Draws arm lines + arc canvas, dots, badge, and commit extras.
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the angle label
   * @returns World-draw result including redraw/dispose hooks
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const live = {
      vertex: { x: this.vertex.x, y: this.vertex.y } as Point2,
      arm1: { x: this.arm1.x, y: this.arm1.y } as Point2,
      arm2: { x: this.arm2.x, y: this.arm2.y } as Point2
    }
    let degrees = measureAngleDeg(live.vertex, live.arm1, live.arm2)
    const color = this.style.color
    const layoutId = this.resolveLayoutId(view)
    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `angle-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })

    const dotV = new AcTrHtmlGrip({
      id: `${this.entityId}-dotV`,
      color,
      worldPosition: live.vertex,
      layer: MEASUREMENT_LAYER
    })
    const dot1 = new AcTrHtmlGrip({
      id: `${this.entityId}-dot1`,
      color,
      worldPosition: live.arm1,
      layer: MEASUREMENT_LAYER
    })
    const dot2 = new AcTrHtmlGrip({
      id: `${this.entityId}-dot2`,
      color,
      worldPosition: live.arm2,
      layer: MEASUREMENT_LAYER
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementAngle(db, (degrees * Math.PI) / 180),
      worldPosition: measureAngleBadgeWorld(live.vertex, live.arm1, live.arm2),
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize
    })
    this.seedOverlaySizes(
      view,
      [dotV, dot1, dot2, badge],
      [persistOverlay.canvas]
    )
    const paintAngle = (paintStyle = this.style) =>
      drawMeasureAngleArcOnCanvas(
        persistOverlay.canvas,
        view,
        live.vertex,
        live.arm1,
        live.arm2,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintAngle()
    const redrawPersist = () =>
      paintAngle(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(dotV, dot1, dot2, badge)
      .addCanvas(persistOverlay)

    const cleanups: Array<() => void> = [
      () => view.events.viewChanged.removeEventListener(redrawPersist)
    ]
    const pendingGrips: Array<() => void> = []
    let dragStart = {
      vertex: { ...live.vertex },
      arm1: { ...live.arm1 },
      arm2: { ...live.arm2 }
    }

    const refreshLive = () => {
      degrees = measureAngleDeg(live.vertex, live.arm1, live.arm2)
      badge.setText(formatMeasurementAngle(db, (degrees * Math.PI) / 180))
      acapPlaceOverlayHtml(
        view,
        badge,
        measureAngleBadgeWorld(live.vertex, live.arm1, live.arm2)
      )
      paintAngle(getMeasurementStyle(this.entityId) ?? this.style)
      view.isHtmlDirty = true
    }

    const beginEndpointDrag = () => {
      selectMeasurementGroup(view, this.entityId)
      dragStart = {
        vertex: { ...live.vertex },
        arm1: { ...live.arm1 },
        arm2: { ...live.arm2 }
      }
    }

    const commitEndpoints = () => {
      const delta =
        Math.hypot(
          live.vertex.x - dragStart.vertex.x,
          live.vertex.y - dragStart.vertex.y
        ) +
        Math.hypot(
          live.arm1.x - dragStart.arm1.x,
          live.arm1.y - dragStart.arm1.y
        ) +
        Math.hypot(
          live.arm2.x - dragStart.arm2.x,
          live.arm2.y - dragStart.arm2.y
        )
      if (delta < 1e-9) {
        refreshLive()
        return
      }
      const snap = getMeasurementSnapshot(this.entityId)
      const geometry: AcApMeasurementRecord['geometry'] = {
        type: 'angle',
        vertex: { ...live.vertex },
        arm1: { ...live.arm1 },
        arm2: { ...live.arm2 }
      }
      const record: AcApMeasurementRecord = snap
        ? { ...snap, geometry }
        : {
            id: this.entityId,
            type: 'angle',
            layoutId,
            style: this.serializeStyle(view),
            geometry
          }
      runMeasurementEdit(view, 'Move Angle', () => {
        republishMeasurement(view, db, record)
      })
    }

    const bindDot = (
      dot: AcTrHtmlGrip,
      key: 'vertex' | 'arm1' | 'arm2'
    ) =>
      acapBindOverlayPointerDrag({
        view,
        el: dot.element,
        onDragStart: beginEndpointDrag,
        onMove: point => {
          live[key] = point
          acapPlaceOverlayHtml(view, dot, point)
          refreshLive()
        },
        onCommit: commitEndpoints
      })

    pendingGrips.push(() => {
      cleanups.push(bindDot(dotV, 'vertex'), bindDot(dot1, 'arm1'), bindDot(dot2, 'arm2'))
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
        value: { kind: 'angle', radians: (degrees * Math.PI) / 180 },
        snapshot: this.toRecord(layoutId, view),
        redraw: paintAngle
      }
    }
  }
}
