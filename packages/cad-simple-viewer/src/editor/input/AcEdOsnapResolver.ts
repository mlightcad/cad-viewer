import {
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEntity,
  acdbHasOsnapMode,
  acdbHostApplicationServices,
  AcDbLine,
  acdbMaskToOsnapModes,
  AcDbObjectId,
  AcDbOsnapMode,
  AcGeBox3d,
  AcGeGeometryUtil,
  AcGeMatrix3d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../app/AcApSettingManager'
import { AcEdBaseView } from '../view/AcEdBaseView'
import {
  AcEdSpatialQueryResultItemEx,
  isEffectiveSpatialQueryHit
} from '../view/AcEdSpatialQueryResult'
import {
  type AcEdOsnapCenterMark,
  canonicalGsMark,
  centerMarksCoincide,
  collectCenterMarksFromEntity,
  mergeAcquiredCenterMarks,
  resolveBlockSubEntity
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

/** Hard cap on pairwise `intersectWith` calls per resolve. */
const MAX_INTERSECTION_PAIR_TESTS = 48

/** Wall-clock budget for pairwise intersection math per resolve. */
const INTERSECTION_TIME_BUDGET_MS = 8

/**
 * Skip leaf entities whose curve primitive count exceeds this. Fat polylines /
 * splines must not expand into INT snap on every touch move.
 */
const MAX_PRIMITIVES_PER_SOURCE = 32

type IntersectionSource = {
  key: string
  box: AcGeBox3d
  entity: AcDbEntity
  /** Maps entity-local geometry into WCS. Identity for model-space entities. */
  transform: AcGeMatrix3d
}

function boxesOverlapXY(a: AcGeBox3d, b: AcGeBox3d): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y
  )
}

function boxFromSpatialItem(item: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): AcGeBox3d {
  return new AcGeBox3d(
    { x: item.minX, y: item.minY, z: -Infinity },
    { x: item.maxX, y: item.maxY, z: Infinity }
  )
}

function isIdentityTransform(matrix: AcGeMatrix3d): boolean {
  return matrix.equals(AcGeMatrix3d.IDENTITY)
}

/**
 * Builds a disposable entity whose geometry is `entity` transformed by
 * `matrix`, without mutating database-resident entities.
 *
 * Returns the original entity when `matrix` is identity. Returns `undefined`
 * when the entity type cannot be safely copied for cross-transform INT.
 */
function transformedEntityCopy(
  entity: AcDbEntity,
  matrix: AcGeMatrix3d
): AcDbEntity | undefined {
  if (isIdentityTransform(matrix)) return entity

  if (entity instanceof AcDbLine) {
    return new AcDbLine(
      new AcGePoint3d(entity.startPoint).applyMatrix4(matrix),
      new AcGePoint3d(entity.endPoint).applyMatrix4(matrix)
    )
  }

  if (entity instanceof AcDbCircle) {
    const scale = matrix.getMaxScaleOnAxis()
    if (!(scale > 0) || !Number.isFinite(scale)) return undefined
    return new AcDbCircle(
      new AcGePoint3d(entity.center).applyMatrix4(matrix),
      entity.radius * scale,
      entity.normal
    )
  }

  if (entity instanceof AcDbArc) {
    const scale = matrix.getMaxScaleOnAxis()
    if (!(scale > 0) || !Number.isFinite(scale)) return undefined
    return new AcDbArc(
      new AcGePoint3d(entity.center).applyMatrix4(matrix),
      entity.radius * scale,
      entity.startAngle,
      entity.endAngle,
      entity.normal
    )
  }

  return undefined
}

function isLightIntersectionEntity(entity: AcDbEntity): boolean {
  const count = entity.subGetIntersectCurves().length
  return count > 0 && count <= MAX_PRIMITIVES_PER_SOURCE
}

/**
 * Maps local intersect points through `frame` into WCS.
 */
function mapIntersectPointsToWcs(
  local: AcGePoint3d[],
  frame: AcGeMatrix3d
): AcGePoint3d[] {
  if (isIdentityTransform(frame)) return local
  return local.map(point =>
    new AcGePoint3d(point.x, point.y, point.z).applyMatrix4(frame)
  )
}

