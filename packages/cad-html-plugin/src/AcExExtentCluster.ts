import type { AcExExtents } from './AcExSnapshotTypes'

/**
 * Axis-aligned box used while peeling outlier clusters for intelligent fit.
 */
export interface AcExClusterBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Peels far outlier boxes along one axis, keeping the denser majority side.
 *
 * Mirrors the PDF exporter's dominant-cluster heuristic: a gap must exceed
 * both a fraction of the full span and an outlier threshold based on typical
 * nearest-neighbor spacing inside the majority side. Small samples (< 8) are
 * left unchanged so sparse drawings are not over-pruned.
 *
 * @param boxes - Candidate boxes (mutated only via returned subset).
 * @param axis - Projection axis for the gap search.
 * @returns Majority-side boxes, or the input when no outlier-scale gap exists.
 */
export function splitDominantCluster(
  boxes: AcExClusterBox[],
  axis: 'x' | 'y'
): AcExClusterBox[] {
  if (boxes.length < 8) {
    return boxes
  }
  const keyed = boxes
    .map(box => ({
      value: axis === 'x' ? (box.minX + box.maxX) / 2 : (box.minY + box.maxY) / 2,
      box
    }))
    .sort((a, b) => a.value - b.value)
  const span = keyed[keyed.length - 1]!.value - keyed[0]!.value
  if (!(span > 0)) {
    return boxes
  }
  let bestGap = 0
  let bestIndex = 0
  for (let i = 1; i < keyed.length; i++) {
    const gap = keyed[i]!.value - keyed[i - 1]!.value
    if (gap > bestGap) {
      bestGap = gap
      bestIndex = i
    }
  }
  if (bestGap < span * 0.2) {
    return boxes
  }
  const left = keyed.slice(0, bestIndex)
  const right = keyed.slice(bestIndex)
  const majority = left.length >= right.length ? left : right
  const sizes = boxes.map(box =>
    Math.max(box.maxX - box.minX, box.maxY - box.minY, 1e-9)
  )
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const majNnGaps: number[] = []
  for (let i = 1; i < majority.length; i++) {
    majNnGaps.push(majority[i]!.value - majority[i - 1]!.value)
  }
  majNnGaps.sort((a, b) => a - b)
  const typicalGap =
    majNnGaps.length > 0
      ? majNnGaps[Math.floor(majNnGaps.length / 2)] || medianSize
      : medianSize
  const outlierGap = Math.max(typicalGap * 10, medianSize * 20)
  if (bestGap < outlierGap) {
    return boxes
  }
  return majority.map(item => item.box)
}

/**
 * Unions boxes after iteratively peeling dominant-cluster outliers on X then Y.
 *
 * @param boxes - Finite, non-empty candidate boxes.
 * @returns Union of the surviving cluster, or `null` when empty.
 */
export function unionDominantCluster(
  boxes: AcExClusterBox[]
): AcExExtents | null {
  if (boxes.length === 0) {
    return null
  }
  const fallback = unionBoxes(boxes)
  if (boxes.length < 8) {
    return fallback
  }
  let working = boxes.slice()
  let previous = -1
  while (working.length !== previous) {
    previous = working.length
    working = splitDominantCluster(working, 'x')
    working = splitDominantCluster(working, 'y')
  }
  return unionBoxes(working) ?? fallback
}

function unionBoxes(boxes: AcExClusterBox[]): AcExExtents | null {
  if (boxes.length === 0) {
    return null
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const box of boxes) {
    if (box.minX < minX) minX = box.minX
    if (box.minY < minY) minY = box.minY
    if (box.maxX > maxX) maxX = box.maxX
    if (box.maxY > maxY) maxY = box.maxY
  }
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }
  return { minX, minY, maxX, maxY }
}
