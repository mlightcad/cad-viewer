import type * as THREE from 'three'

import { acexHtmlToWcsCoord } from './AcExHtmlBatchBuffers.js'
import type {
  AcExHtmlLineBatch,
  AcExHtmlMeshBatch
} from './AcExHtmlSnapshotTypes.js'

/**
 * Half-depth of the default orthographic depth band. Matches
 * `AcTrCamera.DEFAULT_DEPTH_HALF`: the camera sits at `+DEFAULT_DEPTH_HALF`
 * looking down −Z and sees WCS Z in `[-DEFAULT_DEPTH_HALF, +DEFAULT_DEPTH_HALF)`.
 */
export const ACEX_HTML_DEFAULT_DEPTH_HALF = 500

/** Near-plane distance of 2D view cameras. Matches `AcTrCamera.NEAR`. */
export const ACEX_HTML_CAMERA_NEAR = 0.1

/**
 * Clearance kept between fitted geometry and the near/far planes, so
 * draw-order Z offsets stacked on top of the geometry are not clipped.
 * Matches `AcTrCamera` depth margin.
 */
const ACEX_HTML_DEPTH_MARGIN = 100

/**
 * Absolute WCS Z beyond this is treated as corrupt for depth fitting.
 * Matches `AcTrCamera.MAX_ABS_DEPTH_Z`.
 */
export const ACEX_HTML_MAX_ABS_DEPTH_Z = 1e8

function acexHtmlIsUsableDepthZ(z: number): boolean {
  return Number.isFinite(z) && Math.abs(z) <= ACEX_HTML_MAX_ABS_DEPTH_Z
}

/**
 * Grow-only WCS Z extent accumulator for exported HTML batches.
 *
 * Used by the offline viewer to fit orthographic near/far planes so elevated
 * geometry (survey contour polylines, elevation text) is not clipped.
 */
export interface AcExHtmlMutableDepthRange {
  /** Running minimum WCS Z. */
  min: number
  /** Running maximum WCS Z. */
  max: number
}

/**
 * Creates an empty depth-range bucket (`min > max` until the first vertex).
 */
export function acexHtmlCreateEmptyDepthRange(): AcExHtmlMutableDepthRange {
  return { min: Infinity, max: -Infinity }
}

/**
 * Whether a depth-range bucket has received any finite Z.
 */
export function acexHtmlDepthRangeIsEmpty(
  range: AcExHtmlMutableDepthRange
): boolean {
  return range.min > range.max
}

/**
 * Expands a depth-range bucket from a flat XYZ position buffer plus world offset.
 *
 * @param range - Accumulator to update in place.
 * @param positions - Flat `[x, y, z, …]` buffer in local (rebased) space.
 * @param offset - World translation added to each local Z.
 */
export function acexHtmlExpandDepthRangeFromPositions(
  range: AcExHtmlMutableDepthRange,
  positions: Float32Array,
  offset: [number, number, number]
): void {
  if (positions.length < 3) return
  const oz = offset[2]
  for (let i = 2; i < positions.length; i += 3) {
    const z = acexHtmlToWcsCoord(positions[i]!, oz)
    if (!acexHtmlIsUsableDepthZ(z)) continue
    if (z < range.min) range.min = z
    if (z > range.max) range.max = z
  }
}

/**
 * Incorporates all vertices from a line or mesh batch into a depth-range bucket.
 */
export function acexHtmlExpandDepthRangeFromBatch(
  range: AcExHtmlMutableDepthRange,
  batch: AcExHtmlLineBatch | AcExHtmlMeshBatch
): void {
  acexHtmlExpandDepthRangeFromPositions(range, batch.positions, batch.offset)
}

/**
 * Grows `range` from every vertex in the given line and mesh batches.
 */
export function acexHtmlExpandDepthRangeFromBatches(
  range: AcExHtmlMutableDepthRange,
  lineBatches: readonly AcExHtmlLineBatch[],
  meshBatches: readonly AcExHtmlMeshBatch[]
): void {
  for (const batch of lineBatches) {
    acexHtmlExpandDepthRangeFromBatch(range, batch)
  }
  for (const batch of meshBatches) {
    acexHtmlExpandDepthRangeFromBatch(range, batch)
  }
}

/**
 * Moves an orthographic camera along Z and sets its near/far planes so WCS Z
 * in `[minZ, maxZ]` lies inside the clip volume.
 *
 * The band only grows beyond the default ±{@link ACEX_HTML_DEFAULT_DEPTH_HALF},
 * so drawings near Z=0 keep full depth precision for draw-order stacking.
 * Either bound non-finite or absurd (see {@link ACEX_HTML_MAX_ABS_DEPTH_Z})
 * falls the whole call back to the default band — mixing a usable min with a
 * corrupt max (or vice versa) would leave elevated geometry clipped.
 *
 * Mirrors `AcTrCamera.fitDepthRange` for the offline HTML viewer (which must
 * not import `@mlightcad/three-renderer`).
 *
 * @param camera - THREE orthographic camera to update.
 * @param minZ - Lowest WCS Z of the geometry to show.
 * @param maxZ - Highest WCS Z of the geometry to show.
 */
export function acexHtmlFitOrthographicDepthRange(
  camera: THREE.OrthographicCamera,
  minZ: number,
  maxZ: number
): void {
  const half = ACEX_HTML_DEFAULT_DEPTH_HALF
  const margin = ACEX_HTML_DEPTH_MARGIN
  const usable = acexHtmlIsUsableDepthZ(minZ) && acexHtmlIsUsableDepthZ(maxZ)
  const low = usable ? Math.min(minZ - margin, -half) : -half
  const high = usable ? Math.max(maxZ + margin, half) : half
  const far = high - low
  if (camera.position.z === high && camera.far === far) return

  camera.position.z = high
  camera.near = ACEX_HTML_CAMERA_NEAR
  camera.far = far
  camera.updateProjectionMatrix()
}
