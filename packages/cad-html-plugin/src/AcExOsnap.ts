import { FLOAT_TOL } from '@mlightcad/data-model'
import RBush from 'rbush'

import { toWcsCoord } from './AcExBatchBuffers'
import {
  collectPrimitiveDiscreteSnapCandidates,
  collectPrimitiveNearestSnapCandidate,
  distSq,
  inwardArcAlignment,
  isBetterArcLock
} from './AcExOsnapGeometry'
import {
  ACEX_MAX_INTERSECTION_SOURCES,
  intersectionGeomToleranceForSnap,
  intersectionToleranceForExtent,
  intersectLineSegmentPoints,
  intersectPrimitivePair,
  isIntersectionCapablePrimitive
} from './AcExOsnapIntersections'
import {
  expandOsnapPath,
  isOsnapPathPrimitive,
  pathEdgeNearAperture,
  pathPrimitiveBounds
} from './AcExOsnapPath'
import { primitiveToAcGeCurve } from './AcExOsnapPrimitiveToAcGe'
import type {
  AcExOsnapMode,
  AcExOsnapPoint,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'
import { ACEX_DEFAULT_OSNAP_MODES } from './AcExOsnapPrimitiveTypes'
import type {
  AcExLayoutSnapshot,
  AcExLineBatch
} from './AcExSnapshotTypes'

export type { AcExOsnapMode, AcExOsnapPoint } from './AcExOsnapPrimitiveTypes'
export { ACEX_DEFAULT_OSNAP_MODES } from './AcExOsnapPrimitiveTypes'

/**
 * How often to sample the wall-clock budget while walking segments / building
 * RBush entries. `performance.now()` is cheap; checking only every 8192 items
 * let a single batch overshoot the slice by tens of milliseconds.
 */
const OSNAP_INDEX_YIELD_CHECK_EVERY = 1024

/**
 * Target main-thread slice before yielding.
 *
 * 200ms is already a Chrome "long task" (~12 frames at 60Hz). 100ms still
 * hitchs slightly but keeps million-edge indexes from turning into a rAF
 * wait-per-chunk slog.
 */
const OSNAP_INDEX_YIELD_BUDGET_MS = 100

/** Bulk-load this many RBush entries per slice so `load()` itself can yield. */
const OSNAP_RBUSH_LOAD_CHUNK = 32_768

function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

/**
 * Yields only after {@link OSNAP_INDEX_YIELD_BUDGET_MS} of continuous work,
 * sampled every {@link OSNAP_INDEX_YIELD_CHECK_EVERY} items.
 * Returns a promise only when a yield is actually scheduled (callers should
 * `await` only when non-null) so tight loops avoid millions of Promise allocs.
 */
function createOsnapYieldScheduler(
  yieldFn: () => Promise<void>
): {
  /** @returns A promise to await when yielding; otherwise `undefined`. */
  afterItem: () => Promise<void> | undefined
} {
  let itemsSinceCheck = 0
  let sliceStart = performance.now()
  return {
    afterItem: () => {
      itemsSinceCheck += 1
      if (itemsSinceCheck < OSNAP_INDEX_YIELD_CHECK_EVERY) {
        return undefined
      }
      itemsSinceCheck = 0
      if (performance.now() - sliceStart < OSNAP_INDEX_YIELD_BUDGET_MS) {
        return undefined
      }
      return yieldFn().then(() => {
        sliceStart = performance.now()
      })
    }
  }
}

function searchRbushForest(
  tree: RBush<AcExRbushEntry>,
  extras: RBush<AcExRbushEntry>[],
  box: { minX: number; minY: number; maxX: number; maxY: number }
): AcExRbushEntry[] {
  if (extras.length === 0) {
    return tree.search(box)
  }
  const hits = tree.search(box).slice()
  for (const extra of extras) {
    const part = extra.search(box)
    for (let i = 0; i < part.length; i++) {
      hits.push(part[i]!)
    }
  }
  return hits
}

async function bulkLoadRbush(
  tree: RBush<AcExRbushEntry>,
  extras: RBush<AcExRbushEntry>[],
  entries: AcExRbushEntry[],
  yieldFn: () => Promise<void>
): Promise<void> {
  extras.length = 0
  tree.clear()
  if (entries.length === 0) {
    return
  }
  for (let offset = 0; offset < entries.length; offset += OSNAP_RBUSH_LOAD_CHUNK) {
    const chunk = entries.slice(offset, offset + OSNAP_RBUSH_LOAD_CHUNK)
    if (offset === 0) {
      tree.load(chunk)
    } else {
      const extra = new RBush<AcExRbushEntry>()
      extra.load(chunk)
      extras.push(extra)
    }
    if (offset + OSNAP_RBUSH_LOAD_CHUNK < entries.length) {
      await yieldFn()
    }
  }
}

/**
 * One line segment in WCS (XY) indexed for legacy tessellated object snap.
 * @internal
 */
interface AcExOsnapSegment {
  x0: number
  y0: number
  x1: number
  y1: number
}

function modePriority(mode: AcExOsnapMode): number {
  switch (mode) {
    case 'endpoint':
    case 'midpoint':
    case 'center':
    case 'intersection':
      return 0
    case 'quadrant':
    case 'node':
      return 1
    case 'nearest':
      return 2
    default:
      return 1
  }
}

function closestPointOnSegment(
  px: number,
  py: number,
  seg: AcExOsnapSegment
): { x: number; y: number; distSq: number } {
  const dx = seg.x1 - seg.x0
  const dy = seg.y1 - seg.y0
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-18) {
    return {
      x: seg.x0,
      y: seg.y0,
      distSq: distSq(px, py, seg.x0, seg.y0)
    }
  }
  let t = ((px - seg.x0) * dx + (py - seg.y0) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const x = seg.x0 + t * dx
  const y = seg.y0 + t * dy
  return { x, y, distSq: distSq(px, py, x, y) }
}

function appendSegments(
  target: AcExOsnapSegment[],
  source: Iterable<AcExOsnapSegment>
): void {
  for (const seg of source) {
    target.push(seg)
  }
}

function segmentsFromIterable(
  source: Iterable<AcExOsnapSegment>
): AcExOsnapSegment[] {
  const result: AcExOsnapSegment[] = []
  appendSegments(result, source)
  return result
}

function* iterLineSegments(batch: AcExLineBatch): Generator<AcExOsnapSegment> {
  const [ox, oy] = batch.offset
  const p = batch.positions
  if (batch.indices && batch.indices.length >= 2) {
    for (let i = 0; i + 1 < batch.indices.length; i += 2) {
      const i0 = batch.indices[i]! * 3
      const i1 = batch.indices[i + 1]! * 3
      yield {
        x0: toWcsCoord(p[i0]!, ox),
        y0: toWcsCoord(p[i0 + 1]!, oy),
        x1: toWcsCoord(p[i1]!, ox),
        y1: toWcsCoord(p[i1 + 1]!, oy)
      }
    }
    return
  }
  for (let i = 0; i + 5 < p.length; i += 6) {
    yield {
      x0: toWcsCoord(p[i]!, ox),
      y0: toWcsCoord(p[i + 1]!, oy),
      x1: toWcsCoord(p[i + 3]!, ox),
      y1: toWcsCoord(p[i + 4]!, oy)
    }
  }
}

/**
 * Returns whether two WCS XY points coincide within a tolerance.
 *
 * @param x1 - First point X.
 * @param y1 - First point Y.
 * @param x2 - Second point X.
 * @param y2 - Second point Y.
 * @param tol - Maximum distance treated as coincident (drawing units).
 * @returns `true` when the Euclidean distance is at most `tol`.
 * @internal
 */
function pointsEqual(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tol: number
): boolean {
  return Math.hypot(x1 - x2, y1 - y2) <= tol
}

/**
 * Merges line segments that share endpoints into longer logical segments.
 *
 * Non-indexed {@link AcExLineBatch} geometry stores disconnected vertex pairs
 * (one pair per rendered edge). When {@link AcExLineBatch.linePattern} is set,
 * consecutive pairs that meet at a common endpoint belong to the same CAD entity
 * and should snap as one line, not as independent dash or tessellation fragments.
 *
 * The algorithm greedily extends each unused seed segment forward and backward
 * by attaching neighbors whose endpoints coincide within `tol`.
 *
 * @param segments - Tessellated WCS segments, typically from {@link iterLineSegments}.
 * @param tol - Endpoint coincidence tolerance in drawing units; defaults to {@link FLOAT_TOL}.
 * @returns One segment per connected chain; input order does not affect the result.
 * @internal
 */
export function mergeConnectedSegments(
  segments: AcExOsnapSegment[],
  tol = FLOAT_TOL
): AcExOsnapSegment[] {
  if (segments.length <= 1) {
    return segments
  }

  const used = new Array<boolean>(segments.length).fill(false)
  const merged: AcExOsnapSegment[] = []

  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue

    const seed = segments[start]!
    let x0 = seed.x0
    let y0 = seed.y0
    let x1 = seed.x1
    let y1 = seed.y1
    used[start] = true

    let extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue
        const seg = segments[i]!
        if (pointsEqual(x1, y1, seg.x0, seg.y0, tol)) {
          x1 = seg.x1
          y1 = seg.y1
          used[i] = true
          extended = true
        } else if (pointsEqual(x1, y1, seg.x1, seg.y1, tol)) {
          x1 = seg.x0
          y1 = seg.y0
          used[i] = true
          extended = true
        }
      }
    }

    extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue
        const seg = segments[i]!
        if (pointsEqual(x0, y0, seg.x1, seg.y1, tol)) {
          x0 = seg.x0
          y0 = seg.y0
          used[i] = true
          extended = true
        } else if (pointsEqual(x0, y0, seg.x0, seg.y0, tol)) {
          x0 = seg.x1
          y0 = seg.y1
          used[i] = true
          extended = true
        }
      }
    }

    merged.push({ x0, y0, x1, y1 })
  }

  return merged
}

