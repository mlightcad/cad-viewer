import { collectPrimitiveSnapCandidates, distSq } from './AcExOsnapGeometry'
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
      return 0
    case 'quadrant':
    case 'focus':
    case 'control':
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

function* iterLineSegments(batch: AcExLineBatch): Generator<AcExOsnapSegment> {
  const [ox, oy] = batch.offset
  const p = batch.positions
  if (batch.indices && batch.indices.length >= 2) {
    for (let i = 0; i + 1 < batch.indices.length; i += 2) {
      const i0 = batch.indices[i]! * 3
      const i1 = batch.indices[i + 1]! * 3
      yield {
        x0: p[i0]! + ox,
        y0: p[i0 + 1]! + oy,
        x1: p[i1]! + ox,
        y1: p[i1 + 1]! + oy
      }
    }
    return
  }
  for (let i = 0; i + 5 < p.length; i += 6) {
    yield {
      x0: p[i]! + ox,
      y0: p[i + 1]! + oy,
      x1: p[i + 3]! + ox,
      y1: p[i + 4]! + oy
    }
  }
}

function* iterMeshEdges(batch: AcExMeshBatch): Generator<AcExOsnapSegment> {
  const [ox, oy] = batch.offset
  const p = batch.positions
  const read = (vi: number): { x: number; y: number } => ({
    x: p[vi * 3]! + ox,
    y: p[vi * 3 + 1]! + oy
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

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`
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
 * On {@link AcExOsnapIndex.rebuild}, if {@link AcExLayoutSnapshot.osnap} contains
 * primitives, snapping is computed from analytic curves via
 * {@link collectPrimitiveSnapCandidates}. Otherwise the index falls back to
 * line segments extracted from tessellated {@link AcExLineBatch} and mesh edges
 * (legacy snapshots).
 */
export class AcExOsnapIndex {
  private segments: AcExOsnapSegment[] = []
  private primitives: AcExOsnapPrimitive[] = []
  private usePrimitives = false
  private grid = new Map<string, number[]>()
  private cellSize = 1
  private modes: Set<AcExOsnapMode>

  /**
   * @param modes - Enabled snap modes; defaults to {@link ACEX_DEFAULT_OSNAP_MODES}.
   */
  constructor(modes: Iterable<AcExOsnapMode> = ACEX_DEFAULT_OSNAP_MODES) {
    this.modes = new Set(modes)
  }

  /**
   * Rebuilds the snap index from the active layout snapshot.
   *
   * When `layout.osnap.primitives` is non-empty, only those WCS primitives are
   * indexed (curves are not approximated from render batches). When absent or
   * empty, tessellated `lineBatches` and `meshBatches` are used instead.
   *
   * @param layout - Active layout snapshot (batches + optional {@link AcExLayoutSnapshot.osnap}).
   * @param isLayerVisible - When `false`, primitives/batches on that layer are excluded.
   */
  rebuild(
    layout: AcExLayoutSnapshot,
    isLayerVisible: (layerName: string) => boolean
  ): void {
    const catalog = layout.osnap
    if (catalog && catalog.primitives.length > 0) {
      this.usePrimitives = true
      this.primitives = catalog.primitives.filter(p => isLayerVisible(p.layer))
      this.segments = []
    } else {
      this.usePrimitives = false
      this.primitives = []
      const segments: AcExOsnapSegment[] = []
      for (const batch of layout.lineBatches) {
        if (!isLayerVisible(batch.layer)) continue
        for (const seg of iterLineSegments(batch)) {
          segments.push(seg)
        }
      }
      for (const batch of layout.meshBatches) {
        if (!isLayerVisible(batch.layer)) continue
        for (const seg of iterMeshEdges(batch)) {
          segments.push(seg)
        }
      }
      this.segments = segments
    }

    this.grid.clear()
    const items = this.usePrimitives ? this.primitives : this.segments
    if (items.length === 0) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    if (this.usePrimitives) {
      for (const prim of this.primitives) {
        const b = primitiveBounds(prim)
        minX = Math.min(minX, b.minX)
        minY = Math.min(minY, b.minY)
        maxX = Math.max(maxX, b.maxX)
        maxY = Math.max(maxY, b.maxY)
      }
    } else {
      for (const seg of this.segments) {
        minX = Math.min(minX, seg.x0, seg.x1)
        minY = Math.min(minY, seg.y0, seg.y1)
        maxX = Math.max(maxX, seg.x0, seg.x1)
        maxY = Math.max(maxY, seg.y0, seg.y1)
      }
    }

    const span = Math.max(maxX - minX, maxY - minY, 1)
    this.cellSize = Math.max(span / 200, 1e-6)

    for (let i = 0; i < items.length; i++) {
      let segMinX: number
      let segMinY: number
      let segMaxX: number
      let segMaxY: number
      if (this.usePrimitives) {
        const b = primitiveBounds(this.primitives[i]!)
        segMinX = b.minX
        segMinY = b.minY
        segMaxX = b.maxX
        segMaxY = b.maxY
      } else {
        const seg = this.segments[i]!
        segMinX = Math.min(seg.x0, seg.x1)
        segMaxX = Math.max(seg.x0, seg.x1)
        segMinY = Math.min(seg.y0, seg.y1)
        segMaxY = Math.max(seg.y0, seg.y1)
      }
      const c0x = Math.floor(segMinX / this.cellSize)
      const c1x = Math.floor(segMaxX / this.cellSize)
      const c0y = Math.floor(segMinY / this.cellSize)
      const c1y = Math.floor(segMaxY / this.cellSize)
      for (let cx = c0x; cx <= c1x; cx++) {
        for (let cy = c0y; cy <= c1y; cy++) {
          const key = cellKey(cx, cy)
          let list = this.grid.get(key)
          if (!list) {
            list = []
            this.grid.set(key, list)
          }
          list.push(i)
        }
      }
    }
  }

  /**
   * Finds the best snap point near the cursor in WCS.
   *
   * Uses AutoCAD-style mode priority: endpoint / midpoint / center beat
   * quadrant / focus / control / node, which beat nearest. Within the same
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
    const items = this.usePrimitives ? this.primitives : this.segments
    if (items.length === 0 || threshold <= 0) return undefined

    const threshSq = threshold * threshold
    const cx = Math.floor(px / this.cellSize)
    const cy = Math.floor(py / this.cellSize)
    const radiusCells = Math.max(1, Math.ceil(threshold / this.cellSize))

    const seen = new Set<number>()
    let bestPriority = Number.MAX_VALUE
    let bestDistSq = Number.MAX_VALUE
    let best: AcExOsnapPoint | undefined

    const consider = (x: number, y: number, mode: AcExOsnapMode) => {
      if (!this.modes.has(mode)) return
      const d2 = distSq(px, py, x, y)
      if (d2 > threshSq) return
      const priority = modePriority(mode)
      if (
        priority < bestPriority ||
        (priority === bestPriority && d2 < bestDistSq)
      ) {
        bestPriority = priority
        bestDistSq = d2
        best = { x, y, mode }
      }
    }

    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const list = this.grid.get(cellKey(cx + dx, cy + dy))
        if (!list) continue
        for (const index of list) {
          if (seen.has(index)) continue
          seen.add(index)

          if (this.usePrimitives) {
            const prim = this.primitives[index]!
            for (const candidate of collectPrimitiveSnapCandidates(
              prim,
              px,
              py,
              this.modes
            )) {
              consider(candidate.x, candidate.y, candidate.mode)
            }
          } else {
            const seg = this.segments[index]!
            if (this.modes.has('endpoint')) {
              consider(seg.x0, seg.y0, 'endpoint')
              consider(seg.x1, seg.y1, 'endpoint')
            }
            if (this.modes.has('midpoint')) {
              consider(
                (seg.x0 + seg.x1) * 0.5,
                (seg.y0 + seg.y1) * 0.5,
                'midpoint'
              )
            }
            if (this.modes.has('nearest')) {
              const near = closestPointOnSegment(px, py, seg)
              if (near.distSq <= threshSq) {
                consider(near.x, near.y, 'nearest')
              }
            }
          }
        }
      }
    }

    return best
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
): 'rect' | 'triangle' | 'x' | 'circle' | 'diamond' {
  switch (mode) {
    case 'endpoint':
      return 'rect'
    case 'midpoint':
      return 'triangle'
    case 'center':
      return 'circle'
    case 'quadrant':
    case 'focus':
      return 'diamond'
    case 'nearest':
      return 'x'
    case 'control':
    case 'node':
    default:
      return 'rect'
  }
}
