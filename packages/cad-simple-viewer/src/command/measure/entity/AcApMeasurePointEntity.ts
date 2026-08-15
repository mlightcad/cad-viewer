import type { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcTrHtmlBadge, AcTrHtmlDot } from '@mlightcad/three-renderer'

import {
  type AcApMeasurementStyle,
  formatMeasurementValue} from '../../../util'
import type { AcTrView2d } from '../../../view'
import { serializeMeasurementStyle } from '../AcApMeasurementSidecar'
import { MEASUREMENT_LAYER } from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'

/**
 * Point / coordinate measurement overlay entity.
 *
 * Renders an HTML dot at the measured location and a badge showing formatted
 * X/Y coordinates. No CAD transient entities are created.
 */
export class AcApMeasurePointEntity extends AcApMeasureEntity {
  /** Measured point in world coordinates. */
  private readonly point: AcGePoint3dLike

  /**
   * Creates a point measure entity at the given location.
   *
   * @param point - World position to measure
   * @param options - Shared id, layout, and style options
   */
  constructor(point: AcGePoint3dLike, options: AcApMeasureEntityOptions) {
    super(
      options.id ?? `point-${Date.now()}`,
      options.layoutId,
      options.style
    )
    this.point = point
  }

  /**
   * Factory that builds a point entity from a world position and style.
   *
   * @param point - World position to measure
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link AcApMeasurePointEntity}
   */
  static create(
    point: AcGePoint3dLike,
    style: AcApMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): AcApMeasurePointEntity {
    return new AcApMeasurePointEntity(point, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (the measured point itself).
   *
   * @returns Copy of {@link point} with `z: 0`
   */
  override primaryPoint(): AcGePoint3dLike {
    return { x: this.point.x, y: this.point.y, z: 0 }
  }

  /**
   * Serializes this point measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @returns Record with `type: 'point'` and position geometry
   */
  toRecord(layoutId?: string): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'point',
      layoutId,
      style: serializeMeasurementStyle(this.style),
      geometry: {
        type: 'point',
        position: { x: this.point.x, y: this.point.y }
      }
    }
  }

  /**
   * Draws the coordinate dot, badge, and commit extras (no CAD transients).
   *
   * @param view - Active 2D view for HTML overlays
   * @param db - Database used to format the coordinate label
   * @returns World-draw result with empty `entityIds`
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const layoutId = this.resolveLayoutId(view)
    const value = {
      kind: 'coordinate' as const,
      x: this.point.x,
      y: this.point.y
    }
    const color = this.style.color
    const group = this.createGroup(view).add(
      new AcTrHtmlDot({
        id: `${this.entityId}-dot`,
        color,
        worldPosition: this.point,
        layer: MEASUREMENT_LAYER
      }),
      new AcTrHtmlBadge({
        id: `${this.entityId}-badge`,
        color,
        text: formatMeasurementValue(db, value),
        worldPosition: this.point,
        layer: MEASUREMENT_LAYER,
        fontSize: this.style.fontSize,
        transform: 'translate(-50%, calc(-50% - 16px))'
      })
    )

    return {
      group,
      entityIds: [],
      dispose: () => undefined,
      extras: {
        style: this.style,
        value,
        snapshot: this.toRecord(layoutId)
      }
    }
  }
}
