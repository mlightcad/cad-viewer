import { toWcsCoord } from './AcExBatchBuffers'
import type {
  AcExExtents,
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch
} from './AcExSnapshotTypes'

/**
 * Mutable 2D extents accumulator used while scanning batch geometry.
 * Tracks whether any vertex has been seen via {@link AcExMutableExtents.valid}.
 */
export interface AcExMutableExtents {
  /** Running minimum X in world coordinates. */
  minX: number
  /** Running minimum Y in world coordinates. */
  minY: number
  /** Running maximum X in world coordinates. */
  maxX: number
  /** Running maximum Y in world coordinates. */
  maxY: number
  /** `false` until the first vertex is incorporated. */
  valid: boolean
}

/**
 * Creates an empty extents bucket with {@link AcExMutableExtents.valid} set to `false`.
 */
export function createEmptyExtents(): AcExMutableExtents {
  return {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    valid: false
  }
}

/**
 * Expands mutable extents from a flat XYZ position buffer, applying a world offset per vertex.
 *
 * @param extents - Extents bucket to update in place.
 * @param positions - Flat `[x, y, z, …]` buffer in local space.
 * @param offset - World translation added to each vertex before comparing XY.
 */
export function expandExtentsFromPositions(
  extents: AcExMutableExtents,
  positions: Float32Array,
  offset: [number, number, number]
): void {
  if (positions.length < 3) return
  const ox = offset[0]
  const oy = offset[1]
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = toWcsCoord(positions[i]!, ox)
    const y = toWcsCoord(positions[i + 1]!, oy)
    if (!extents.valid) {
      extents.minX = extents.maxX = x
      extents.minY = extents.maxY = y
      extents.valid = true
    } else {
      if (x < extents.minX) extents.minX = x
      if (x > extents.maxX) extents.maxX = x
      if (y < extents.minY) extents.minY = y
      if (y > extents.maxY) extents.maxY = y
    }
  }
}

/**
 * Incorporates all vertices from a line or mesh batch into mutable extents.
 *
 * @param extents - Extents bucket to update in place.
 * @param batch - Exported batch whose {@link AcExLineBatch.positions} and
 *   {@link AcExLineBatch.offset} are scanned.
 */
export function expandExtentsFromBatch(
  extents: AcExMutableExtents,
  batch: AcExLineBatch | AcExMeshBatch
): void {
  expandExtentsFromPositions(extents, batch.positions, batch.offset)
}

/**
 * Converts a mutable extents bucket to an immutable {@link AcExExtents}, or `null` if empty.
 *
 * @param extents - Accumulator that may still be invalid.
 * @returns Frozen extents, or `null` when no geometry was added.
 */
export function toExtents(extents: AcExMutableExtents): AcExExtents | null {
  if (!extents.valid) return null
  return {
    minX: extents.minX,
    minY: extents.minY,
    maxX: extents.maxX,
    maxY: extents.maxY
  }
}

/**
 * Unions XY extents from every line and mesh batch in one layout.
 *
 * Used for initial zoom-to-fit in the offline viewer so hatch pattern shaders
 * receive a realistic {@link acexCameraZoomUniform} instead of zooming to the
 * often much larger database `EXTMIN`/`EXTMAX` header.
 */
export function computeLayoutExtents(
  lineBatches: AcExLineBatch[],
  meshBatches: AcExMeshBatch[]
): AcExExtents | null {
  const bucket = createEmptyExtents()
  for (const batch of lineBatches) {
    expandExtentsFromBatch(bucket, batch)
  }
  for (const batch of meshBatches) {
    expandExtentsFromBatch(bucket, batch)
  }
  return toExtents(bucket)
}

/**
 * Resolves zoom-to-fit extents for one layout snapshot.
 *
 * Prefers live batch geometry, then persisted {@link AcExSnapshot.meta.viewExtents},
 * and only then the database header extents as a last resort.
 */
export function resolveLayoutViewExtents(
  layout: Pick<AcExLayoutSnapshot, 'lineBatches' | 'meshBatches'>,
  fallbackExtents?: AcExExtents
): AcExExtents {
  return (
    computeLayoutExtents(layout.lineBatches, layout.meshBatches) ??
    fallbackExtents ?? {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    }
  )
}

/**
 * Builds per-layer XY extents from all line and mesh batches in a layout.
 * Used by the layer panel “zoom to layer” action.
 *
 * @param lineBatches - Line batches for the active layout.
 * @param meshBatches - Mesh batches for the active layout.
 * @returns Map from layer name to extents, or `null` when the layer has no geometry.
 */
export function computeLayerExtentsMap(
  lineBatches: AcExLineBatch[],
  meshBatches: AcExMeshBatch[]
): Map<string, AcExExtents | null> {
  const buckets = new Map<string, AcExMutableExtents>()

  const ensure = (layer: string): AcExMutableExtents => {
    let bucket = buckets.get(layer)
    if (!bucket) {
      bucket = createEmptyExtents()
      buckets.set(layer, bucket)
    }
    return bucket
  }

  for (const batch of lineBatches) {
    expandExtentsFromBatch(ensure(batch.layer), batch)
  }
  for (const batch of meshBatches) {
    expandExtentsFromBatch(ensure(batch.layer), batch)
  }

  const result = new Map<string, AcExExtents | null>()
  for (const [layer, bucket] of buckets) {
    result.set(layer, toExtents(bucket))
  }
  return result
}
