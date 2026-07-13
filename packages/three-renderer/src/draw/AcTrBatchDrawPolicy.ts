import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcTrDrawMode } from './AcTrDrawMode'

/**
 * World-coordinate magnitude above which {@link defaultBatchDrawPolicy} chooses
 * the unbatched draw path.
 *
 * The check uses the maximum absolute value among `x`, `y`, and `z` on the
 * representative point passed to the policy (see {@link isLargeWorldCoordinatePoint}).
 * Values at or above this threshold are treated as large enough that merging geometry
 * in {@link AcTrBatchedGroup} risks float precision loss or incorrect placement.
 */
export const RTE_REBASE_THRESHOLD = 1e6

/**
 * Coordinate context supplied by an {@link AcTrEntity} subclass when it delegates
 * a batch/unbatch decision to {@link AcTrBatchDrawPolicy}.
 *
 * Most entities provide either a single insertion {@link AcTrBatchDrawContext.position}
 * (MTEXT, SHAPE, POINT) or a geometry {@link AcTrBatchDrawContext.anchor} derived from
 * vertex data (lines, polygons). Policies typically evaluate `anchor ?? position`.
 *
 * @see AcTrEntity.resolveDrawMode
 * @see defaultBatchDrawPolicy
 */
export interface AcTrBatchDrawContext {
  /**
   * Primary world-space insertion or reference point for the entity.
   *
   * Used when the entity has one canonical location (for example MTEXT/SHAPE
   * insertion, or a POINT entity coordinate).
   */
  position?: AcGePoint3dLike

  /**
   * Representative world-space point for geometry that spans multiple vertices.
   *
   * Usually the axis-aligned bounding-box center of the entity geometry,
   * computed by {@link resolveAnchorFromBox}. Used by line-like entities and
   * hatches that do not have a single insertion point.
   */
  anchor?: AcGePoint3dLike
}

/**
 * Pluggable strategy that maps coordinate context to a {@link AcTrDrawMode}.
 *
 * Inject an implementation on {@link AcTrRenderContext.batchDrawPolicy} (via
 * {@link AcTrRenderer.batchDrawPolicy}) to customize when entities that delegate
 * when entities that delegate to the policy should merge in
 * {@link AcTrBatchedGroup} versus stay on the unbatched path.
 *
 * Entity types that must never batch (images, pattern hatches, …) should not rely
 * on this interface; they should return `'unbatch'` directly from
 * {@link AcTrEntity.resolveDrawMode}.
 *
 * @see defaultBatchDrawPolicy
 */
export interface AcTrBatchDrawPolicy {
  /**
   * Resolves the draw mode for one entity based on its coordinate context.
   *
   * @param context - Insertion point and/or geometry anchor supplied by the
   *   calling entity's {@link AcTrEntity.resolveDrawMode} implementation.
   * @returns `'batch'` to flatten and merge drawables, or `'unbatch'` to keep
   *   the entity's prepared hierarchy and mark drawables with `noBatch`.
   */
  resolveDrawMode(context: AcTrBatchDrawContext): AcTrDrawMode
}

/**
 * Returns whether a world-space point is large enough to prefer the unbatched path.
 *
 * A point is considered large when the maximum absolute component among `x`, `y`,
 * and `z` is greater than or equal to {@link RTE_REBASE_THRESHOLD}. Missing or
 * `undefined` input is treated as not large (returns `false`).
 *
 * @param position - World-space point to evaluate, typically an insertion point
 *   or geometry anchor from {@link AcTrBatchDrawContext}.
 * @returns `true` when the point exceeds the large-coordinate threshold.
 */
export function isLargeWorldCoordinatePoint(
  position?: AcGePoint3dLike
): boolean {
  if (position == null) {
    return false
  }

  return (
    Math.max(
      Math.abs(position.x),
      Math.abs(position.y),
      Math.abs(position.z ?? 0)
    ) >= RTE_REBASE_THRESHOLD
  )
}

/**
 * Returns whether a world-space offset is too far from an established batch
 * origin to keep float32 vertex precision when rebasing into shared buffers.
 *
 * @param origin - World-space origin already assigned to a batch container.
 * @param worldOffset - World-space translation for the geometry being appended.
 * @param threshold - Maximum allowed per-axis delta; defaults to
 *   {@link RTE_REBASE_THRESHOLD}.
 */
