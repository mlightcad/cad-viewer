import { toWcsCoord } from './AcExBatchBuffers'
import {
  type AcExClusterBox,
  unionDominantCluster
} from './AcExExtentCluster'
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
 * receive a realistic {@link AcExCameraZoomUniform} instead of zooming to the
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
 * Unions two XY extents, ignoring `null` operands.
 */
export function unionExtents(
  a: AcExExtents | null | undefined,
  b: AcExExtents | null | undefined
): AcExExtents | null {
  if (!a) return b ?? null
  if (!b) return a
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  }
}

/**
 * Unions paper-space rectangles of exported viewports. Used so an otherwise
 * empty paper layout still frames its viewport frames instead of `0,0–1,1`.
 */
export function computeViewportPaperExtents(
  viewports: ReadonlyArray<{ paper: AcExExtents }> | undefined
): AcExExtents | null {
  if (!viewports || viewports.length === 0) return null
  let result: AcExExtents | null = null
  for (const viewport of viewports) {
    result = unionExtents(result, viewport.paper)
  }
  return result
}

/**
 * Unions batch geometry with viewport paper frames for one layout.
 *
 * Returns `null` when the layout has neither drawable batches nor viewports.
 */
export function computeLayoutViewExtents(
  layout: Pick<AcExLayoutSnapshot, 'lineBatches' | 'meshBatches' | 'viewports'>
): AcExExtents | null {
  return unionExtents(
    computeLayoutExtents(layout.lineBatches, layout.meshBatches),
    computeViewportPaperExtents(layout.viewports)
  )
}

/**
 * Resolves zoom-to-fit extents for one layout snapshot.
 *
 * Prefers live batch geometry unioned with viewport paper frames, then
 * persisted {@link AcExSnapshot.meta.viewExtents}, and only then a unit box.
 */
export function resolveLayoutViewExtents(
  layout: Pick<AcExLayoutSnapshot, 'lineBatches' | 'meshBatches' | 'viewports'>,
  fallbackExtents?: AcExExtents
): AcExExtents {
  return (
    computeLayoutViewExtents(layout) ??
    fallbackExtents ?? {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    }
  )
}

/**
 * One batch AABB captured before CPU buffers are released, so intelligent fit
 * can still peel outliers after {@link releaseSnapshotBatchBuffers}.
 */
export interface AcExBatchExtentEntry {
  /** Layer name for visibility filtering. */
  layer: string
  /** World XY AABB of the batch at capture time. */
  extents: AcExExtents
}

/**
 * Collects per-batch AABBs from still-resident layout geometry.
 *
 * Call before CPU typed arrays are cleared. Entries survive buffer release and
 * drive {@link computeIntelligentExtentsFromBatchEntries}.
 */
export function collectLayoutBatchExtentEntries(
  layout: Pick<AcExLayoutSnapshot, 'lineBatches' | 'meshBatches'>
): AcExBatchExtentEntry[] {
  const entries: AcExBatchExtentEntry[] = []
  const consider = (batch: AcExLineBatch | AcExMeshBatch) => {
    if (batch.positions.length < 3) return
    const bucket = createEmptyExtents()
    expandExtentsFromBatch(bucket, batch)
    const extents = toExtents(bucket)
    if (!extents) return
    entries.push({ layer: batch.layer, extents })
  }
  for (const batch of layout.lineBatches) {
    consider(batch)
  }
  for (const batch of layout.meshBatches) {
    consider(batch)
  }
  return entries
}

/**
 * Dominant-cluster fit from cached batch AABBs (and optional viewport frames).
 *
 * Outlier-scale batches are omitted entirely when vertex sampling is unavailable
 * (post CPU-release), so a single corrupt ARC AABB cannot dominate the fit
 * even when fewer than 8 boxes remain.
 */
export function computeIntelligentExtentsFromBatchEntries(
  entries: ReadonlyArray<AcExBatchExtentEntry>,
  options?: {
    isLayerVisible?: (layerName: string) => boolean
    viewports?: ReadonlyArray<{ paper: AcExExtents }>
    /**
     * When set, oversized batches are expanded into vertex samples instead of
     * being dropped. Only useful while CPU positions are still resident.
     */
    sampleFromLayout?: Pick<
      AcExLayoutSnapshot,
      'lineBatches' | 'meshBatches'
    >
  }
): AcExExtents | null {
  const isLayerVisible = options?.isLayerVisible
  const visible = entries.filter(
    entry => !isLayerVisible || isLayerVisible(entry.layer)
  )
  if (visible.length === 0 && !(options?.viewports?.length)) {
    return null
  }

  const sizes = visible.map(entry =>
    Math.max(
      entry.extents.maxX - entry.extents.minX,
      entry.extents.maxY - entry.extents.minY,
      1e-9
    )
  )
  for (const viewport of options?.viewports ?? []) {
    sizes.push(
      Math.max(
        viewport.paper.maxX - viewport.paper.minX,
        viewport.paper.maxY - viewport.paper.minY,
        1e-9
      )
    )
  }
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const hugeSpan = Math.max(medianSize * 50, 1e10)

  const boxes: AcExClusterBox[] = []
  const canSample = options?.sampleFromLayout != null
  for (const entry of visible) {
    const span = Math.max(
      entry.extents.maxX - entry.extents.minX,
      entry.extents.maxY - entry.extents.minY
    )
    if (span >= hugeSpan) {
      if (canSample) {
        // Prefer live vertex sampling when buffers are still resident; the
        // matching batch is found by layer + identical AABB.
        const layout = options!.sampleFromLayout!
        const matched =
          findBatchWithExtents(layout.lineBatches, entry) ??
          findBatchWithExtents(layout.meshBatches, entry)
        if (matched && matched.positions.length >= 3) {
          sampleBatchVertexBoxes(matched, boxes)
          continue
        }
      }
      // Drop the poisoned batch AABB so it cannot union into the fit.
      continue
    }
    boxes.push(entry.extents)
  }
  for (const viewport of options?.viewports ?? []) {
    boxes.push(viewport.paper)
  }
  const peeled = peelFarCenterBoxes(boxes)
  return unionDominantCluster(peeled.length > 0 ? peeled : boxes)
}

