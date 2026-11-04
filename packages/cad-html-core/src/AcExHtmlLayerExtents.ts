import { acexHtmlToWcsCoord } from './AcExHtmlBatchBuffers'
import {
  type AcExHtmlClusterBox,
  acexHtmlUnionDominantCluster
} from './AcExHtmlExtentCluster'
import type {
  AcExHtmlExtents,
  AcExHtmlLayoutSnapshot,
  AcExHtmlLineBatch,
  AcExHtmlMeshBatch,
  AcExHtmlSnapshot
} from './AcExHtmlSnapshotTypes'

/**
 * Mutable 2D extents accumulator used while scanning batch geometry.
 * Tracks whether any vertex has been seen via {@link AcExHtmlMutableExtents.valid}.
 */
export interface AcExHtmlMutableExtents {
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
 * Creates an empty extents bucket with {@link AcExHtmlMutableExtents.valid} set to `false`.
 */
export function acexHtmlCreateEmptyExtents(): AcExHtmlMutableExtents {
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
export function acexHtmlExpandExtentsFromPositions(
  extents: AcExHtmlMutableExtents,
  positions: Float32Array,
  offset: [number, number, number]
): void {
  if (positions.length < 3) return
  const ox = offset[0]
  const oy = offset[1]
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = acexHtmlToWcsCoord(positions[i]!, ox)
    const y = acexHtmlToWcsCoord(positions[i + 1]!, oy)
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
 * @param batch - Exported batch whose {@link AcExHtmlLineBatch.positions} and
 *   {@link AcExHtmlLineBatch.offset} are scanned.
 */
export function acexHtmlExpandExtentsFromBatch(
  extents: AcExHtmlMutableExtents,
  batch: AcExHtmlLineBatch | AcExHtmlMeshBatch
): void {
  acexHtmlExpandExtentsFromPositions(extents, batch.positions, batch.offset)
}

/**
 * Converts a mutable extents bucket to an immutable {@link AcExHtmlExtents}, or `null` if empty.
 *
 * @param extents - Accumulator that may still be invalid.
 * @returns Frozen extents, or `null` when no geometry was added.
 */
export function acexHtmlToExtents(extents: AcExHtmlMutableExtents): AcExHtmlExtents | null {
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
 * receive a realistic {@link AcExHtmlCameraZoomUniform} instead of zooming to the
 * often much larger database `EXTMIN`/`EXTMAX` header.
 */
export function acexHtmlComputeLayoutExtents(
  lineBatches: AcExHtmlLineBatch[],
  meshBatches: AcExHtmlMeshBatch[]
): AcExHtmlExtents | null {
  const bucket = acexHtmlCreateEmptyExtents()
  for (const batch of lineBatches) {
    acexHtmlExpandExtentsFromBatch(bucket, batch)
  }
  for (const batch of meshBatches) {
    acexHtmlExpandExtentsFromBatch(bucket, batch)
  }
  return acexHtmlToExtents(bucket)
}

/**
 * Unions two XY extents, ignoring `null` operands.
 */
export function acexHtmlUnionExtents(
  a: AcExHtmlExtents | null | undefined,
  b: AcExHtmlExtents | null | undefined
): AcExHtmlExtents | null {
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
export function acexHtmlComputeViewportPaperExtents(
  viewports: ReadonlyArray<{ paper: AcExHtmlExtents }> | undefined
): AcExHtmlExtents | null {
  if (!viewports || viewports.length === 0) return null
  let result: AcExHtmlExtents | null = null
  for (const viewport of viewports) {
    result = acexHtmlUnionExtents(result, viewport.paper)
  }
  return result
}

/**
 * Unions batch geometry with viewport paper frames for one layout.
 *
 * Returns `null` when the layout has neither drawable batches nor viewports.
 */
export function acexHtmlComputeLayoutViewExtents(
  layout: Pick<AcExHtmlLayoutSnapshot, 'lineBatches' | 'meshBatches' | 'viewports'>
): AcExHtmlExtents | null {
  return acexHtmlUnionExtents(
    acexHtmlComputeLayoutExtents(layout.lineBatches, layout.meshBatches),
    acexHtmlComputeViewportPaperExtents(layout.viewports)
  )
}

/**
 * Resolves zoom-to-fit extents for one layout snapshot.
 *
 * Order: the export-time {@link AcExHtmlLayoutSnapshot.fitExtents}, then live batch
 * geometry unioned with viewport paper frames, then the caller's fallback and
 * finally a unit box.
 *
 * The export-time box has to win over painted geometry in one important case:
 * a progressive package paints viewport frames before its geometry chunks
 * arrive, so an early fit would frame a smaller box than the completed layout.
 * Keeping the export-time box stable also makes the initial framing identical
 * to the toolbar “Extents” result.
 */
export function acexHtmlResolveLayoutViewExtents(
  layout: Pick<
    AcExHtmlLayoutSnapshot,
    'lineBatches' | 'meshBatches' | 'viewports' | 'fitExtents'
  >,
  fallbackExtents?: AcExHtmlExtents
): AcExHtmlExtents {
  return (
    layout.fitExtents ??
    acexHtmlComputeLayoutViewExtents(layout) ??
    fallbackExtents ?? {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    }
  )
}

/**
 * Last-resort box for a layout that has neither geometry nor an export-time
 * {@link AcExHtmlLayoutSnapshot.fitExtents} (an empty paper tab, or a snapshot
 * written before that field existed).
 *
 * {@link AcExHtmlSnapshot.meta.viewExtents} is geometry-derived but describes only
 * {@link AcExHtmlSnapshot.activeLayoutBtrId}; handing it to every layout would
 * frame a paper-space sheet when fitting model space (and vice versa). For
 * that one layout it still beats {@link AcExHtmlLayoutSnapshot.savedView}, which is
 * the printable area / saved VPORT rather than the drawn content.
 */
export function acexHtmlResolveLayoutFallbackExtents(
  layout: Pick<AcExHtmlLayoutSnapshot, 'btrId' | 'savedView'>,
  snapshot: Pick<AcExHtmlSnapshot, 'activeLayoutBtrId' | 'meta'>
): AcExHtmlExtents {
  if (layout.btrId === snapshot.activeLayoutBtrId) {
    return (
      snapshot.meta.viewExtents ?? layout.savedView ?? snapshot.meta.extents
    )
  }
  return layout.savedView ?? snapshot.meta.extents
}

/**
 * One batch AABB captured before CPU buffers are released, so intelligent fit
 * can still peel outliers after {@link releaseSnapshotBatchBuffers}.
 */
export interface AcExHtmlBatchExtentEntry {
  /** Layer name for visibility filtering. */
  layer: string
  /** World XY AABB of the batch at capture time. */
  extents: AcExHtmlExtents
}

/**
 * Collects per-batch AABBs from still-resident layout geometry.
 *
 * Call before CPU typed arrays are cleared. Entries survive buffer release and
 * drive {@link acexHtmlComputeIntelligentExtentsFromBatchEntries}.
 */
export function acexHtmlCollectLayoutBatchExtentEntries(
  layout: Pick<AcExHtmlLayoutSnapshot, 'lineBatches' | 'meshBatches'>
): AcExHtmlBatchExtentEntry[] {
  const entries: AcExHtmlBatchExtentEntry[] = []
  const consider = (batch: AcExHtmlLineBatch | AcExHtmlMeshBatch) => {
    if (batch.positions.length < 3) return
    const bucket = acexHtmlCreateEmptyExtents()
    acexHtmlExpandExtentsFromBatch(bucket, batch)
    const extents = acexHtmlToExtents(bucket)
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
export function acexHtmlComputeIntelligentExtentsFromBatchEntries(
  entries: ReadonlyArray<AcExHtmlBatchExtentEntry>,
  options?: {
    isLayerVisible?: (layerName: string) => boolean
    viewports?: ReadonlyArray<{ paper: AcExHtmlExtents }>
    /**
     * When set, oversized batches are expanded into vertex samples instead of
     * being dropped. Only useful while CPU positions are still resident.
     */
    sampleFromLayout?: Pick<
      AcExHtmlLayoutSnapshot,
      'lineBatches' | 'meshBatches'
    >
  }
): AcExHtmlExtents | null {
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

  const boxes: AcExHtmlClusterBox[] = []
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
  return acexHtmlUnionDominantCluster(peeled.length > 0 ? peeled : boxes)
}

/**
 * Drops boxes whose center sits outlier-scale away from the median center.
 *
 * Catches tiny corrupt entities (near-zero AABB at 1e75) that the span-based
 * huge-batch filter misses, including when fewer than 8 boxes remain.
 */
function peelFarCenterBoxes(boxes: AcExHtmlClusterBox[]): AcExHtmlClusterBox[] {
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
  batches: ReadonlyArray<AcExHtmlLineBatch | AcExHtmlMeshBatch>,
  entry: AcExHtmlBatchExtentEntry
): AcExHtmlLineBatch | AcExHtmlMeshBatch | undefined {
  for (const batch of batches) {
    if (batch.layer !== entry.layer) continue
    if (batch.positions.length < 3) continue
    const bucket = acexHtmlCreateEmptyExtents()
    acexHtmlExpandExtentsFromBatch(bucket, batch)
    const extents = acexHtmlToExtents(bucket)
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
export function acexHtmlComputeIntelligentLayoutExtents(
  layout: Pick<AcExHtmlLayoutSnapshot, 'lineBatches' | 'meshBatches' | 'viewports'>,
  isLayerVisible?: (layerName: string) => boolean
): AcExHtmlExtents | null {
  const entries = acexHtmlCollectLayoutBatchExtentEntries(layout)
  return (
    acexHtmlComputeIntelligentExtentsFromBatchEntries(entries, {
      isLayerVisible,
      viewports: layout.viewports,
      sampleFromLayout: layout
    }) ?? acexHtmlComputeLayoutViewExtents(layout)
  )
}

/** Caps how many vertex samples are taken from one oversized batch. */
const SMART_EXTENT_MAX_SAMPLES = 256

function sampleBatchVertexBoxes(
  batch: AcExHtmlLineBatch | AcExHtmlMeshBatch,
  out: AcExHtmlClusterBox[]
): void {
  const positions = batch.positions
  const offset = batch.offset
  const vertexCount = Math.floor(positions.length / 3)
  if (vertexCount <= 0) return
  const step = Math.max(1, Math.ceil(vertexCount / SMART_EXTENT_MAX_SAMPLES))
  for (let i = 0; i < vertexCount; i += step) {
    const base = i * 3
    const x = acexHtmlToWcsCoord(positions[base]!, offset[0])
    const y = acexHtmlToWcsCoord(positions[base + 1]!, offset[1])
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
export function acexHtmlComputeLayerExtentsMap(
  lineBatches: AcExHtmlLineBatch[],
  meshBatches: AcExHtmlMeshBatch[]
): Map<string, AcExHtmlExtents | null> {
  const buckets = new Map<string, AcExHtmlMutableExtents>()

  const ensure = (layer: string): AcExHtmlMutableExtents => {
    let bucket = buckets.get(layer)
    if (!bucket) {
      bucket = acexHtmlCreateEmptyExtents()
      buckets.set(layer, bucket)
    }
    return bucket
  }

  for (const batch of lineBatches) {
    acexHtmlExpandExtentsFromBatch(ensure(batch.layer), batch)
  }
  for (const batch of meshBatches) {
    acexHtmlExpandExtentsFromBatch(ensure(batch.layer), batch)
  }

  const result = new Map<string, AcExHtmlExtents | null>()
  for (const [layer, bucket] of buckets) {
    result.set(layer, acexHtmlToExtents(bucket))
  }
  return result
}