/**
 * Extracts WCS snap segments from one exported {@link AcExLineBatch}.
 *
 * Always walks stored segment pairs / index edges via {@link iterLineSegments}.
 * Patterned (dashed) batches are **not** collapsed to first/last chain ends —
 * that dropped intermediate WidePolyline / LWPOLYLINE vertices. Linetype gaps
 * are shader-only; the vertex chain is the entity geometry AutoCAD snaps to.
 *
 * @param batch - One line batch from {@link AcExLayoutSnapshot.lineBatches}.
 * @returns Snap segments in WCS; may be empty when the batch has no geometry.
 */
export function extractLineBatchSnapSegments(
  batch: AcExLineBatch
): AcExOsnapSegment[] {
  return segmentsFromIterable(iterLineSegments(batch))
}

/**
 * Collects tessellated snap segments from drawable {@link AcExLineBatch}s.
 *
 * Mesh / hatch triangulation (`meshBatches`) is intentionally skipped: those
 * edges are display fills, not CAD snap targets, and indexing every triangle
 * edge on large drawings can take minutes and flood RBush.
 *
 * Segments with non-finite endpoints are dropped so one NaN polyline cannot
 * poison RBush parent bounds (same failure mode as the main viewer spatial index).
 *
 * @param layout - Active layout snapshot.
 * @returns Flat list of WCS segments and parallel layer names for spatial indexing.
 * @internal
 */
