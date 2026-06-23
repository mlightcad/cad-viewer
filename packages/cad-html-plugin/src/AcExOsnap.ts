import { FLOAT_TOL } from '@mlightcad/data-model'
import RBush from 'rbush'

import { toWcsCoord } from './AcExBatchBuffers'
import {
  collectPrimitiveDiscreteSnapCandidates,
  collectPrimitiveNearestSnapCandidate,
  distSq
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
  type AcExOsnapAcGeCurve,
  primitiveToAcGeCurve
} from './AcExOsnapPrimitiveToAcGe'
import type {
  AcExOsnapMode,
  AcExOsnapPoint,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'
import { ACEX_DEFAULT_OSNAP_MODES } from './AcExOsnapPrimitiveTypes'
import type {
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch
} from './AcExSnapshotTypes'

export type { AcExOsnapMode, AcExOsnapPoint } from './AcExOsnapPrimitiveTypes'
export { ACEX_DEFAULT_OSNAP_MODES } from './AcExOsnapPrimitiveTypes'

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
 * Reads one vertex from a line batch in WCS (XY).
 *
 * Applies {@link AcExLineBatch.offset} after indexing into the flat
 * {@link AcExLineBatch.positions} buffer (`vertexIndex * 3` stride).
 *
 * @param batch - Exported line batch from the HTML snapshot.
 * @param vertexIndex - Zero-based vertex index referenced by the batch index buffer.
 * @returns Transformed XY coordinates in drawing units.
 * @internal
 */
function readBatchVertex(
  batch: AcExLineBatch,
  vertexIndex: number
): { x: number; y: number } {
  const [ox, oy] = batch.offset
  const base = vertexIndex * 3
  return {
    x: toWcsCoord(batch.positions[base]!, ox),
    y: toWcsCoord(batch.positions[base + 1]!, oy)
  }
}

/**
 * Derives logical snap segments from a patterned ({@link AcExLineBatch.linePattern}) line batch.
 *
 * Dashed and dotted lines are drawn with a GPU shader on top of a continuous vertex
 * chain. The snapshot index buffer encodes that chain as shared-vertex edges
 * (`0-1`, `1-2`, …). {@link iterLineSegments} treats every index pair as a separate
 * edge, which makes endpoint snap land on internal tessellation vertices instead of
 * the entity's true ends; unlike AutoCAD, linetype gaps are visual only.
 *
 * This function walks the index graph, traces open chains from endpoints (vertices
 * whose degree is not two), and emits one {@link AcExOsnapSegment} per chain spanning
 * the first and last vertex positions. Closed loops and isolated edges are handled
 * as separate chains.
 *
 * When the batch has no index buffer, falls back to {@link mergeConnectedSegments}
 * over {@link iterLineSegments} output (non-indexed pair storage).
 *
 * @param batch - Line batch with {@link AcExLineBatch.linePattern} set.
 * @returns Logical WCS segments suitable for endpoint / midpoint / nearest snap.
 * @internal
 */
function extractPatternLineSnapSegments(
  batch: AcExLineBatch
): AcExOsnapSegment[] {
  if (!batch.indices || batch.indices.length < 2) {
    return mergeConnectedSegments(segmentsFromIterable(iterLineSegments(batch)))
  }

  const edges: Array<{ a: number; b: number }> = []

  for (let i = 0; i + 1 < batch.indices.length; i += 2) {
    edges.push({ a: batch.indices[i]!, b: batch.indices[i + 1]! })
  }

  const adjacency = new Map<number, number[]>()
  const addEdge = (a: number, b: number) => {
    if (a === b) return
    let listA = adjacency.get(a)
    if (!listA) {
      listA = []
      adjacency.set(a, listA)
    }
    listA.push(b)
    let listB = adjacency.get(b)
    if (!listB) {
      listB = []
      adjacency.set(b, listB)
    }
    listB.push(a)
  }

  for (const edge of edges) {
    addEdge(edge.a, edge.b)
  }

  const visitedEdges = new Set<string>()
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
  const logical: AcExOsnapSegment[] = []

  const tracePath = (start: number, next: number): number[] => {
    const path = [start]
    let prev = start
    let current = next
    while (true) {
      visitedEdges.add(edgeKey(prev, current))
      path.push(current)
      const neighbors = adjacency.get(current) ?? []
      const candidates = neighbors.filter(
        neighbor =>
          neighbor !== prev && !visitedEdges.has(edgeKey(current, neighbor))
      )
      if (candidates.length !== 1) {
        break
      }
      prev = current
      current = candidates[0]!
    }
    return path
  }

  for (const edge of edges) {
    const key = edgeKey(edge.a, edge.b)
    if (visitedEdges.has(key)) continue

    const degreeA = adjacency.get(edge.a)?.length ?? 0
    const degreeB = adjacency.get(edge.b)?.length ?? 0
    let path: number[]

    if (degreeA !== 2) {
      path = tracePath(edge.a, edge.b)
    } else if (degreeB !== 2) {
      path = tracePath(edge.b, edge.a)
    } else {
      path = tracePath(edge.a, edge.b)
    }

    const first = readBatchVertex(batch, path[0]!)
    const last = readBatchVertex(batch, path[path.length - 1]!)
    logical.push({
      x0: first.x,
      y0: first.y,
      x1: last.x,
      y1: last.y
    })
  }

  return logical.length > 0
    ? logical
    : segmentsFromIterable(iterLineSegments(batch))
}

/**
 * Extracts WCS snap segments from one exported {@link AcExLineBatch}.
 *
 * Chooses the extraction strategy from batch metadata:
 *
 * - **Patterned lines** (`linePattern` present): delegates to
 *   {@link extractPatternLineSnapSegments} so snap follows entity geometry rather
 *   than shader dash boundaries or per-edge tessellation.
 * - **Solid lines**: yields one segment per index pair / vertex pair via
 *   {@link iterLineSegments} without merging.
 *
 * Used by {@link collectBatchSegments} when building the tessellated fallback
 * path of {@link AcExOsnapIndex}.
 *
 * @param batch - One line batch from {@link AcExLayoutSnapshot.lineBatches}.
 * @returns Snap segments in WCS; may be empty when the batch has no geometry.
 */
export function extractLineBatchSnapSegments(
  batch: AcExLineBatch
): AcExOsnapSegment[] {
  if (batch.linePattern) {
    return extractPatternLineSnapSegments(batch)
  }
  return segmentsFromIterable(iterLineSegments(batch))
}

/**
 * Collects all tessellated snap segments from a layout snapshot.
 *
 * Iterates {@link AcExLayoutSnapshot.lineBatches} through
 * {@link extractLineBatchSnapSegments} and appends mesh outline edges from
 * {@link AcExLayoutSnapshot.meshBatches}. The result supplements (or replaces,
 * when no catalog is present) analytic {@link AcExLayoutSnapshot.osnap} primitives
 * inside {@link AcExOsnapIndex}.
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
    segments.push(seg)
    segmentLayers.push(layer)
  }

  for (const batch of layout.lineBatches) {
    for (const seg of extractLineBatchSnapSegments(batch)) {
      pushSegment(seg, batch.layer)
    }
  }
  for (const batch of layout.meshBatches) {
    for (const seg of iterMeshEdges(batch)) {
      pushSegment(seg, batch.layer)
    }
  }
  return { segments, segmentLayers }
}

function* iterMeshEdges(batch: AcExMeshBatch): Generator<AcExOsnapSegment> {
  const [ox, oy] = batch.offset
  const p = batch.positions
  const read = (vi: number): { x: number; y: number } => ({
    x: toWcsCoord(p[vi * 3]!, ox),
    y: toWcsCoord(p[vi * 3 + 1]!, oy)
  })

  function* triangleEdges(
    a: number,
    b: number,
    c: number
  ): Generator<AcExOsnapSegment> {
    const v0 = read(a)
    const v1 = read(b)
    const v2 = read(c)
    yield { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y }
    yield { x0: v1.x, y0: v1.y, x1: v2.x, y1: v2.y }
    yield { x0: v2.x, y0: v2.y, x1: v0.x, y1: v0.y }
  }

  if (batch.indices && batch.indices.length >= 3) {
    for (let i = 0; i + 2 < batch.indices.length; i += 3) {
      yield* triangleEdges(
        batch.indices[i]!,
        batch.indices[i + 1]!,
        batch.indices[i + 2]!
      )
    }
    return
  }
  if (p.length >= 9) {
    yield* triangleEdges(0, 1, 2)
  }
}

/** RBush entry referencing an index in {@link AcExOsnapIndex}'s arrays. @internal */
interface AcExRbushEntry {
  minX: number
  minY: number
  maxX: number
  maxY: number
  index: number
}

/** One pre-indexed discrete snap point (endpoint, center, etc.). @internal */
interface AcExIndexedSnapPoint {
  x: number
  y: number
  mode: AcExOsnapMode
  layer: string
}

/** Source geometry for nearest snap and intersection queries. @internal */
type AcExNearestSource =
  | {
      kind: 'primitive'
      index: number
      layer: string
      geo?: AcExOsnapAcGeCurve
    }
  | { kind: 'segment'; index: number; layer: string }

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
    case 'point':
      return { minX: prim.x, minY: prim.y, maxX: prim.x, maxY: prim.y }
  }
}

