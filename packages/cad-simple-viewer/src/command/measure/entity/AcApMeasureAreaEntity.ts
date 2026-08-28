import type { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
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
import {
  getMeasurementStyle,
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  drawMeasureAreaOnCanvas,
  measureCentroid,
  measureShoelaceArea
} from './AcApMeasureDrawUtil'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'

/**
 * Area measurement overlay entity.
 *
 * Renders a filled canvas polygon, HTML dots at each vertex, and an area
 * badge at the vertex centroid. Requires at least three points for a full
 * draw; fewer points yield an empty group with empty extras.
 */
export class AcApMeasureAreaEntity extends AcApMeasureEntity {
  /** Polygon vertices in world coordinates (closed implicitly when drawn). */
  private readonly points: AcGePoint3dLike[]

  /**
   * Creates an area measure entity from a polygon vertex list.
   *
   * @param points - Polygon vertices in world coordinates
   * @param options - Shared id, layout, and style options
   */
  constructor(points: AcGePoint3dLike[], options: AcApMeasureEntityOptions) {
    super(
      options.id ?? `area-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.points = points
  }

  /**
   * Factory that builds an area entity from vertices and style.
   *
   * @param points - Polygon vertices in world coordinates
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link AcApMeasureAreaEntity}
   */
  static create(
    points: AcGePoint3dLike[],
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): AcApMeasureAreaEntity {
    return new AcApMeasureAreaEntity(points, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (vertex centroid).
   *
   * @returns Centroid with `z: 0`, or `undefined` when there are no points
   */
  override primaryPoint(): AcGePoint3dLike | undefined {
    if (this.points.length === 0) return undefined
    const c = measureCentroid(this.points)
    return { x: c.x, y: c.y, z: 0 }
  }

  /**
   * Serializes this area measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'area'` and polygon point geometry
   */
  toRecord(layoutId?: string, view?: AcTrView2d): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'area',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'area',
        points: this.points.map(p => ({ x: p.x, y: p.y }))
      }
    }
  }

  /**
   * Draws the filled polygon canvas, vertex dots, area badge, and extras.
   *
   * When fewer than three points are present, returns an empty group and
   * empty extras without registering view listeners.
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the area label
   * @returns World-draw result including redraw/dispose hooks when valid
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    if (this.points.length < 3) {
      const group = this.createGroup(view)
      return {
        group,
        entityIds: [],
        dispose: () => undefined,
        extras: {}
      }
    }
    const color = this.style.color
    const area = measureShoelaceArea(this.points)
    const layoutId = this.resolveLayoutId(view)
    const mid = measureCentroid(this.points)

    const persistOverlay = new AcTrHtmlCanvasOverlay({
      id: `area-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: `${formatMeasurementLength(db, area)}²`,
      worldPosition: mid,
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize
    })
    const dots = this.points.map(
      (p, i) =>
        new AcTrHtmlDot({
          id: `${this.entityId}-dot${i}`,
          color,
          worldPosition: p,
          layer: MEASUREMENT_LAYER
        })
    )
    this.seedOverlaySizes(
      view,
      [badge, ...dots],
      [persistOverlay.canvas]
    )
    const paintArea = (paintStyle = this.style) =>
      drawMeasureAreaOnCanvas(
        persistOverlay.canvas,
        view,
        this.points,
        paintStyle.color,
        acapMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintArea()
    const redrawPersist = () =>
      paintArea(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(badge, ...dots)
      .addCanvas(persistOverlay)

    return {
      group,
      entityIds: [],
      dispose: () => {
        view.events.viewChanged.removeEventListener(redrawPersist)
      },
      extras: {
        style: this.style,
        value: { kind: 'area', value: area },
        snapshot: this.toRecord(layoutId, view),
        redraw: paintArea
      }
    }
  }
}
