import {
  type AcDbDatabase,
  type AcGePoint3dLike
} from '@mlightcad/data-model'
import { AcTrHtmlBadge, AcTrHtmlCanvasOverlay, AcTrHtmlDot } from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementLength
} from '../../../util'
import type { AcTrView2d } from '../../../view'
import {
  getMeasurementStyle,
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import { drawMeasureSegmentOnCanvas } from './AcApMeasureDrawUtil'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'

/**
 * Euclidean distance between two points in the XY plane (Z ignored).
 *
 * @param p1 - First endpoint
 * @param p2 - Second endpoint
 * @returns Distance `√((Δx)² + (Δy)²)`
 */
function calcDist(p1: AcGePoint3dLike, p2: AcGePoint3dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Distance measurement overlay entity.
 *
 * Renders an HTML canvas segment between two endpoints, HTML dots at each end,
 * and a length badge at the midpoint. No CAD transient entities.
 */
export class AcApMeasureDistanceEntity extends AcApMeasureEntity {
  /** First endpoint of the measured segment in world coordinates. */
  private readonly p1: AcGePoint3dLike
  /** Second endpoint of the measured segment in world coordinates. */
  private readonly p2: AcGePoint3dLike

  /**
   * Creates a distance measure entity between two points.
   *
   * @param p1 - First endpoint
   * @param p2 - Second endpoint
   * @param options - Shared id, layout, and style options
   */
  constructor(
    p1: AcGePoint3dLike,
    p2: AcGePoint3dLike,
    options: AcApMeasureEntityOptions
  ) {
    super(
      options.id ?? `dist-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.p1 = p1
    this.p2 = p2
  }

  /**
   * Factory that builds a distance entity from endpoints and style.
   *
   * @param p1 - First endpoint
   * @param p2 - Second endpoint
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link AcApMeasureDistanceEntity}
   */
  static create(
    p1: AcGePoint3dLike,
    p2: AcGePoint3dLike,
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): AcApMeasureDistanceEntity {
    return new AcApMeasureDistanceEntity(p1, p2, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Midpoint of the measured segment (badge / primary anchor).
   *
   * @returns World point at the average of {@link p1} and {@link p2}, `z: 0`
   */
  override primaryPoint(): AcGePoint3dLike {
    return {
      x: (this.p1.x + this.p2.x) / 2,
      y: (this.p1.y + this.p2.y) / 2,
      z: 0
    }
  }

  /**
   * Serializes this distance measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'distance'` and start/end geometry
   */
  toRecord(layoutId?: string, view?: AcTrView2d): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'distance',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'distance',
        start: { x: this.p1.x, y: this.p1.y },
        end: { x: this.p2.x, y: this.p2.y }
      }
    }
  }

  /**
   * Draws the distance canvas stroke, endpoint dots, length badge, and extras.
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the length label
   * @returns World-draw result with dispose for the viewChanged listener
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const dist = calcDist(this.p1, this.p2)
    const color = this.style.color
    const layoutId = this.resolveLayoutId(view)
    const mid = this.primaryPoint()!

    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `dist-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const dot1 = new AcTrHtmlDot({
      id: `${this.entityId}-dot1`,
      color,
      worldPosition: this.p1,
      layer: MEASUREMENT_LAYER
    })
    const dot2 = new AcTrHtmlDot({
      id: `${this.entityId}-dot2`,
      color,
      worldPosition: this.p2,
      layer: MEASUREMENT_LAYER
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementLength(db, dist),
      worldPosition: mid,
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize
    })
    this.seedOverlaySizes(view, [dot1, dot2, badge], [persistOverlay.canvas])
    const paintSegment = (paintStyle = this.style) =>
      drawMeasureSegmentOnCanvas(
        persistOverlay.canvas,
        view,
        this.p1,
        this.p2,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintSegment()
    const redrawPersist = () =>
      paintSegment(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(dot1, dot2, badge)
      .addCanvas(persistOverlay)

    return {
      group,
      entityIds: [],
      dispose: () => {
        view.events.viewChanged.removeEventListener(redrawPersist)
      },
      extras: {
        style: this.style,
        value: { kind: 'length', value: dist },
        snapshot: this.toRecord(layoutId, view),
        redraw: paintSegment
      }
    }
  }
}