function collectBatchSegments(layout: AcExLayoutSnapshot): {
  segments: AcExOsnapSegment[]
  segmentLayers: string[]
} {
  const segments: AcExOsnapSegment[] = []
  const segmentLayers: string[] = []
  const pushSegment = (seg: AcExOsnapSegment, layer: string) => {
    if (!isFiniteSegment(seg)) return
    segments.push(seg)
    segmentLayers.push(layer)
  }

  for (const batch of layout.lineBatches) {
    if (batch.excludeFromOsnap) continue
    for (const seg of extractLineBatchSnapSegments(batch)) {
      pushSegment(seg, batch.layer)
    }
  }
  return { segments, segmentLayers }
}

function layoutHasDrawableLineBatches(layout: AcExLayoutSnapshot): boolean {
  for (const batch of layout.lineBatches) {
    if (batch.excludeFromOsnap) continue
    if (batch.positions.length >= 6) {
      return true
    }
  }
  return false
}

/**
 * Like {@link collectBatchSegments}, but time-slices the walk so the UI stays
 * responsive without yielding on every few thousand edges (rAF-per-chunk made
 * large drawings take minutes).
 */
async function collectBatchSegmentsAsync(
  layout: AcExLayoutSnapshot,
  yieldFn: () => Promise<void>
): Promise<{
  segments: AcExOsnapSegment[]
  segmentLayers: string[]
}> {
  const segments: AcExOsnapSegment[] = []
  const segmentLayers: string[] = []
  const schedule = createOsnapYieldScheduler(yieldFn)

  for (const batch of layout.lineBatches) {
    if (batch.excludeFromOsnap) continue
    // Stream solid batches via the generator; avoid materializing the whole
    // batch into an intermediate array before the first yield can run.
    const source = iterLineSegments(batch)
    for (const seg of source) {
      if (!isFiniteSegment(seg)) continue
      segments.push(seg)
      segmentLayers.push(batch.layer)
      const wait = schedule.afterItem()
      if (wait) await wait
    }
  }
  return { segments, segmentLayers }
}

function isFiniteSegment(seg: AcExOsnapSegment): boolean {
  return (
    Number.isFinite(seg.x0) &&
    Number.isFinite(seg.y0) &&
    Number.isFinite(seg.x1) &&
    Number.isFinite(seg.y1)
  )
}

/**
 * Rough item count for deciding whether to show a "building OSNAP" status.
 * Counts analytic primitives + line-batch edges only (meshes are not indexed).
 */
export function estimateOsnapRebuildWork(layout: AcExLayoutSnapshot): number {
  let n = layout.osnap?.primitives.length ?? 0
  for (const batch of layout.lineBatches) {
    if (batch.excludeFromOsnap) continue
    if (batch.indices && batch.indices.length >= 2) {
      n += (batch.indices.length / 2) | 0
    } else {
      n += (batch.positions.length / 6) | 0
    }
  }
  return n
}

/** RBush entry referencing an index in {@link AcExOsnapIndex}'s arrays. @internal */
interface AcExRbushEntry {
  minX: number
  minY: number
  maxX: number
  maxY: number
  index: number
}

/** Squared distance from a point to an axis-aligned box exterior (0 when inside). @internal */
function distSqToBounds(
  px: number,
  py: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): number {
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0
  const dy = py < minY ? minY - py : py > maxY ? py - maxY : 0
  return dx * dx + dy * dy
}

function searchBox(
  px: number,
  py: number,
  threshold: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: px - threshold,
    minY: py - threshold,
    maxX: px + threshold,
    maxY: py + threshold
  }
}

