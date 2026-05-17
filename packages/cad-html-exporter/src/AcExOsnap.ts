import type {
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch
} from './AcExSnapshotTypes'

/** Object snap modes supported by the offline HTML viewer. */
export type AcExOsnapMode = 'endpoint' | 'midpoint' | 'nearest'

/** A snap candidate in world coordinates (WCS, XY plane). */
export interface AcExOsnapPoint {
  x: number
  y: number
  mode: AcExOsnapMode
}

/** Default snap modes (matches common AutoCAD defaults for measure workflows). */
export const ACEX_DEFAULT_OSNAP_MODES: readonly AcExOsnapMode[] = [
  'endpoint',
  'midpoint',
  'nearest'
] as const

/**
 * One line segment in WCS (XY) indexed for object snap.
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
      return 0
    case 'nearest':
      return 2
    default:
      return 1
  }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
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

/**
 * Geometry index for object snap in the offline HTML viewer.
 * Built from exported line/mesh batches; respects per-layer visibility.
 */
export class AcExOsnapIndex {
  private segments: AcExOsnapSegment[] = []
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
   * Rebuilds the segment index from layout batches.
   *
   * @param layout - Active layout geometry.
   * @param isLayerVisible - Returns whether a layer participates in snapping.
   */
  rebuild(
    layout: AcExLayoutSnapshot,
    isLayerVisible: (layerName: string) => boolean
  ): void {
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
    this.grid.clear()

    if (segments.length === 0) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const seg of segments) {
      minX = Math.min(minX, seg.x0, seg.x1)
      minY = Math.min(minY, seg.y0, seg.y1)
      maxX = Math.max(maxX, seg.x0, seg.x1)
      maxY = Math.max(maxY, seg.y0, seg.y1)
    }
    const span = Math.max(maxX - minX, maxY - minY, 1)
    this.cellSize = Math.max(span / 200, 1e-6)

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      const segMinX = Math.min(seg.x0, seg.x1)
      const segMaxX = Math.max(seg.x0, seg.x1)
      const segMinY = Math.min(seg.y0, seg.y1)
      const segMaxY = Math.max(seg.y0, seg.y1)
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
   * Finds the best snap point near the cursor, using AutoCAD-style mode priority.
   *
   * @param px - Cursor WCS X.
   * @param py - Cursor WCS Y.
   * @param threshold - Maximum distance in drawing units.
   */
  findSnap(px: number, py: number, threshold: number): AcExOsnapPoint | undefined {
    if (this.segments.length === 0 || threshold <= 0) return undefined

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
        for (const segIndex of list) {
          if (seen.has(segIndex)) continue
          seen.add(segIndex)
          const seg = this.segments[segIndex]!

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

    return best
  }
}

/** Maps a snap mode to the marker shape used in the offline viewer. */
export function acExOsnapModeToMarkerType(
  mode: AcExOsnapMode
): 'rect' | 'triangle' | 'x' {
  switch (mode) {
    case 'endpoint':
      return 'rect'
    case 'midpoint':
      return 'triangle'
    case 'nearest':
      return 'x'
    default:
      return 'rect'
  }
}