/**
 * Maximum per-axis absolute delta between a batch origin and a world offset.
 */
export function batchOriginOffsetDistance(
  origin: THREE.Vector3,
  worldOffset: THREE.Vector3
): number {
  return Math.max(
    Math.abs(worldOffset.x - origin.x),
    Math.abs(worldOffset.y - origin.y),
    Math.abs(worldOffset.z - origin.z)
  )
}

export function exceedsBatchOriginOffset(
  origin: THREE.Vector3,
  worldOffset: THREE.Vector3,
  threshold = RTE_REBASE_THRESHOLD
): boolean {
  return batchOriginOffsetDistance(origin, worldOffset) >= threshold
}

/**
 * Returns whether geometry with the given world offset can be merged into a
 * batch that already has (or has not yet established) the supplied origin.
 *
 * Empty batches (`origin == null`) always accept the next geometry so it can
 * define the origin from its bounding-box center.
 */
export function canMergeIntoBatchOrigin(
  origin: THREE.Vector3 | undefined,
  worldOffset: THREE.Vector3
): boolean {
  return origin == null || !exceedsBatchOriginOffset(origin, worldOffset)
}

/**
 * Computes a representative anchor point from a list of world-space vertices.
 *
 * The anchor is the center of the axis-aligned bounding box that contains all
 * input points. Empty input yields `undefined`, which causes coordinate-based
 * policies to fall back to `'batch'`.
 *
 * @param points - Vertex or control-point samples in drawing/world coordinates.
 * @returns Bounding-box center, or `undefined` when `points` is empty.
 */
export function resolveAnchorFromPoints(
  points: AcGePoint3dLike[]
): AcGePoint3dLike | undefined {
  if (points.length === 0) {
    return undefined
  }

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    minZ = Math.min(minZ, point.z ?? 0)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
    maxZ = Math.max(maxZ, point.z ?? 0)
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  }
}

/**
 * Computes a representative anchor point from an axis-aligned bounding box.
 *
 * Empty boxes yield `undefined`, which causes coordinate-based policies to
 * fall back to `'batch'`.
 *
 * @param box - Entity WCS bounding box.
 * @returns Bounding-box center, or `undefined` when `box` is empty.
 */
export function resolveAnchorFromBox(
  box: THREE.Box3
): AcGePoint3dLike | undefined {
  if (box.isEmpty()) {
    return undefined
  }

  const center = box.getCenter(_resolveAnchorCenter)
  return {
    x: center.x,
    y: center.y,
    z: center.z
  }
}

/**
 * Batch-draw policy that always returns `'batch'`.
 *
 * Use when every policy-delegating entity should merge in
 * {@link AcTrBatchedGroup}, regardless of world coordinates. Entity types
 * that must never batch (images, pattern hatches, …) still return `'unbatch'`
 * from their own {@link AcTrEntity.resolveDrawMode}.
 */
export const alwaysBatchDrawPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode() {
    return 'batch'
  }
}

/**
 * Batch-draw policy that always returns `'unbatch'`.
 *
 * Use when every policy-delegating entity should stay on the unbatched draw
 * path. Entity types that must never batch behave the same; this policy only
 * affects coordinate-based delegates that would otherwise batch.
 */
export const alwaysUnbatchDrawPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode() {
    return 'unbatch'
  }
}

/**
 * Default batch-draw policy used by {@link AcTrEntity} when none is injected.
 *
 * Evaluates `context.anchor ?? context.position` with
 * {@link isLargeWorldCoordinatePoint}: large coordinates return `'unbatch'`,
 * otherwise `'batch'`. Entity-specific rules (always-unbatch images, pattern
 * hatches, …) are handled in each subclass's {@link AcTrEntity.resolveDrawMode},
 * not here.
 */
export const defaultBatchDrawPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode(context) {
    const anchor = context.anchor ?? context.position
    return isLargeWorldCoordinatePoint(anchor) ? 'unbatch' : 'batch'
  }
}

const _resolveAnchorCenter = /*@__PURE__*/ new THREE.Vector3()