function isFiniteBounds(box: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): boolean {
  return (
    Number.isFinite(box.minX) &&
    Number.isFinite(box.minY) &&
    Number.isFinite(box.maxX) &&
    Number.isFinite(box.maxY)
  )
}

function primitiveBounds(prim: AcExOsnapPrimitive): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  switch (prim.kind) {
    case 'line':
      return {
        minX: Math.min(prim.x0, prim.x1),
        minY: Math.min(prim.y0, prim.y1),
        maxX: Math.max(prim.x0, prim.x1),
        maxY: Math.max(prim.y0, prim.y1)
      }
    case 'circle':
    case 'arc':
      return {
        minX: prim.cx - prim.r,
        minY: prim.cy - prim.r,
        maxX: prim.cx + prim.r,
        maxY: prim.cy + prim.r
      }
    case 'ellipse':
      return {
        minX: prim.cx - prim.majorR,
        minY: prim.cy - prim.majorR,
        maxX: prim.cx + prim.majorR,
        maxY: prim.cy + prim.majorR
      }
    case 'spline': {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (let i = 0; i + 1 < prim.controlPoints.length; i += 2) {
        const x = prim.controlPoints[i]!
        const y = prim.controlPoints[i + 1]!
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
      return { minX, minY, maxX, maxY }
    }
    case 'path':
      return pathPrimitiveBounds(prim)
    case 'point':
      return { minX: prim.x, minY: prim.y, maxX: prim.x, maxY: prim.y }
  }
}

/**
 * Spatial index for object snap in the offline HTML viewer.
 *
 * {@link AcExOsnapIndex.rebuild} loads analytic primitives and tessellated
 * segments into RBush trees only. Discrete snap points, nearest, and
 * intersection candidates are computed on pointer query from nearby geometry.
 */
export class AcExOsnapIndex {
  private segments: AcExOsnapSegment[] = []
  private segmentLayers: string[] = []
  private primitives: AcExOsnapPrimitive[] = []
  private primitiveTree = new RBush<AcExRbushEntry>()
  private segmentTree = new RBush<AcExRbushEntry>()
  /** Extra bulk-loaded trees when async rebuild splits {@link OSNAP_RBUSH_LOAD_CHUNK}. */
  private primitiveTreeExtras: RBush<AcExRbushEntry>[] = []
  private segmentTreeExtras: RBush<AcExRbushEntry>[] = []
  private modes: Set<AcExOsnapMode>
  private hiddenLayers = new Set<string>()

  /**
   * @param modes - Enabled snap modes; defaults to {@link ACEX_DEFAULT_OSNAP_MODES}.
   */
  constructor(modes: Iterable<AcExOsnapMode> = ACEX_DEFAULT_OSNAP_MODES) {
    this.modes = new Set(modes)
  }

  /**
   * Marks one layer hidden or visible for object snap without rebuilding the index.
   *
   * @param layerName - Layer to update.
   * @param hidden - When `true`, snap skips geometry on this layer.
   */
  setLayerHidden(layerName: string, hidden: boolean): void {
    if (hidden) {
      this.hiddenLayers.add(layerName)
    } else {
      this.hiddenLayers.delete(layerName)
    }
  }

  /** Makes every indexed layer eligible for object snap. */
  showAllLayers(): void {
    this.hiddenLayers.clear()
  }

  /**
   * Excludes every listed layer from object snap.
   *
   * @param layerNames - Layers to hide from snap queries.
   */
  hideAllLayers(layerNames: Iterable<string>): void {
    this.hiddenLayers.clear()
    for (const name of layerNames) {
      this.hiddenLayers.add(name)
    }
  }

  /**
   * Builds spatial indexes from the active layout snapshot.
   *
   * Loads analytic curve/point primitives (when present) and tessellated line
   * segments from {@link AcExLineBatch} into RBush trees. Straight edges are
   * expected from batches; ACEO catalogs omit `line` kinds to avoid duplication.
   *
   * Prefer {@link rebuildAsync} for large layouts so the UI thread can paint
   * between batches.
   *
   * @param layout - Active layout snapshot (batches + optional {@link AcExLayoutSnapshot.osnap}).
   */
  rebuild(layout: AcExLayoutSnapshot): void {
    this.resetFromLayout(layout)
    this.collectSegmentsFromLayout(layout)
    this.loadPrimitiveTreeSync()
    this.loadSegmentTreeSync()
  }

  /**
   * Like {@link rebuild}, but yields while collecting batch segments, filtering
   * primitives, preparing RBush entries, and bulk-loading the trees in chunks.
   *
   * @param layout - Active layout snapshot.
   * @param yieldFn - Called between work batches (defaults to a macrotask yield).
   */
  async rebuildAsync(
    layout: AcExLayoutSnapshot,
    yieldFn: () => Promise<void> = yieldToBrowser
  ): Promise<void> {
    this.resetIndexState()
    await this.filterPrimitivesAsync(
      layout.osnap?.primitives ?? [],
      yieldFn
    )
    await this.collectSegmentsFromLayoutAsync(layout, yieldFn)
    await this.loadPrimitiveTreeAsync(yieldFn)
    await this.loadSegmentTreeAsync(yieldFn)
  }

