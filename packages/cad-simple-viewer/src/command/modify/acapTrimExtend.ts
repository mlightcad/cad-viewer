import {
  AcDbCurve,
  AcDbEntity,
  AcDbIntersect,
  AcDbLine,
  AcGeBox2d,
  AcGePlane,
  AcGePoint3d,
  AcGePoint3dLike,
  DEFAULT_TOL
} from '@mlightcad/data-model'

/**
 * Geometry options shared by TRIM and EXTEND.
 */
export interface AcApTrimExtendGeomOptions {
  /**
   * AutoCAD `EDGEMODE = 1`: cutting / boundary edges are treated as if they
   * were extended to their natural (infinite line, full circle) geometry.
   */
  extendEdges?: boolean
  /**
   * Apparent-intersection plane (AutoCAD `PROJMODE` UCS / View). When omitted
   * the true 3D intersection is used (`PROJMODE = 0`).
   */
  projPlane?: AcGePlane
}

/**
 * Pieces a TRIM target would be cut into by its cutting edges.
 *
 * `pieces` is empty when no edge cuts the target. Pick-independent, so a
 * caller can cache it per target while the cursor moves.
 */
export interface AcApTrimPieces {
  target: AcDbCurve
  pieces: AcDbCurve[]
}

/**
 * Outcome of one TRIM pick.
 *
 * - `erase`: no edge cuts the target (Quick mode deletes it, like AutoCAD).
 * - `split`: `keep` replaces the target; `removed` is the trimmed-away part.
 * - `none`: the target cannot be trimmed (unsupported curve, Standard mode
 *   without an intersecting edge).
 */
export type AcApTrimResult =
  | { kind: 'none' }
  | { kind: 'erase' }
  | { kind: 'split'; keep: AcDbCurve[]; removed: AcDbCurve }

/**
 * Outcome of one EXTEND pick: the end that grows, the boundary point it
 * reaches, and a non-database preview copy already extended to that point.
 */
export type AcApExtendResult =
  | { kind: 'none' }
  | {
      kind: 'extend'
      atStart: boolean
      point: AcGePoint3d
      preview: AcDbCurve
    }

/**
 * Points closer than this are the same cut / boundary point. Slightly looser
 * than the raw float tolerance because intersections are refined numerically.
 */
const POINT_TOL = () => DEFAULT_TOL.equalPointTol * 10

/** Returns true when `entity` is a curve that TRIM / EXTEND can act on. */
export function acapIsTrimExtendCurve(
  entity: AcDbEntity | undefined
): entity is AcDbCurve {
  return entity instanceof AcDbCurve
}

/**
 * Maps a point to the closest point on `curve`, or on its natural extension
 * when `extend` is true. Falls back to the input point.
 */
function closestOn(
  curve: AcDbCurve,
  point: AcGePoint3dLike,
  extend = false
): AcGePoint3d {
  const closest = curve.getClosestPointTo(point, extend)
  return closest ?? new AcGePoint3d(point.x, point.y, point.z ?? 0)
}

/**
 * Computes the cut points of `target` against every edge.
 *
 * With a projection plane the reported points lie on that plane, so they are
 * mapped back onto the target before use.
 */
function collectCutParams(
  target: AcDbCurve,
  edges: readonly AcDbEntity[],
  options: AcApTrimExtendGeomOptions
): number[] {
  const intType = options.extendEdges
    ? AcDbIntersect.ExtendArg
    : AcDbIntersect.OnBothOperands
  const params: number[] = []
  const points: AcGePoint3d[] = []
  for (const edge of edges) {
    if (edge === target || isSameObject(edge, target)) continue
    let hits: AcGePoint3d[]
    try {
      hits = target.intersectWith(edge, intType, options.projPlane)
    } catch {
      continue
    }
    for (const hit of hits) {
      const onCurve = options.projPlane ? closestOn(target, hit) : hit
      if (points.some(p => p.distanceTo(onCurve) <= POINT_TOL())) continue
      const param = target.getParamAtPoint(onCurve)
      if (param == null || !Number.isFinite(param)) continue
      points.push(onCurve)
      params.push(param)
    }
  }
  return params.sort((a, b) => a - b)
}

function isSameObject(a: AcDbEntity, b: AcDbEntity) {
  return !!a.objectId && a.objectId === b.objectId
}

/**
 * Splits `target` at every point where a cutting edge crosses it.
 *
 * @param target - Curve to trim.
 * @param edges - Cutting edges (the target itself is ignored).
 * @param options - Edge extension / projection options.
 */
export function acapComputeTrimPieces(
  target: AcDbCurve,
  edges: readonly AcDbEntity[],
  options: AcApTrimExtendGeomOptions = {}
): AcApTrimPieces {
  const params = collectCutParams(target, edges, options)
  if (params.length === 0) return { target, pieces: [] }
  let pieces: AcDbCurve[] = []
  try {
    pieces = target.getSplitCurves(params)
  } catch {
    pieces = []
  }
  // A single piece means nothing was actually cut (e.g. a closed curve
  // touched once, or cuts that coincide with the curve's own ends).
  return { target, pieces: pieces.length > 1 ? pieces : [] }
}

