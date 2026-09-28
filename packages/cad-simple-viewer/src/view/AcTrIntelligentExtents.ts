import { AcGeBox2d } from '@mlightcad/data-model'

import {
  type AcTrClusterBox,
  unionDominantCluster
} from './AcTrExtentCluster'
import { isFiniteSpatialBBox } from './AcTrGroupWcsBboxAssert'

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
  if (boxes.length === 0) {
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