  private resetIndexState(): void {
    this.primitiveTree.clear()
    this.segmentTree.clear()
    this.primitiveTreeExtras = []
    this.segmentTreeExtras = []
    this.hiddenLayers.clear()
    this.segments = []
    this.segmentLayers = []
  }

  private resetFromLayout(layout: AcExLayoutSnapshot): void {
    this.resetIndexState()
    this.primitives = (layout.osnap?.primitives ?? []).filter(prim =>
      isFiniteBounds(primitiveBounds(prim))
    )
  }

  private async filterPrimitivesAsync(
    source: readonly AcExOsnapPrimitive[],
    yieldFn: () => Promise<void>
  ): Promise<void> {
    if (source.length === 0) {
      this.primitives = []
      return
    }
    const filtered: AcExOsnapPrimitive[] = []
    const schedule = createOsnapYieldScheduler(yieldFn)
    for (let i = 0; i < source.length; i++) {
      const prim = source[i]!
      if (isFiniteBounds(primitiveBounds(prim))) {
        filtered.push(prim)
      }
      const wait = schedule.afterItem()
      if (wait) await wait
    }
    this.primitives = filtered
  }

  private collectSegmentsFromLayout(layout: AcExLayoutSnapshot): void {
    if (!layoutHasDrawableLineBatches(layout)) {
      return
    }
    const collected = collectBatchSegments(layout)
    this.segments = collected.segments
    this.segmentLayers = collected.segmentLayers
  }

  private async collectSegmentsFromLayoutAsync(
    layout: AcExLayoutSnapshot,
    yieldFn: () => Promise<void>
  ): Promise<void> {
    if (!layoutHasDrawableLineBatches(layout)) {
      return
    }
    const collected = await collectBatchSegmentsAsync(layout, yieldFn)
    this.segments = collected.segments
    this.segmentLayers = collected.segmentLayers
  }

  private loadPrimitiveTreeSync(): void {
    if (this.primitives.length === 0) {
      return
    }
    const primitiveEntries: AcExRbushEntry[] = []
    for (let i = 0; i < this.primitives.length; i++) {
      const bounds = primitiveBounds(this.primitives[i]!)
      // One NaN bbox poisons RBush so every later findSnap returns empty.
      if (!isFiniteBounds(bounds)) {
        continue
      }
      primitiveEntries.push({
        ...bounds,
        index: i
      })
    }
    if (primitiveEntries.length > 0) {
      this.primitiveTree.load(primitiveEntries)
    }
  }

  private loadSegmentTreeSync(): void {
    if (this.segments.length === 0) {
      return
    }
    const segmentEntries: AcExRbushEntry[] = []
    for (let i = 0; i < this.segments.length; i++) {
      const bounds = segmentBounds(this.segments[i]!)
      if (!isFiniteBounds(bounds)) {
        continue
      }
      segmentEntries.push({
        ...bounds,
        index: i
      })
    }
    if (segmentEntries.length > 0) {
      this.segmentTree.load(segmentEntries)
    }
  }

  private async loadPrimitiveTreeAsync(
    yieldFn: () => Promise<void>
  ): Promise<void> {
    const count = this.primitives.length
    if (count === 0) {
      return
    }
    const schedule = createOsnapYieldScheduler(yieldFn)
    const primitiveEntries: AcExRbushEntry[] = []
    for (let i = 0; i < count; i++) {
      const bounds = primitiveBounds(this.primitives[i]!)
      if (!isFiniteBounds(bounds)) {
        continue
      }
      primitiveEntries.push({
        ...bounds,
        index: i
      })
      const wait = schedule.afterItem()
      if (wait) await wait
    }
    if (primitiveEntries.length > 0) {
      await bulkLoadRbush(
        this.primitiveTree,
        this.primitiveTreeExtras,
        primitiveEntries,
        yieldFn
      )
    }
  }

  private async loadSegmentTreeAsync(
    yieldFn: () => Promise<void>
  ): Promise<void> {
    const count = this.segments.length
    if (count === 0) {
      return
    }
    const schedule = createOsnapYieldScheduler(yieldFn)
    const segmentEntries: AcExRbushEntry[] = []
    for (let i = 0; i < count; i++) {
      const bounds = segmentBounds(this.segments[i]!)
      if (!isFiniteBounds(bounds)) {
        continue
      }
      segmentEntries.push({
        ...bounds,
        index: i
      })
      const wait = schedule.afterItem()
      if (wait) await wait
    }
    if (segmentEntries.length > 0) {
      await bulkLoadRbush(
        this.segmentTree,
        this.segmentTreeExtras,
        segmentEntries,
        yieldFn
      )
    }
  }