/**
 * Spatial index for object snap in the offline HTML viewer.
 *
 * Discrete snap points (endpoint, midpoint, center, quadrant, node) are indexed
 * in an RBush tree at {@link AcExOsnapIndex.rebuild} so pointer queries avoid
 * rebuilding `AcGe*` curves. Nearest snap runs only when no discrete candidate
 * lies within the aperture.
 */
export class AcExOsnapIndex {
  private segments: AcExOsnapSegment[] = []
  private segmentLayers: string[] = []
  private primitives: AcExOsnapPrimitive[] = []
  private snapPoints: AcExIndexedSnapPoint[] = []
  private snapPointTree = new RBush<AcExRbushEntry>()
  private nearestSources: AcExNearestSource[] = []
  private nearestTree = new RBush<AcExRbushEntry>()
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
   * Builds the snap index from the active layout snapshot.
   *
   * Indexes all analytic and tessellated geometry once. Layer visibility is
   * applied at query time via {@link setLayerHidden}, {@link showAllLayers}, and
   * {@link hideAllLayers} so toggling many layers stays O(1).
   *
   * @param layout - Active layout snapshot (batches + optional {@link AcExLayoutSnapshot.osnap}).
   */
  rebuild(layout: AcExLayoutSnapshot): void {
    const catalog = layout.osnap
    this.primitives = catalog?.primitives ?? []
    if (this.primitives.length > 0) {
      this.segments = []
      this.segmentLayers = []
    } else {
      const collected = collectBatchSegments(layout)
      this.segments = collected.segments
      this.segmentLayers = collected.segmentLayers
    }

    this.snapPoints = []
    this.snapPointTree.clear()
    this.nearestSources = []
    this.nearestTree.clear()
    this.hiddenLayers.clear()

    const discreteModes = new Set(this.modes)
    discreteModes.delete('nearest')
    discreteModes.delete('intersection')
    const wantsNearest = this.modes.has('nearest')
    const wantsIntersection = this.modes.has('intersection')
    const wantsGeometryTree = wantsNearest || wantsIntersection

    for (let i = 0; i < this.primitives.length; i++) {
      const prim = this.primitives[i]!
      const geo = wantsNearest ? primitiveToAcGeCurve(prim) : undefined
      if (wantsGeometryTree && prim.kind !== 'point') {
        this.nearestSources.push({
          kind: 'primitive',
          index: i,
          layer: prim.layer,
          geo
        })
      }
      if (discreteModes.size > 0) {
        for (const candidate of collectPrimitiveDiscreteSnapCandidates(
          prim,
          discreteModes,
          geo
        )) {
          this.snapPoints.push({
            x: candidate.x,
            y: candidate.y,
            mode: candidate.mode,
            layer: prim.layer
          })
        }
      }
    }

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i]!
      const layer = this.segmentLayers[i]!
      if (wantsGeometryTree) {
        this.nearestSources.push({ kind: 'segment', index: i, layer })
      }
      if (discreteModes.has('endpoint')) {
        this.snapPoints.push(
          { x: seg.x0, y: seg.y0, mode: 'endpoint', layer },
          { x: seg.x1, y: seg.y1, mode: 'endpoint', layer }
        )
      }
      if (discreteModes.has('midpoint')) {
        this.snapPoints.push({
          x: (seg.x0 + seg.x1) * 0.5,
          y: (seg.y0 + seg.y1) * 0.5,
          mode: 'midpoint',
          layer
        })
      }
    }

    if (this.snapPoints.length === 0 && this.nearestSources.length === 0) {
      return
    }

    const snapEntries: AcExRbushEntry[] = new Array(this.snapPoints.length)
    for (let i = 0; i < this.snapPoints.length; i++) {
      const point = this.snapPoints[i]!
      snapEntries[i] = {
        minX: point.x,
        minY: point.y,
        maxX: point.x,
        maxY: point.y,
        index: i
      }
    }
    if (snapEntries.length > 0) {
      this.snapPointTree.load(snapEntries)
    }

    const nearestEntries: AcExRbushEntry[] = new Array(
      this.nearestSources.length
    )
    for (let i = 0; i < this.nearestSources.length; i++) {
      const source = this.nearestSources[i]!
      const b =
        source.kind === 'primitive'
          ? primitiveBounds(this.primitives[source.index]!)
          : segmentBounds(this.segments[source.index]!)
      nearestEntries[i] = { ...b, index: i }
    }
    if (nearestEntries.length > 0) {
      this.nearestTree.load(nearestEntries)
    }
  }

  /**
   * Finds the best snap point near the cursor in WCS.
   *
   * Queries analytic {@link AcExLayoutSnapshot.osnap} primitives first; only when
   * no primitive candidate lies within the aperture does the search fall back to
   * tessellated {@link AcExLineBatch} / mesh segments.
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
    if (this.snapPoints.length === 0 && this.nearestSources.length === 0) {
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
    if (this.nearestSources.length === 0) return undefined

    const box = searchBox(px, py, threshold)
    const hits = this.nearestTree.search(box)
    if (hits.length === 0) return undefined

    const threshSq = threshold * threshold
    const extent = Math.max(box.maxX - box.minX, box.maxY - box.minY, 1)
    const paramTol = intersectionToleranceForExtent(extent)
    const geomTol = intersectionGeomToleranceForSnap(extent, threshold)

    const primIndices: number[] = []
    const segIndices: number[] = []
    const primSeen = new Set<number>()
    const segSeen = new Set<number>()

    for (const hit of hits) {
      const source = this.nearestSources[hit.index]!
      if (this.hiddenLayers.has(source.layer)) continue

      if (source.kind === 'primitive') {
        const prim = this.primitives[source.index]!
        if (!isIntersectionCapablePrimitive(prim)) continue
        if (primSeen.has(source.index)) continue
        if (primIndices.length >= ACEX_MAX_INTERSECTION_SOURCES) continue
        primSeen.add(source.index)
        primIndices.push(source.index)
        continue
      }

      if (segSeen.has(source.index)) continue
      if (segIndices.length >= ACEX_MAX_INTERSECTION_SOURCES) continue
      segSeen.add(source.index)
      segIndices.push(source.index)
    }

    let bestDistSq = threshSq
    let best: AcExOsnapPoint | undefined

    for (let i = 0; i < primIndices.length; i++) {
      const indexA = primIndices[i]!
      const primA = this.primitives[indexA]!
      for (let j = i + 1; j < primIndices.length; j++) {
        const indexB = primIndices[j]!
        const primB = this.primitives[indexB]!
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

    return best
  }

  private findDiscreteSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    if (this.snapPoints.length === 0) return undefined

    const threshSq = threshold * threshold
    const hits = this.snapPointTree.search(searchBox(px, py, threshold))

    let bestPriority = Number.MAX_VALUE
    let bestDistSq = Number.MAX_VALUE
    let best: AcExOsnapPoint | undefined

    for (const hit of hits) {
      const point = this.snapPoints[hit.index]!
      if (!this.modes.has(point.mode)) continue
      if (this.hiddenLayers.has(point.layer)) continue

      const d2 = distSq(px, py, point.x, point.y)
      if (d2 > threshSq) continue
      const priority = modePriority(point.mode)
      if (
        priority < bestPriority ||
        (priority === bestPriority && d2 < bestDistSq)
      ) {
        bestPriority = priority
        bestDistSq = d2
        best = { x: point.x, y: point.y, mode: point.mode }
      }
    }

    return best
  }

  private findNearestSnap(
    px: number,
    py: number,
    threshold: number
  ): AcExOsnapPoint | undefined {
    if (this.nearestSources.length === 0) return undefined

    const threshSq = threshold * threshold
    const hits = this.nearestTree.search(searchBox(px, py, threshold))

    let bestDistSq = Number.MAX_VALUE
    let best: AcExOsnapPoint | undefined

    for (const hit of hits) {
      if (
        distSqToBounds(px, py, hit.minX, hit.minY, hit.maxX, hit.maxY) >
        threshSq
      ) {
        continue
      }

      const source = this.nearestSources[hit.index]!
      if (this.hiddenLayers.has(source.layer)) continue

      if (source.kind === 'primitive') {
        const prim = this.primitives[source.index]!
        const geo = source.geo ?? primitiveToAcGeCurve(prim)
        const nearest = collectPrimitiveNearestSnapCandidate(prim, px, py, geo)
        if (!nearest) continue
        const d2 = distSq(px, py, nearest.x, nearest.y)
        if (d2 <= threshSq && d2 < bestDistSq) {
          bestDistSq = d2
          best = nearest
        }
        continue
      }

      const near = closestPointOnSegment(px, py, this.segments[source.index]!)
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
 * @returns `{ minX, minY, maxX, maxY }` used by the nearest-source RBush in
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
export function acExOsnapModeToMarkerType(
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