/**
 * Picks the piece nearest to `pickPoint` as the part TRIM removes, and
 * returns what remains: one piece on each side of the removed span, like
 * AutoCAD (other cut points do not split the remainder).
 *
 * Using distance instead of the cut-interval index keeps this robust when
 * the data model drops degenerate pieces or wraps a closed curve's seam.
 *
 * @param trim - Result of {@link acapComputeTrimPieces}.
 * @param pickPoint - Point where the user picked the target (WCS).
 * @param eraseWhenUncut - Quick mode: delete objects no edge cuts.
 */
export function acapResolveTrim(
  trim: AcApTrimPieces,
  pickPoint: AcGePoint3dLike,
  eraseWhenUncut: boolean
): AcApTrimResult {
  if (trim.pieces.length === 0) {
    return eraseWhenUncut ? { kind: 'erase' } : { kind: 'none' }
  }
  const onTarget = closestOn(trim.target, pickPoint)
  let bestIndex = -1
  let bestDist = Infinity
  trim.pieces.forEach((piece, index) => {
    const dist = closestOn(piece, onTarget).distanceTo(onTarget)
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = index
    }
  })
  if (bestIndex < 0) return { kind: 'none' }
  const removed = trim.pieces[bestIndex]
  if (trim.pieces.length === 1) return { kind: 'erase' }
  // AutoCAD removes only the picked span: the rest of the object stays in
  // one piece per side even when other edges also cross it. So re-split the
  // target only at the two cut points that bound the removed span.
  const bounds = [
    removed.getPointAtParam(removed.startParam),
    removed.getPointAtParam(removed.endParam)
  ]
    .map(point => (point ? trim.target.getParamAtPoint(point) : undefined))
    .filter((param): param is number => param != null)
  let keep: AcDbCurve[] = []
  try {
    const parts = bounds.length > 0 ? trim.target.getSplitCurves(bounds) : []
    keep = parts.filter(part => !isSamePiece(part, removed))
  } catch {
    keep = []
  }
  if (keep.length === 0) {
    // Fall back to the fine split rather than failing the pick.
    keep = trim.pieces.filter((_, index) => index !== bestIndex)
  }
  return keep.length === 0
    ? { kind: 'erase' }
    : { kind: 'split', keep, removed }
}

/** True when two pieces run between the same end points (either way). */
function isSamePiece(a: AcDbCurve, b: AcDbCurve) {
  const a0 = a.getPointAtParam(a.startParam)
  const a1 = a.getPointAtParam(a.endParam)
  const b0 = b.getPointAtParam(b.startParam)
  const b1 = b.getPointAtParam(b.endParam)
  if (!a0 || !a1 || !b0 || !b1) return false
  const near = (p: AcGePoint3d, q: AcGePoint3d) =>
    p.distanceTo(q) <= POINT_TOL()
  const sameEnds =
    (near(a0, b0) && near(a1, b1)) || (near(a0, b1) && near(a1, b0))
  if (!sameEnds) return false
  // Closed curves cut twice give two pieces with the same ends; compare a
  // midpoint to tell them apart.
  const am = a.getPointAtParam((a.startParam + a.endParam) / 2)
  if (!am) return true
  return closestOn(b, am).distanceTo(am) <= POINT_TOL() * 100
}

/**
 * One-shot TRIM: {@link acapComputeTrimPieces} + {@link acapResolveTrim}.
 */
export function acapComputeTrim(
  target: AcDbCurve,
  pickPoint: AcGePoint3dLike,
  edges: readonly AcDbEntity[],
  options: AcApTrimExtendGeomOptions & { eraseWhenUncut?: boolean } = {}
): AcApTrimResult {
  return acapResolveTrim(
    acapComputeTrimPieces(target, edges, options),
    pickPoint,
    !!options.eraseWhenUncut
  )
}

/** Curve length from start to end, or `undefined` for unbounded curves. */
function curveLength(curve: AcDbCurve): number | undefined {
  const end = curve.getDistAtParam(curve.endParam)
  const start = curve.getDistAtParam(curve.startParam)
  if (end == null || start == null) return undefined
  const length = end - start
  return Number.isFinite(length) ? length : undefined
}

/**
 * Returns whether the start (true) or end (false) of `curve` is nearer to
 * `pickPoint` measured along the curve, which is how AutoCAD chooses the end
 * EXTEND grows. `undefined` when the curve cannot be measured.
 */
export function acapExtendEndNearPick(
  curve: AcDbCurve,
  pickPoint: AcGePoint3dLike
): boolean | undefined {
  const length = curveLength(curve)
  if (length == null) return undefined
  const param = curve.getParamAtPoint(closestOn(curve, pickPoint))
  if (param == null) return undefined
  const fromStart =
    (curve.getDistAtParam(param) ?? 0) -
    (curve.getDistAtParam(curve.startParam) ?? 0)
  return fromStart <= length - fromStart
}

