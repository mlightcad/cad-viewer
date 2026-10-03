import {
  AcDbBlockReference,
  AcDbDatabase,
  acdbHasOsnapMode,
  acdbMaskToOsnapModes,
  AcDbOsnapMode,
  AcGeGeometryUtil,
  acgeIntersectCurves,
  AcGeIntersectPrimitive,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../app/AcApSettingManager'
import { AcEdBaseView } from '../view/AcEdBaseView'
import {
  acEdDrawingIntersectCurves,
  acEdDrawingOsnapPoints,
  acEdDrawingPointVisible
} from '../view/AcEdDrawingGeometry'
import type { AcEdDrawingPickResult } from '../view/AcEdDrawingPickResult'
import {
  type AcEdOsnapCenterMark,
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

/**
 * Max nearby geometry sources considered per intersection query.
 * Prefer pick-hit subentities (INSERT children) over whole block refs.
 */
const MAX_INTERSECTION_SOURCES = 16

/** Hard cap on native pairwise primitive intersection calls per resolve. */
const MAX_INTERSECTION_PAIR_TESTS = 48

/** Wall-clock budget for pairwise intersection math per resolve. */
const INTERSECTION_TIME_BUDGET_MS = 8

type IntersectionSource = {
  candidate: AcEdDrawingPickResult
  curves: AcGeIntersectPrimitive[]
}

function boxesOverlapXY(
  a: AcEdDrawingPickResult,
  b: AcEdDrawingPickResult
): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  )
}

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
    this.pruneAcquiredCenters()
    return this._acquiredCenters
  }

  private pruneAcquiredCenters(): void {
    const current = this._acquiredCenters.filter(
      mark =>
        !mark.source ||
        (mark.source.isCurrent() && acEdDrawingPointVisible(mark.source, mark))
    )
    if (current.length !== this._acquiredCenters.length)
      this._acquiredCenters = current
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
      return marks as AcEdOsnapCenterMark[]
    }
    return marks.filter(mark => !centerMarksCoincide(mark, snap))
  }

  /**
   * Resolves the best osnap point near the cursor, matching command-input behavior.
   */
  resolve(options: AcEdOsnapResolveOptions): AcEdOsnapPoint | undefined {
    this.pruneAcquiredCenters()
    const hitRadiusPx = options.hitRadiusPx ?? DEFAULT_HIT_RADIUS_PX
    const lastPoint = options.lastPoint ?? options.cursorWcs
    const p1 = this._view.screenToWorld({ x: 0, y: 0 })
    const p2 = this._view.screenToWorld({ x: hitRadiusPx, y: 0 })
    const threshold = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const snapPoints = this.collectOsnapPoints(
      options.cursorWcs,
      lastPoint,
      hitRadiusPx,
      threshold
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

  private collectIntersectionOsnapPoints(
    candidates: readonly AcEdDrawingPickResult[],
    osnapPoints: AcEdOsnapPoint[],
    cursorWcs: AcGePoint2dLike,
    threshold: number
  ) {
    const sources: IntersectionSource[] = []
    const seen = new Map<AcDbDatabase, Set<string>>()
    for (const candidate of candidates) {
      if (sources.length >= MAX_INTERSECTION_SOURCES) break
      const key = JSON.stringify([
        candidate.referenceId,
        candidate.viewportId,
        candidate.rootId,
        candidate.path,
        candidate.instancePath
      ])
      let databaseKeys = seen.get(candidate.database)
      if (!databaseKeys) {
        databaseKeys = new Set()
        seen.set(candidate.database, databaseKeys)
      }
      if (databaseKeys.has(key)) continue
      databaseKeys.add(key)
      const curves = acEdDrawingIntersectCurves(candidate)
      if (curves.length > 0) sources.push({ candidate, curves })
    }
    const threshSq = threshold * threshold
    const started = performance.now()
    let pairTests = 0
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        if (pairTests >= MAX_INTERSECTION_PAIR_TESTS) return
        if (performance.now() - started > INTERSECTION_TIME_BUDGET_MS) return
        if (!boxesOverlapXY(sources[i].candidate, sources[j].candidate))
          continue
        pairTests++
        for (const point of acgeIntersectCurves(
          sources[i].curves,
          sources[j].curves
        )) {
          if (![point.x, point.y, point.z].every(Number.isFinite)) continue
          if (
            !acEdDrawingPointVisible(sources[i].candidate, point) ||
            !acEdDrawingPointVisible(sources[j].candidate, point)
          )
            continue
          const dx = point.x - cursorWcs.x
          const dy = point.y - cursorWcs.y
          if (dx * dx + dy * dy > threshSq) continue
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
    hitRadiusPx: number,
    threshold: number
  ): AcEdOsnapPoint[] {
    const candidates = this._view
      .pickDrawingEntities(cursorWcs, hitRadiusPx)
      .filter(candidate => candidate.isCurrent())
    const osnapPoints: AcEdOsnapPoint[] = []
    const pickPoint = AcGeGeometryUtil.point2dToPoint3d(cursorWcs)
    const last = AcGeGeometryUtil.point2dToPoint3d(lastPoint)
    const modes = acdbMaskToOsnapModes(AcApSettingManager.instance.osnapModes)
    for (const candidate of candidates) {
      for (const mode of modes) {
        if (mode === AcDbOsnapMode.Intersection) continue
        for (const point of acEdDrawingOsnapPoints(
          candidate,
          mode,
          pickPoint,
          last
        )) {
          if (![point.x, point.y, point.z].every(Number.isFinite)) continue
          if (!acEdDrawingPointVisible(candidate, point)) continue
          osnapPoints.push({ x: point.x, y: point.y, z: point.z, type: mode })
        }
      }
    }
    if (modes.includes(AcDbOsnapMode.Intersection)) {
      this.collectIntersectionOsnapPoints(
        candidates,
        osnapPoints,
        cursorWcs,
        threshold
      )
    }
    this.updateAcquiredCenters(candidates, pickPoint)
    return osnapPoints
  }

  private updateAcquiredCenters(
    candidates: readonly AcEdDrawingPickResult[],
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
    for (const candidate of candidates) {
      if (candidate.entity instanceof AcDbBlockReference) continue
      if (
        !candidate.transform.elements.every(Number.isFinite) ||
        candidate.transform.determinant() === 0
      )
        continue
      const localPick = new AcGePoint3d(pickPoint).applyMatrix4(
        candidate.transform.clone().invert()
      )
      for (const mark of collectCenterMarksFromEntity(
        candidate.entity,
        localPick
      )) {
        const point = new AcGePoint3d(mark).applyMatrix4(candidate.transform)
        if (![point.x, point.y, point.z].every(Number.isFinite)) continue
        if (!acEdDrawingPointVisible(candidate, point)) continue
        hovered.push({ x: point.x, y: point.y, z: point.z, source: candidate })
      }
    }
    this._acquiredCenters = mergeAcquiredCenterMarks(
      this._acquiredCenters,
      hovered
    )
  }
}
