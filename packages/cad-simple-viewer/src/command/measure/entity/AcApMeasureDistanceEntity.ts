import {
  AcDbLine,
  type AcDbDatabase,
  type AcGePoint3dLike
} from '@mlightcad/data-model'
import { AcTrHtmlBadge, AcTrHtmlDot } from '@mlightcad/three-renderer'

import {
  formatMeasurementLength,
  type AcApMeasurementStyle
} from '../../../util'
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
 * Renders a transient CAD line between two endpoints, HTML dots at each end,
 * and a length badge at the midpoint. Commits length value and snapshot to
 * the measurement store.
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
      options.style
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
   * @returns Record with `type: 'distance'` and start/end geometry
   */
  toRecord(layoutId?: string): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'distance',
      layoutId,
      style: serializeMeasurementStyle(this.style),
      geometry: {
        type: 'distance',
        start: { x: this.p1.x, y: this.p1.y },
        end: { x: this.p2.x, y: this.p2.y }
      }
    }
  }

  /**
   * Draws the distance line, endpoint dots, length badge, and commit extras.
   *
   * @param view - Active 2D view for transients and HTML overlays
   * @param db - Database used to format the length label
   * @returns World-draw result with dispose hooks for the transient line
   */
  protected subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult {
    const dist = calcDist(this.p1, this.p2)
    const color = this.style.color
    const line = new AcDbLine(this.p1, this.p2)
    line.color = color
    line.lineWeight = this.style.lineWeight
    view.addTransientEntity(line)

    const layoutId = this.resolveLayoutId(view)
    const mid = this.primaryPoint()!
    const group = this.createGroup(view).add(
      new AcTrHtmlDot({
        id: `${this.entityId}-dot1`,
        color,
        worldPosition: this.p1,
        layer: MEASUREMENT_LAYER
      }),
      new AcTrHtmlDot({
        id: `${this.entityId}-dot2`,
        color,
        worldPosition: this.p2,
        layer: MEASUREMENT_LAYER
      }),
      new AcTrHtmlBadge({
        id: `${this.entityId}-badge`,
        color,
        text: formatMeasurementLength(db, dist),
        worldPosition: mid,
        layer: MEASUREMENT_LAYER,
        fontSize: this.style.fontSize
      })
    )

    return {
      group,
      entityIds: [line.objectId],
      dispose: () => {
        view.removeTransientEntity(line.objectId)
      },
      extras: {
        entityIds: [line.objectId],
        entities: [line],
        style: this.style,
        value: { kind: 'length', value: dist },
        snapshot: this.toRecord(layoutId)
      }
    }
  }
}