  /**
   * Finds the closest circle or circular-arc primitive whose curve is within
   * `threshold` of `(px, py)`.
   *
   * Used by arc-length measurement to lock subsequent picks onto that circle
   * when the first click lands on a `CIRCLE` / `ARC` (including polyline bulges).
   *
   * @param px - Cursor X in drawing units (WCS).
   * @param py - Cursor Y in drawing units (WCS).
   * @param threshold - Maximum distance in drawing units.
   * @returns Circle center, radius, and the nearest point on the drawn
   *   stroke, or `undefined` when none is close enough. `x`/`y` lie on the
   *   curve (including arc endpoints), not a radial projection onto the
   *   complementary full circle.
   */
  findCircleOrArcNear(
    px: number,
    py: number,
    threshold: number
  ): { cx: number; cy: number; r: number; x: number; y: number } | undefined {
    if (threshold <= 0 || this.primitives.length === 0) return undefined
    const threshSq = threshold * threshold
    const box = searchBox(px, py, threshold)
    let bestDistSq = threshSq
    let bestAlign = -Infinity
    let best:
      | { cx: number; cy: number; r: number; x: number; y: number }
      | undefined

    const mouse = { x: px, y: py }
    for (const hit of searchRbushForest(
      this.primitiveTree,
      this.primitiveTreeExtras,
      box
    )) {
      const prim = this.primitives[hit.index]!
      if (this.hiddenLayers.has(prim.layer)) continue
      const arcs =
        prim.kind === 'path'
          ? expandOsnapPath(prim).filter(edge => edge.kind === 'arc')
          : prim.kind === 'circle' || prim.kind === 'arc'
            ? [prim]
            : []
      for (const arcPrim of arcs) {
        if (arcPrim.kind !== 'circle' && arcPrim.kind !== 'arc') continue
        const geo = primitiveToAcGeCurve(arcPrim)
        if (geo.kind !== 'circArc') continue
        const nearest = geo.curve.nearestPoint({ x: px, y: py })
        const d2 = distSq(px, py, nearest.x, nearest.y)
        if (d2 > threshSq) continue
        const align = inwardArcAlignment(geo.curve, nearest, mouse)
        if (!best || isBetterArcLock(d2, align, bestDistSq, bestAlign)) {
          bestDistSq = d2
          bestAlign = align
          best = {
            cx: arcPrim.cx,
            cy: arcPrim.cy,
            r: arcPrim.r,
            x: nearest.x,
            y: nearest.y
          }
        }
      }
    }
    return best
  }

  /**
   * Finds the best snap point near the cursor in WCS.
   *
   * Queries analytic {@link AcExLayoutSnapshot.osnap} curve primitives together
   * with tessellated {@link AcExLineBatch} segments (lines are derived from
   * geometry, not duplicated in ACEO). Hatch/mesh triangulation is not indexed.
   *
   * Uses AutoCAD-style mode priority: endpoint / midpoint / center beat
   * quadrant / node, which beat nearest. Within the same
   * priority tier, the closest candidate within `threshold` wins.
   *
   * @param px - Cursor X in drawing units (WCS).
   * @param py - Cursor Y in drawing units (WCS).
   * @param threshold - Maximum snap distance in drawing units (aperture radius).
   * @returns The winning snap point, or `undefined` if nothing is within range.
   */
  findSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    if (threshold <= 0) return undefined
    if (this.primitives.length === 0 && this.segments.length === 0) {
      return undefined
    }

    const discrete = this.findDiscreteSnap(px, py, threshold)
    const intersection = this.modes.has('intersection')
      ? this.findIntersectionSnap(px, py, threshold)
      : undefined
    const bestDiscrete = this.pickBestSnapPoint(px, py, threshold, [
      discrete,
      intersection
    ])
    if (bestDiscrete) {
      return bestDiscrete
    }

    if (!this.modes.has('nearest')) {
      return undefined
    }