/**
 * Intersects two osnap sources without mutating database entities.
 * Same-frame pairs use local `intersectWith` then map to WCS; cross-frame
 * pairs express one entity in the other's local space via a disposable copy.
 * Tries B→A first, then A→B, so order does not drop polyline/spline partners
 * when the other side is a transformable Line/Circle/Arc.
 */
function intersectSources(
  a: IntersectionSource,
  b: IntersectionSource
): AcGePoint3d[] {
  if (a.transform.equals(b.transform)) {
    return mapIntersectPointsToWcs(a.entity.intersectWith(b.entity), a.transform)
  }

  const bToA = new AcGeMatrix3d().multiplyMatrices(
    a.transform.clone().invert(),
    b.transform
  )
  const bInA = transformedEntityCopy(b.entity, bToA)
  if (bInA) {
    return mapIntersectPointsToWcs(a.entity.intersectWith(bInA), a.transform)
  }

  const aToB = new AcGeMatrix3d().multiplyMatrices(
    b.transform.clone().invert(),
    a.transform
  )
  const aInB = transformedEntityCopy(a.entity, aToB)
  if (!aInB) return []

  return mapIntersectPointsToWcs(b.entity.intersectWith(aInB), b.transform)
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
      return marks as AcEdOsnapCenterMark[]
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
    const threshold = Math.abs(p2.x - p1.x)
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
    pickResults: AcEdSpatialQueryResultItemEx[],
    modelSpace: { getIdAt: (id: AcDbObjectId) => AcDbEntity | undefined },
    osnapPoints: AcEdOsnapPoint[],
    cursorWcs: AcGePoint2dLike,
    threshold: number
  ) {
    const sources: IntersectionSource[] = []
    const seenKeys = new Set<string>()

    const tryAdd = (source: IntersectionSource) => {
      if (sources.length >= MAX_INTERSECTION_SOURCES) return
      if (seenKeys.has(source.key)) return
      if (source.box.isEmpty()) return
      if (!isLightIntersectionEntity(source.entity)) return
      seenKeys.add(source.key)
      sources.push(source)
    }

    for (const item of pickResults) {
      if (sources.length >= MAX_INTERSECTION_SOURCES) break
      if (!isEffectiveSpatialQueryHit(item)) continue
      const entity = modelSpace.getIdAt(item.id)
      if (!entity) continue

      if (item.children && item.children.length > 0) {
        // INSERT (and other hierarchical hits): only the aperture-hit children.
        // Never expand the whole block definition into INT snap.
        for (const child of item.children) {
          if (sources.length >= MAX_INTERSECTION_SOURCES) break
          const gsMark = canonicalGsMark(child.id)
          const key = `${item.id}:${gsMark}`
          if (entity instanceof AcDbBlockReference) {
            const found = resolveBlockSubEntity(entity, gsMark)
            if (!found) continue
            tryAdd({
              key,
              box: boxFromSpatialItem(child),
              entity: found.entity,
              transform: found.transform
            })
          } else {
            tryAdd({
              key,
              box: boxFromSpatialItem(child),
              entity,
              transform: new AcGeMatrix3d()
            })
          }
        }
        continue
      }

      if (entity instanceof AcDbBlockReference) {
        // Coarse root hit without children — skip. Whole-block intersectWith
        // would expand every nested curve and freeze dense blocks on mobile.
        continue
      }

      tryAdd({
        key: item.id,
        box: entity.geometricExtents,
        entity,
        transform: new AcGeMatrix3d()
      })
    }

    if (sources.length < 2) return

    const threshSq = threshold * threshold
    const started = performance.now()
    let pairTests = 0

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        if (pairTests >= MAX_INTERSECTION_PAIR_TESTS) return
        if (performance.now() - started > INTERSECTION_TIME_BUDGET_MS) return
        if (!boxesOverlapXY(sources[i].box, sources[j].box)) continue

        pairTests++
        const points = intersectSources(sources[i], sources[j])
        for (const point of points) {
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
      this.collectIntersectionOsnapPoints(
        results,
        modelSpace,
        osnapPoints,
        cursorWcs,
        threshold
      )
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
