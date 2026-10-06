import type { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcTrHtmlBadge, AcTrHtmlGrip } from '@mlightcad/three-renderer'

import {
  type AcApMeasurementStyle,
  formatMeasurementValue
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
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../AcApMeasurementTypes'
import {
  AcApMeasureEntity,
  type AcApMeasureEntityOptions,
  type AcApMeasureWorldDrawResult
} from './AcApMeasureEntity'
import { selectMeasurementGroup } from './AcApMeasureEntityGrips'

/**
 * Point / coordinate measurement overlay entity.
 *
 * Renders an HTML dot at the measured location and a badge showing formatted
 * X/Y coordinates. The endpoint grip moves the point and updates the label.
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
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
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
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'point'` and position geometry
   */
  toRecord(layoutId?: string, view?: AcTrView2d): AcApMeasurementRecord {
    return {
      id: this.entityId,
      type: 'point',
      layoutId,
      style: this.serializeStyle(view),
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
    const live = { x: this.point.x, y: this.point.y }
    const layoutId = this.resolveLayoutId(view)
    let value = {
      kind: 'coordinate' as const,
      x: live.x,
      y: live.y
    }
    const color = this.style.color
    const dot = new AcTrHtmlGrip({
      id: `${this.entityId}-dot`,
      color,
      worldPosition: live,
      layer: MEASUREMENT_LAYER
    })
    const badge = new AcTrHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementValue(db, value),
      worldPosition: live,
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize,
      transform: 'translate(-50%, calc(-50% - 16px))'
    })
    this.seedOverlaySizes(view, [dot, badge])
    const group = this.createGroup(view).add(dot, badge)

    const cleanups: Array<() => void> = []
    const pendingGrips: Array<() => void> = []
    let dragStart = { ...live }

    const refreshLive = () => {
      value = { kind: 'coordinate', x: live.x, y: live.y }
      badge.setText(formatMeasurementValue(db, value))
      acapPlaceOverlayHtml(view, badge, live)
      view.isHtmlDirty = true
    }

    pendingGrips.push(() => {
      cleanups.push(
        acapBindOverlayPointerDrag({
          view,
          el: dot.element,
          onDragStart: () => {
            selectMeasurementGroup(view, this.entityId)
            dragStart = { ...live }
          },
          onMove: point => {
            live.x = point.x
            live.y = point.y
            acapPlaceOverlayHtml(view, dot, live)
            refreshLive()
          },
          onCommit: () => {
            if (
              Math.hypot(live.x - dragStart.x, live.y - dragStart.y) < 1e-9
            ) {
              refreshLive()
              return
            }
            const snap = getMeasurementSnapshot(this.entityId)
            const geometry: AcApMeasurementRecord['geometry'] = {
              type: 'point',
              position: { x: live.x, y: live.y }
            }
            const record: AcApMeasurementRecord = snap
              ? { ...snap, geometry }
              : {
                  id: this.entityId,
                  type: 'point',
                  layoutId,
                  style: this.serializeStyle(view),
                  geometry
                }
            runMeasurementEdit(view, 'Move Point', () => {
              republishMeasurement(view, db, record)
            })
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
      },
      extras: {
        style: this.style,
        value,
        snapshot: this.toRecord(layoutId, view)
      }
    }
  }
}
