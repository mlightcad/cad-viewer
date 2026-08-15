import {
  AcDbCircle,
  AcDbPolyline,
  type AcDbObjectId,
  AcGePoint3d
} from '@mlightcad/data-model'
import { AcTrHtmlDot } from '@mlightcad/three-renderer'

import type { AcApOverlayWorldDrawResult } from '../../overlay'
import type { AcTrView2d } from '../../../view'
import { buildMarkupCloud, buildMarkupRect } from '../AcApMarkupShapeBuilder'
import type { AcApMarkupShapeOutline } from '../AcApMarkupShapeCallout'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'
import {
  bindMarkupCenterMove,
  publishAttachedCallout
} from './AcApMarkupEntityGrips'

/**
 * Cloud / rect / circle markup with optional attached callout.
 *
 * Builds a CAD transient shape, a center move grip, and optionally a
 * shape-attached leader + bubble via {@link publishAttachedCallout}.
 */
export class AcApMarkupShapeEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry is `cloud`, `rect`, or `circle`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Center grip for whole-shape move (delegates to the base implementation).
   *
   * @returns Geometry center as a single grip point.
   */
  override subGetGripPoints(): AcGePoint3d[] {
    return super.subGetGripPoints()
  }

  /**
   * Publish CAD shape, center dot, optional attached callout, and center move.
   *
   * @param view - Active 2D view.
   * @returns Built visuals with deferred center-move grip binding.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (
      geom.type !== 'cloud' &&
      geom.type !== 'rect' &&
      geom.type !== 'circle'
    ) {
      return this.emptyResult(this.createGroup())
    }
    const { color, lineWeight, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for CAD removal, viewChanged, and grips. */
    const cleanups: Array<() => void> = []
    /** CAD transient object ids for highlight / preview transforms. */
    const entityIds: AcDbObjectId[] = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    /** World position of the center move grip. */
    let centerPos: { x: number; y: number }
    /** Outline used to constrain an attached callout tip. */
    let outline: AcApMarkupShapeOutline

    if (geom.type === 'cloud') {
      const cloud = new AcDbPolyline()
      cloud.color = color
      cloud.lineWeight = lineWeight
      buildMarkupCloud(cloud, geom.corner1, geom.corner2, view)
      view.addTransientEntity(cloud)
      entityIds.push(cloud.objectId)
      cleanups.push(() => view.removeTransientEntity(cloud.objectId))
      centerPos = {
        x: (geom.corner1.x + geom.corner2.x) / 2,
        y: (geom.corner1.y + geom.corner2.y) / 2
      }
      outline = {
        kind: 'cloud',
        corner1: geom.corner1,
        corner2: geom.corner2
      }
    } else if (geom.type === 'rect') {
      const rect = new AcDbPolyline()
      rect.color = color
      rect.lineWeight = lineWeight
      buildMarkupRect(rect, geom.corner1, geom.corner2)
      view.addTransientEntity(rect)
      entityIds.push(rect.objectId)
      cleanups.push(() => view.removeTransientEntity(rect.objectId))
      centerPos = {
        x: (geom.corner1.x + geom.corner2.x) / 2,
        y: (geom.corner1.y + geom.corner2.y) / 2
      }
      outline = {
        kind: 'rect',
        corner1: geom.corner1,
        corner2: geom.corner2
      }
    } else {
      const circle = new AcDbCircle(
        { x: geom.center.x, y: geom.center.y, z: 0 },
        geom.radius
      )
      circle.color = color
      circle.lineWeight = lineWeight
      view.addTransientEntity(circle)
      entityIds.push(circle.objectId)
      cleanups.push(() => view.removeTransientEntity(circle.objectId))
      centerPos = { ...geom.center }
      outline = {
        kind: 'circle',
        center: geom.center,
        radius: geom.radius
      }
    }

    const centerDot = new AcTrHtmlDot({
      id: `${this.record.id}-dot`,
      color,
      worldPosition: centerPos,
      layer,
      layoutId
    })
    group.add(centerDot)

    const attached = geom.callout
      ? publishAttachedCallout({
          view,
          group,
          record: this.record,
          callout: geom.callout,
          style: this.style(),
          cleanups,
          outline
        })
      : undefined

    pendingGrips.push(() => {
      cleanups.push(
        bindMarkupCenterMove({
          view,
          recordId: this.record.id,
          centerEl: centerDot,
          entityIds,
          attached
        })
      )
    })

    return {
      group,
      entityIds,
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
      }
    }
  }
}
