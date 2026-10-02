import { AcGeBox2d } from '@mlightcad/data-model'

import {
  type AcTrClusterBox,
  unionDominantCluster,
  unionDominantClusterAsync
} from './AcTrExtentCluster'
import { isFiniteSpatialBBox } from './AcTrGroupWcsBboxAssert'
import { AcTrWorkSlice } from './AcTrWorkSlice'

/**
 * One finite AABB used as a candidate for intelligent zoom-to-fit.
 */
export interface AcTrExtentEntry {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Dominant-cluster fit from entity/spatial AABBs.
 *
 * Outlier-scale boxes (corrupt far entities) are dropped, then far-center
 * boxes are peeled, then the majority cluster is unioned — same heuristic as
 * the HTML export offline viewer's smart extents.
 *
 * @param entries - Candidate boxes (typically spatial-index leaves).
 * @returns Clustered extents, or `undefined` when empty after filtering.
 */
export function computeIntelligentExtents(
  entries: ReadonlyArray<AcTrExtentEntry>
): AcGeBox2d | undefined {
  const boxes = buildClusterCandidateBoxes(entries)
  if (!boxes) {
    return undefined
  }
  const peeled = peelFarCenterBoxes(boxes)
  const clustered = unionDominantCluster(peeled.length > 0 ? peeled : boxes)
  if (!clustered) {
    return undefined
  }
  return new AcGeBox2d(
    { x: clustered.minX, y: clustered.minY },
    { x: clustered.maxX, y: clustered.maxY }
  )
}

/**
 * Async variant of {@link computeIntelligentExtents} that periodically yields
 * to the browser so large drawings do not freeze the tab.
 *
 * Produces the same extents as the synchronous version for the same input.
 */
export async function computeIntelligentExtentsAsync(
  entries: ReadonlyArray<AcTrExtentEntry>,
  work: AcTrWorkSlice = new AcTrWorkSlice()
): Promise<AcGeBox2d | undefined> {
  const boxes = await buildClusterCandidateBoxesAsync(entries, work)
  if (!boxes) {
    return undefined
  }
  await work.yieldNow()
  const peeled = await peelFarCenterBoxesAsync(boxes, work)
  await work.yieldNow()
  const clustered = await unionDominantClusterAsync(
    peeled.length > 0 ? peeled : boxes,
    work
  )
  if (!clustered) {
    return undefined
  }
  return new AcGeBox2d(
    { x: clustered.minX, y: clustered.minY },
    { x: clustered.maxX, y: clustered.maxY }
  )
}

/**
 * Filters finite boxes and drops outlier-scale spans (sync).
 */
function buildClusterCandidateBoxes(
  entries: ReadonlyArray<AcTrExtentEntry>
): AcTrClusterBox[] | undefined {
  const finite = entries.filter(isFiniteSpatialBBox)
  if (finite.length === 0) {
    return undefined
  }

  const sizes = finite.map(entry =>
    Math.max(entry.maxX - entry.minX, entry.maxY - entry.minY, 1e-9)
  )
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const hugeSpan = Math.max(medianSize * 50, 1e10)

  const boxes: AcTrClusterBox[] = []
  for (const entry of finite) {
    const span = Math.max(entry.maxX - entry.minX, entry.maxY - entry.minY)
    if (span >= hugeSpan) {
      // Drop the poisoned AABB so it cannot union into the fit.
      continue
    }
    boxes.push(entry)
  }
  return boxes.length > 0 ? boxes : undefined
}

/**
 * Same filtering as {@link buildClusterCandidateBoxes}, with cooperative yields.
 */
async function buildClusterCandidateBoxesAsync(
  entries: ReadonlyArray<AcTrExtentEntry>,
  work: AcTrWorkSlice
): Promise<AcTrClusterBox[] | undefined> {
  const finite: AcTrExtentEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    if (isFiniteSpatialBBox(entry)) {
      finite.push(entry)
    }
    if ((i & 0x7ff) === 0x7ff) {
      await work.maybeYield()
    }
  }
  if (finite.length === 0) {
    return undefined
  }

  await work.maybeYield()
  const sizes = new Array<number>(finite.length)
  for (let i = 0; i < finite.length; i++) {
    const entry = finite[i]!
    sizes[i] = Math.max(
      entry.maxX - entry.minX,
      entry.maxY - entry.minY,
      1e-9
    )
    if ((i & 0x7ff) === 0x7ff) {
      await work.maybeYield()
    }
  }
  sizes.sort((a, b) => a - b)
  await work.maybeYield()
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const hugeSpan = Math.max(medianSize * 50, 1e10)

  const boxes: AcTrClusterBox[] = []
  for (let i = 0; i < finite.length; i++) {
    const entry = finite[i]!
    const span = Math.max(entry.maxX - entry.minX, entry.maxY - entry.minY)
    if (span < hugeSpan) {
      boxes.push(entry)
    }
    if ((i & 0x7ff) === 0x7ff) {
      await work.maybeYield()
    }
  }
  return boxes.length > 0 ? boxes : undefined
}

/**
 * Drops boxes whose center sits outlier-scale away from the median center.
 */
function peelFarCenterBoxes(boxes: AcTrClusterBox[]): AcTrClusterBox[] {
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

/**
 * Async variant of {@link peelFarCenterBoxes} with cooperative yields.
 * Same filtering result as the sync path for the same input.
 */
async function peelFarCenterBoxesAsync(
  boxes: AcTrClusterBox[],
  work: AcTrWorkSlice
): Promise<AcTrClusterBox[]> {
  if (boxes.length < 2) {
    return boxes
  }

  const centers: Array<{
    x: number
    y: number
    box: AcTrClusterBox
  }> = []
  const xs = new Array<number>(boxes.length)
  const ys = new Array<number>(boxes.length)
  const sizes = new Array<number>(boxes.length)

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!
    const x = (box.minX + box.maxX) / 2
    const y = (box.minY + box.maxY) / 2
    centers.push({ x, y, box })
    xs[i] = x
    ys[i] = y
    sizes[i] = Math.max(box.maxX - box.minX, box.maxY - box.minY, 1e-9)
    if ((i & 0x7ff) === 0x7ff) {
      await work.maybeYield()
    }
  }

  await work.maybeYield()
  xs.sort((a, b) => a - b)
  await work.maybeYield()
  ys.sort((a, b) => a - b)
  await work.maybeYield()
  sizes.sort((a, b) => a - b)
  await work.maybeYield()

  const medX = xs[Math.floor(xs.length / 2)]!
  const medY = ys[Math.floor(ys.length / 2)]!
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const limit = Math.max(medianSize * 50, 1e10)

  const kept: AcTrClusterBox[] = []
  for (let i = 0; i < centers.length; i++) {
    const c = centers[i]!
    if (Math.hypot(c.x - medX, c.y - medY) <= limit) {
      kept.push(c.box)
    }
    if ((i & 0x7ff) === 0x7ff) {
      await work.maybeYield()
    }
  }
  return kept.length > 0 ? kept : boxes
}
