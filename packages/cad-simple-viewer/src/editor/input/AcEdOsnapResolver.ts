import {
  AcDbEntity,
  acdbHostApplicationServices,
  acdbMaskToOsnapModes,
  AcDbObjectId,
  AcDbOsnapMode,
  AcGeGeometryUtil,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../app'
import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdMarkerType } from './marker/AcEdMarker'

export type AcEdOsnapPoint = AcGePoint3dLike & {
  type: AcDbOsnapMode
}

export interface AcEdOsnapResolveOptions {
  /** WCS point used as the osnap pick and proximity reference. */
  cursorWcs: AcGePoint2dLike
  /** Previous point passed to entity osnap queries. */
  lastPoint?: AcGePoint3dLike
  /** Screen-space pick aperture radius in pixels. */
  hitRadiusPx?: number
}

const DEFAULT_HIT_RADIUS_PX = 20

/**
 * Resolves object snap points for a view during interactive input.
 */
export class AcEdOsnapResolver {
  private readonly _view: AcEdBaseView

  constructor(view: AcEdBaseView) {
    this._view = view
  }

  /**
   * Resolves the best osnap point near the cursor, matching command-input behavior.
   */
  resolve(options: AcEdOsnapResolveOptions): AcEdOsnapPoint | undefined {
    const hitRadiusPx = options.hitRadiusPx ?? DEFAULT_HIT_RADIUS_PX
    const lastPoint = options.lastPoint ?? options.cursorWcs
    const snapPoints = this.collectOsnapPoints(
      options.cursorWcs,
      lastPoint,
      hitRadiusPx
    )
    if (snapPoints.length === 0) return undefined

    const p1 = this._view.screenToWorld({ x: 0, y: 0 })
    const p2 = this._view.screenToWorld({ x: hitRadiusPx, y: 0 })
    const threshold = p2.x - p1.x

    let bestPriority = Number.MAX_VALUE
    let bestDist = Number.MAX_VALUE
    let bestIndex = -1

    for (let i = 0; i < snapPoints.length; i++) {
      const snap = snapPoints[i]
      const dx = options.cursorWcs.x - snap.x
      const dy = options.cursorWcs.y - snap.y
      const dist = Math.hypot(dx, dy)
      if (dist >= threshold) continue

      const priority = AcEdOsnapResolver.osnapModePriority(snap.type)
      if (
        priority < bestPriority ||
        (priority === bestPriority && dist < bestDist)
      ) {
        bestPriority = priority
        bestDist = dist
        bestIndex = i
      }
    }

    return bestIndex !== -1 ? snapPoints[bestIndex] : undefined
  }

  /**
   * Maps an osnap mode to the marker shape shown at the snap location.
   */
  static osnapModeToMarkerType(osnapMode: AcDbOsnapMode): AcEdMarkerType {
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        return 'rect'
      case AcDbOsnapMode.MidPoint:
        return 'triangle'
      case AcDbOsnapMode.Center:
        return 'circle'
      case AcDbOsnapMode.Quadrant:
        return 'diamond'
      case AcDbOsnapMode.Nearest:
        return 'x'
      default:
        return 'rect'
    }
  }

  private static osnapModePriority(mode: AcDbOsnapMode): number {
    switch (mode) {
      case AcDbOsnapMode.EndPoint:
      case AcDbOsnapMode.MidPoint:
      case AcDbOsnapMode.Center:
        return 0
      case AcDbOsnapMode.Quadrant:
        return 1
      case AcDbOsnapMode.Nearest:
        return 2
      default:
        return 1
    }
  }

  private collectOsnapPointsByMode(
    entity: AcDbEntity,
    osnapMode: AcDbOsnapMode,
    osnapPoints: AcEdOsnapPoint[],
    pickPoint: AcGePoint3dLike,
    lastPoint: AcGePoint3dLike,
    gsMark?: AcDbObjectId
  ) {
    const start = osnapPoints.length
    entity.subGetOsnapPoints(
      osnapMode,
      pickPoint,
      lastPoint,
      osnapPoints,
      gsMark
    )

    for (let i = start; i < osnapPoints.length; i++) {
      osnapPoints[i].type = osnapMode
    }
  }

  private collectOsnapPointsInAvailableModes(
    entity: AcDbEntity,
    osnapPoints: AcEdOsnapPoint[],
    pickPoint: AcGePoint3dLike,
    lastPoint: AcGePoint3dLike,
    gsMark?: AcDbObjectId
  ) {
    const modes = acdbMaskToOsnapModes(AcApSettingManager.instance.osnapModes)
    modes.forEach(mode =>
      this.collectOsnapPointsByMode(
        entity,
        mode,
        osnapPoints,
        pickPoint,
        lastPoint,
        gsMark
      )
    )
  }

  private collectOsnapPoints(
    cursorWcs: AcGePoint2dLike,
    lastPoint: AcGePoint2dLike,
    hitRadiusPx: number
  ): AcEdOsnapPoint[] {
    const results = this._view.pick(cursorWcs, hitRadiusPx)
    const db = acdbHostApplicationServices().workingDatabase
    const modelSpace = db.tables.blockTable.modelSpace
    const osnapPoints: AcEdOsnapPoint[] = []
    const pickPoint = AcGeGeometryUtil.point2dToPoint3d(cursorWcs)
    const last = AcGeGeometryUtil.point2dToPoint3d(lastPoint)

    results.forEach(item => {
      const entity = modelSpace.getIdAt(item.id)
      if (!entity) return

      if (item.children && item.children.length > 0) {
        item.children.forEach(child =>
          this.collectOsnapPointsInAvailableModes(
            entity,
            osnapPoints,
            pickPoint,
            last,
            child.id
          )
        )
      } else {
        this.collectOsnapPointsInAvailableModes(
          entity,
          osnapPoints,
          pickPoint,
          last
        )
      }
    })

    return osnapPoints
  }
}