/**
 * Finds the nearest boundary that `curve` reaches when its start (`atStart`)
 * or end grows along its natural extension.
 *
 * Each candidate is validated by extending a copy with
 * {@link AcDbCurve.extendToPoint}; that keeps the "is this point beyond that
 * end?" logic in the data model for every curve type. The candidate that adds
 * the least length wins.
 *
 * @param curve - Curve to extend (not modified).
 * @param atStart - Grow the start instead of the end.
 * @param edges - Boundary edges (the curve itself is ignored).
 * @param options - Edge extension / projection options.
 */
export function acapComputeExtendAtEnd(
  curve: AcDbCurve,
  atStart: boolean,
  edges: readonly AcDbEntity[],
  options: AcApTrimExtendGeomOptions = {}
): AcApExtendResult {
  if (curve.closed) return { kind: 'none' }
  const baseLength = curveLength(curve)
  if (baseLength == null) return { kind: 'none' }
  const intType = options.extendEdges
    ? AcDbIntersect.ExtendBoth
    : AcDbIntersect.ExtendThis
  let best: { added: number; point: AcGePoint3d; preview: AcDbCurve } | null =
    null
  const tried: AcGePoint3d[] = []
  for (const edge of edges) {
    if (edge === curve || isSameObject(edge, curve)) continue
    let hits: AcGePoint3d[]
    try {
      hits = curve.intersectWith(edge, intType, options.projPlane)
    } catch {
      continue
    }
    for (const hit of hits) {
      const point = options.projPlane ? closestOn(curve, hit, true) : hit
      if (tried.some(p => p.distanceTo(point) <= POINT_TOL())) continue
      tried.push(point)
      const preview = curve.clone()
      if (!preview.extendToPoint(atStart, point)) continue
      const length = curveLength(preview)
      if (length == null) continue
      const added = length - baseLength
      if (added <= POINT_TOL()) continue
      if (!best || added < best.added) best = { added, point, preview }
    }
  }
  if (!best) return { kind: 'none' }
  return { kind: 'extend', atStart, point: best.point, preview: best.preview }
}

/**
 * One-shot EXTEND: grows the end nearest to `pickPoint` to the nearest
 * boundary edge.
 */
export function acapComputeExtend(
  curve: AcDbCurve,
  pickPoint: AcGePoint3dLike,
  edges: readonly AcDbEntity[],
  options: AcApTrimExtendGeomOptions = {}
): AcApExtendResult {
  const atStart = acapExtendEndNearPick(curve, pickPoint)
  if (atStart == null) return { kind: 'none' }
  return acapComputeExtendAtEnd(curve, atStart, edges, options)
}

/**
 * Points where a fence polyline crosses `curve`, in fence order. Each one is
 * used as a pick point, matching AutoCAD's Fence option.
 */
export function acapFencePickPoints(
  curve: AcDbCurve,
  fence: readonly AcGePoint3dLike[]
): AcGePoint3d[] {
  const points: AcGePoint3d[] = []
  for (let i = 0; i + 1 < fence.length; i++) {
    const segment = new AcDbLine(fence[i], fence[i + 1])
    let hits: AcGePoint3d[] = []
    try {
      hits = curve.intersectWith(segment)
    } catch {
      hits = []
    }
    const origin = new AcGePoint3d(fence[i].x, fence[i].y, fence[i].z ?? 0)
    hits
      .sort((a, b) => a.distanceTo(origin) - b.distanceTo(origin))
      .forEach(hit => {
        if (!points.some(p => p.distanceTo(hit) <= POINT_TOL())) {
          points.push(hit)
        }
      })
  }
  return points
}

/**
 * A point of `curve` inside a crossing box, used as its pick point for the
 * Crossing option: the curve point nearest the box center when that lies in
 * the box, otherwise where the curve crosses the box border.
 */
export function acapCrossingPickPoint(
  curve: AcDbCurve,
  box: AcGeBox2d
): AcGePoint3d | undefined {
  const inBox = (p: AcGePoint3dLike) =>
    p.x >= box.min.x - POINT_TOL() &&
    p.x <= box.max.x + POINT_TOL() &&
    p.y >= box.min.y - POINT_TOL() &&
    p.y <= box.max.y + POINT_TOL()
  const center = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: 0
  }
  const nearest = curve.getClosestPointTo(center)
  if (nearest && inBox(nearest)) return nearest
  const corners = [
    { x: box.min.x, y: box.min.y, z: 0 },
    { x: box.max.x, y: box.min.y, z: 0 },
    { x: box.max.x, y: box.max.y, z: 0 },
    { x: box.min.x, y: box.max.y, z: 0 },
    { x: box.min.x, y: box.min.y, z: 0 }
  ]
  const border = acapFencePickPoints(curve, corners)
  return border[0]
}