    return this.findNearestSnap(px, py, threshold)
  }

  private pickBestSnapPoint(
    px: number,
    py: number,
    threshold: number,
    candidates: Array<AcExOsnapPoint | undefined>
  ): AcExOsnapPoint | undefined {
    const threshSq = threshold * threshold
    let bestPriority = Number.MAX_VALUE
    let bestDistSq = Number.MAX_VALUE
    let best: AcExOsnapPoint | undefined

    for (const candidate of candidates) {
      if (!candidate) continue
      const d2 = distSq(px, py, candidate.x, candidate.y)
      if (d2 > threshSq) continue
      const priority = modePriority(candidate.mode)
      if (
        priority < bestPriority ||
        (priority === bestPriority && d2 < bestDistSq)
      ) {
        bestPriority = priority
        bestDistSq = d2
        best = candidate
      }
    }

    return best
  }

  /**
   * Finds an intersection snap near the cursor by testing pairs of geometry
   * sources whose bounds overlap the osnap aperture (RBush-filtered).
   */
  private findIntersectionSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    const box = searchBox(px, py, threshold)
    const primHits = searchRbushForest(
      this.primitiveTree,
      this.primitiveTreeExtras,
      box
    )
    const segHits = searchRbushForest(
      this.segmentTree,
      this.segmentTreeExtras,
      box
    )
    if (primHits.length === 0 && segHits.length === 0) return undefined

    const threshSq = threshold * threshold
    const extent = Math.max(box.maxX - box.minX, box.maxY - box.minY, 1)
    const paramTol = intersectionToleranceForExtent(extent)
    const geomTol = intersectionGeomToleranceForSnap(extent, threshold)

    const segIndices: number[] = []
    const primSeen = new Set<number>()
    const segSeen = new Set<number>()
    const workPrims: AcExOsnapPrimitive[] = []

    for (const hit of primHits) {
      const prim = this.primitives[hit.index]!
      if (this.hiddenLayers.has(prim.layer)) continue
      if (primSeen.has(hit.index)) continue
      primSeen.add(hit.index)
      if (isOsnapPathPrimitive(prim)) {
        for (const edge of expandOsnapPath(prim)) {
          if (!pathEdgeNearAperture(edge, px, py, threshold)) continue
          if (workPrims.length >= ACEX_MAX_INTERSECTION_SOURCES) break
          workPrims.push(edge)
        }
        continue
      }
      if (!isIntersectionCapablePrimitive(prim)) continue
      if (workPrims.length >= ACEX_MAX_INTERSECTION_SOURCES) continue
      workPrims.push(prim)
    }

    for (const hit of segHits) {
      const layer = this.segmentLayers[hit.index]!
      if (this.hiddenLayers.has(layer)) continue
      if (segSeen.has(hit.index)) continue
      if (segIndices.length >= ACEX_MAX_INTERSECTION_SOURCES) continue
      segSeen.add(hit.index)
      segIndices.push(hit.index)
    }

    let bestDistSq = threshSq
    let best: AcExOsnapPoint | undefined

    for (let i = 0; i < workPrims.length; i++) {
      const primA = workPrims[i]!
      for (let j = i + 1; j < workPrims.length; j++) {
        const primB = workPrims[j]!
        if (
          this.hiddenLayers.has(primA.layer) ||
          this.hiddenLayers.has(primB.layer)
        ) {
          continue
        }
        for (const point of intersectPrimitivePair(
          primA,
          primB,
          paramTol,
          geomTol
        )) {
          const d2 = distSq(px, py, point.x, point.y)
          if (d2 <= bestDistSq) {
            bestDistSq = d2
            best = { x: point.x, y: point.y, mode: 'intersection' }
          }
        }
      }
    }

    for (let i = 0; i < segIndices.length; i++) {
      const indexA = segIndices[i]!
      const segA = this.segments[indexA]!
      const layerA = this.segmentLayers[indexA]!
      for (let j = i + 1; j < segIndices.length; j++) {
        const indexB = segIndices[j]!
        const segB = this.segments[indexB]!
        const layerB = this.segmentLayers[indexB]!
        if (this.hiddenLayers.has(layerA) || this.hiddenLayers.has(layerB)) {
          continue
        }
        for (const point of intersectLineSegmentPoints(
          segA,
          segB,
          paramTol,
          geomTol
        )) {
          const d2 = distSq(px, py, point.x, point.y)
          if (d2 <= bestDistSq) {
            bestDistSq = d2
            best = { x: point.x, y: point.y, mode: 'intersection' }
          }
        }
      }
    }

    // Hybrid: ACEO curves/path edges × display lineBatches.
    for (const prim of workPrims) {
      if (this.hiddenLayers.has(prim.layer)) continue
      if (
        prim.kind !== 'circle' &&
        prim.kind !== 'arc' &&
        prim.kind !== 'line'
      ) {
        continue
      }
      for (const segIndex of segIndices) {
        const layer = this.segmentLayers[segIndex]!
        if (this.hiddenLayers.has(layer)) continue
        const seg = this.segments[segIndex]!
        const asLine: AcExOsnapPrimitive = {
          kind: 'line',
          layer,
          x0: seg.x0,
          y0: seg.y0,
          x1: seg.x1,
          y1: seg.y1
        }
        for (const point of intersectPrimitivePair(
          prim,
          asLine,
          paramTol,
          geomTol
        )) {
          const d2 = distSq(px, py, point.x, point.y)
          if (d2 <= bestDistSq) {
            bestDistSq = d2
            best = { x: point.x, y: point.y, mode: 'intersection' }
          }
        }
      }
    }

    return best
  }

  private discreteModes(): Set<AcExOsnapMode> {
    const discreteModes = new Set(this.modes)
    discreteModes.delete('nearest')
    discreteModes.delete('intersection')
    return discreteModes
  }

  private considerDiscreteCandidate(
    px: number,
    py: number,
    threshSq: number,
    candidate: AcExOsnapPoint,
    layer: string,
    state: {
      bestPriority: number
      bestDistSq: number
      best: AcExOsnapPoint | undefined
    }
  ): void {
    if (!this.modes.has(candidate.mode)) return
    if (this.hiddenLayers.has(layer)) return

    const d2 = distSq(px, py, candidate.x, candidate.y)
    if (d2 > threshSq) return
    const priority = modePriority(candidate.mode)
    if (
      priority < state.bestPriority ||
      (priority === state.bestPriority && d2 < state.bestDistSq)
    ) {
      state.bestPriority = priority
      state.bestDistSq = d2
      state.best = candidate
    }
  }

  private findDiscreteSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    const discreteModes = this.discreteModes()
    if (discreteModes.size === 0) return undefined

    const threshSq = threshold * threshold
    const box = searchBox(px, py, threshold)
    const state = {
      bestPriority: Number.MAX_VALUE,
      bestDistSq: Number.MAX_VALUE,
      best: undefined as AcExOsnapPoint | undefined
    }

    for (const hit of searchRbushForest(
      this.primitiveTree,
      this.primitiveTreeExtras,
      box
    )) {
      const prim = this.primitives[hit.index]!
      for (const candidate of collectPrimitiveDiscreteSnapCandidates(
        prim,
        discreteModes
      )) {
        this.considerDiscreteCandidate(
          px,
          py,
          threshSq,
          candidate,
          prim.layer,
          state
        )
      }
    }

    for (const hit of searchRbushForest(
      this.segmentTree,
      this.segmentTreeExtras,
      box
    )) {
      const seg = this.segments[hit.index]!
      const layer = this.segmentLayers[hit.index]!
      if (discreteModes.has('endpoint')) {
        this.considerDiscreteCandidate(
          px,
          py,
          threshSq,
          { x: seg.x0, y: seg.y0, mode: 'endpoint' },
          layer,
          state
        )
        this.considerDiscreteCandidate(
          px,
          py,
          threshSq,
          { x: seg.x1, y: seg.y1, mode: 'endpoint' },
          layer,
          state
        )
      }
      if (discreteModes.has('midpoint')) {
        this.considerDiscreteCandidate(
          px,
          py,
          threshSq,
          {
            x: (seg.x0 + seg.x1) * 0.5,
            y: (seg.y0 + seg.y1) * 0.5,
            mode: 'midpoint'
          },
          layer,
          state
        )
      }
    }

    return state.best
  }

  private findNearestSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    const threshSq = threshold * threshold
    const box = searchBox(px, py, threshold)
    let bestDistSq = Number.MAX_VALUE
    let best: AcExOsnapPoint | undefined

    for (const hit of searchRbushForest(
      this.primitiveTree,
      this.primitiveTreeExtras,
      box
    )) {
      if (
        distSqToBounds(px, py, hit.minX, hit.minY, hit.maxX, hit.maxY) >
        threshSq
      ) {
        continue
      }

      const prim = this.primitives[hit.index]!
      if (this.hiddenLayers.has(prim.layer)) continue
      if (prim.kind === 'point') continue

      const nearest =
        prim.kind === 'path'
          ? collectPrimitiveNearestSnapCandidate(prim, px, py)
          : collectPrimitiveNearestSnapCandidate(
              prim,
              px,
              py,
              primitiveToAcGeCurve(prim)
            )
      if (!nearest) continue
      const d2 = distSq(px, py, nearest.x, nearest.y)
      if (d2 <= threshSq && d2 < bestDistSq) {
        bestDistSq = d2
        best = nearest
      }
    }

    for (const hit of searchRbushForest(
      this.segmentTree,
      this.segmentTreeExtras,
      box
    )) {
      if (
        distSqToBounds(px, py, hit.minX, hit.minY, hit.maxX, hit.maxY) >
        threshSq
      ) {
        continue
      }

      const layer = this.segmentLayers[hit.index]!
      if (this.hiddenLayers.has(layer)) continue

      const near = closestPointOnSegment(px, py, this.segments[hit.index]!)
      if (near.distSq <= threshSq && near.distSq < bestDistSq) {
        bestDistSq = near.distSq
        best = { x: near.x, y: near.y, mode: 'nearest' }
      }
    }

    return best
  }
}

