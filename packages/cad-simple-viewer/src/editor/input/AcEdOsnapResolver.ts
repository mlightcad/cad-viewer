import {
  AcDbEntity,
  acdbHasOsnapMode,
  acdbHostApplicationServices,
  acdbMaskToOsnapModes,
  AcDbObjectId,
  AcDbOsnapMode,
  AcGeGeometryUtil,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../app/AcApSettingManager'
import { AcEdBaseView } from '../view/AcEdBaseView'
import {
  type AcEdOsnapCenterMark,
  canonicalGsMark,
  centerMarksCoincide,
  collectCenterMarksFromEntity,
  mergeAcquiredCenterMarks
} from './AcEdOsnapCenterMarks'
import { AcEdMarkerType } from './marker/AcEdMarker'

export type { AcEdOsnapCenterMark } from './AcEdOsnapCenterMarks'

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

/** Max nearby entities considered per intersection query (matches HTML viewer). */
const MAX_INTERSECTION_SOURCES = 48

/**
 * Resolves object snap points for a view during interactive input.
 */
export class AcEdOsnapResolver {
  private readonly _view: AcEdBaseView
  private _acquiredCenters: AcEdOsnapCenterMark[] = []

  constructor(view: AcEdBaseView) {
    this._view = view
  }

  /**
   * Center ticks acquired by hovering circular geometry. Shown as plus marks
   * for the rest of the current point prompt; moving the cursor onto a tick
   * snaps to that center.
   */
  get acquiredCenterMarks(): readonly AcEdOsnapCenterMark[] {
    return this._acquiredCenters
  }

  /** Clears acquired center ticks. Call when an input session ends. */
  clearAcquiredCenters() {
    this._acquiredCenters = []
  }

  /**
   * Center ticks to draw as plus marks. Hides a tick that is already the
   * active Center snap so the circle AutoSnap marker replaces it.
   */
  static displayCenterMarks(
    marks: readonly AcEdOsnapCenterMark[],
    snap?: AcEdOsnapPoint
  ): AcEdOsnapCenterMark[] {
    if (!snap || snap.type !== AcDbOsnapMode.Center) {
      return [...marks]
    }
    return marks.filter(mark => !centerMarksCoincide(mark, snap))
  }

  /**
   * Resolves the best osnap point near the cursor, matching command-input behavior.
   */
  resolve(options: AcEdOsnapResolveOptions): AcEdOsnapPoint | undefined {
    const hitRadiusPx = options.hitRadiusPx ?? DEFAULT_HIT_RADIUS_PX
    const lastPoint = options.lastPoint ?? options.cursorWcs
    const p1 = this._view.screenToWorld({ x: 0, y: 0 })
    const p2 = this._view.screenToWorld({ x: hitRadiusPx, y: 0 })
    const threshold = p2.x - p1.x
    const snapPoints = this.collectOsnapPoints(
      options.cursorWcs,
      lastPoint,
      hitRadiusPx
    )

    for (const mark of this._acquiredCenters) {
      snapPoints.push({
        x: mark.x,
        y: mark.y,
        z: mark.z,
        type: AcDbOsnapMode.Center
      })
    }

    if (snapPoints.length === 0) return undefined

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
      case AcDbOsnapMode.Intersection:
        return 'intersection'
      default:
        return 'rect'
    }
  }

  private static osnapModePriority(mode: AcDbOsnapMode): number {
    switch (mode) {
      case AcDbOsnapMode.EndPoint:
      case AcDbOsnapMode.MidPoint:
      case AcDbOsnapMode.Center:
      case AcDbOsnapMode.Intersection:
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
    modes.forEach(mode => {
      // Intersection requires pairwise entity tests; see collectIntersectionOsnapPoints.
      if (mode === AcDbOsnapMode.Intersection) return
      this.collectOsnapPointsByMode(
        entity,
        mode,
        osnapPoints,
        pickPoint,
        lastPoint,
        gsMark
      )
    })
  }

  private collectIntersectionOsnapPoints(
    entities: AcDbEntity[],
    osnapPoints: AcEdOsnapPoint[]
  ) {
    const sources = entities.slice(0, MAX_INTERSECTION_SOURCES)
    for (let i = 0; i < sources.length; i++) {
      for (let j = i; j < sources.length; j++) {
        const points = sources[i].intersectWith(sources[j])
        for (const point of points) {
          osnapPoints.push({
            x: point.x,
            y: point.y,
            z: point.z,
            type: AcDbOsnapMode.Intersection
          })
        }
      }
    }
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

    const uniqueEntities: AcDbEntity[] = []
    const seenIds = new Set<AcDbObjectId>()

    results.forEach(item => {
      const entity = modelSpace.getIdAt(item.id)
      if (!entity) return

      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        uniqueEntities.push(entity)
      }

      if (item.children && item.children.length > 0) {
        item.children.forEach(child =>
          this.collectOsnapPointsInAvailableModes(
            entity,
            osnapPoints,
            pickPoint,
            last,
            canonicalGsMark(child.id)
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

    if (
      acdbHasOsnapMode(
        AcApSettingManager.instance.osnapModes,
        AcDbOsnapMode.Intersection
      )
    ) {
      this.collectIntersectionOsnapPoints(uniqueEntities, osnapPoints)
    }

    this.updateAcquiredCenters(results, modelSpace, pickPoint)

    return osnapPoints
  }

  private updateAcquiredCenters(
    results: Array<{
      id: AcDbObjectId
      children?: Array<{ id: AcDbObjectId }>
    }>,
    modelSpace: { getIdAt: (id: AcDbObjectId) => AcDbEntity | undefined },
    pickPoint: AcGePoint3dLike
  ) {
    if (
      !acdbHasOsnapMode(
        AcApSettingManager.instance.osnapModes,
        AcDbOsnapMode.Center
      )
    ) {
      this._acquiredCenters = []
      return
    }

    const hovered: AcEdOsnapCenterMark[] = []
    results.forEach(item => {
      const entity = modelSpace.getIdAt(item.id)
      if (!entity) return
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
          hovered.push(
            ...collectCenterMarksFromEntity(
              entity,
              pickPoint,
              canonicalGsMark(child.id)
            )
          )
        })
      } else {
        hovered.push(...collectCenterMarksFromEntity(entity, pickPoint))
      }
    })

    this._acquiredCenters = mergeAcquiredCenterMarks(
      this._acquiredCenters,
      hovered
    )
  }
}