/**
 * Drops boxes whose center sits outlier-scale away from the median center.
 *
 * Catches tiny corrupt entities (near-zero AABB at 1e75) that the span-based
 * huge-batch filter misses, including when fewer than 8 boxes remain.
 */
function peelFarCenterBoxes(boxes: AcExClusterBox[]): AcExClusterBox[] {
  if (boxes.length < 2) {
    return boxes
  }
  const centers = boxes.map(box => ({
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    box
  }))
  const xs = centers.map(c => c.x).sort((a, b) => a - b)
  const ys = centers.map(c => c.y).sort((a, b) => a - b)
  const medX = xs[Math.floor(xs.length / 2)]!
  const medY = ys[Math.floor(ys.length / 2)]!
  const sizes = boxes.map(box =>
    Math.max(box.maxX - box.minX, box.maxY - box.minY, 1e-9)
  )
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const limit = Math.max(medianSize * 50, 1e10)
  const kept = centers.filter(
    c => Math.hypot(c.x - medX, c.y - medY) <= limit
  )
  return kept.length > 0 ? kept.map(c => c.box) : boxes
}

function findBatchWithExtents(
  batches: ReadonlyArray<AcExLineBatch | AcExMeshBatch>,
  entry: AcExBatchExtentEntry
): AcExLineBatch | AcExMeshBatch | undefined {
  for (const batch of batches) {
    if (batch.layer !== entry.layer) continue
    if (batch.positions.length < 3) continue
    const bucket = createEmptyExtents()
    expandExtentsFromBatch(bucket, batch)
    const extents = toExtents(bucket)
    if (
      extents &&
      extents.minX === entry.extents.minX &&
      extents.minY === entry.extents.minY &&
      extents.maxX === entry.extents.maxX &&
      extents.maxY === entry.extents.maxY
    ) {
      return batch
    }
  }
  return undefined
}

/**
 * Computes zoom-to-fit extents using the dominant geometry cluster.
 *
 * Each visible batch contributes one AABB. Batches whose span is outlier-scale
 * relative to the median are expanded into sampled vertex points so real
 * geometry co-batched with a far corrupt entity is kept. Far outliers are then
 * peeled with the same majority-gap heuristic used by the PDF exporter.
 *
 * @param layout - Layout batches and optional viewport frames.
 * @param isLayerVisible - Optional visibility predicate; omitted layers count.
 * @returns Clustered extents, or the naive layout union when clustering does
 *   not shrink the set, or `null` when empty.
 */
export function computeIntelligentLayoutExtents(
  layout: Pick<AcExLayoutSnapshot, 'lineBatches' | 'meshBatches' | 'viewports'>,
  isLayerVisible?: (layerName: string) => boolean
): AcExExtents | null {
  const entries = collectLayoutBatchExtentEntries(layout)
  return (
    computeIntelligentExtentsFromBatchEntries(entries, {
      isLayerVisible,
      viewports: layout.viewports,
      sampleFromLayout: layout
    }) ?? computeLayoutViewExtents(layout)
  )
}

/** Caps how many vertex samples are taken from one oversized batch. */
const SMART_EXTENT_MAX_SAMPLES = 256

function sampleBatchVertexBoxes(
  batch: AcExLineBatch | AcExMeshBatch,
  out: AcExClusterBox[]
): void {
  const positions = batch.positions
  const offset = batch.offset
  const vertexCount = Math.floor(positions.length / 3)
  if (vertexCount <= 0) return
  const step = Math.max(1, Math.ceil(vertexCount / SMART_EXTENT_MAX_SAMPLES))
  for (let i = 0; i < vertexCount; i += step) {
    const base = i * 3
    const x = toWcsCoord(positions[base]!, offset[0])
    const y = toWcsCoord(positions[base + 1]!, offset[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    out.push({ minX: x, minY: y, maxX: x, maxY: y })
  }
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