/**
 * Axis-aligned bounds of one tessellated snap segment in WCS.
 *
 * @param seg - Segment whose endpoints define the bounding box.
 * @returns `{ minX, minY, maxX, maxY }` used by the segment RBush in
 *   {@link AcExOsnapIndex.rebuild}.
 * @internal
 */
function segmentBounds(seg: AcExOsnapSegment): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  return {
    minX: Math.min(seg.x0, seg.x1),
    minY: Math.min(seg.y0, seg.y1),
    maxX: Math.max(seg.x0, seg.x1),
    maxY: Math.max(seg.y0, seg.y1)
  }
}

/**
 * Maps an {@link AcExOsnapMode} to the on-screen marker glyph in the offline viewer.
 *
 * @param mode - Active snap mode from {@link findSnap} or measurement UI.
 * @returns CSS shape key used by {@link AcExOsnapMarker}.
 */
export function acexOsnapModeToMarkerType(
  mode: AcExOsnapMode
): 'rect' | 'triangle' | 'x' | 'circle' | 'diamond' | 'intersection' {
  switch (mode) {
    case 'endpoint':
      return 'rect'
    case 'midpoint':
      return 'triangle'
    case 'center':
      return 'circle'
    case 'quadrant':
      return 'diamond'
    case 'nearest':
      return 'x'
    case 'intersection':
      return 'intersection'
    case 'node':
    default:
      return 'rect'
  }
}
