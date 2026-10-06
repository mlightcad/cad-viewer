import { AcGeBox2d } from '@mlightcad/data-model'

/**
 * Absolute coordinate / span ceiling for SVG framing.
 *
 * Matches the zoom-to-fit / HTML-export floor used with `medianSize * 50`.
 * Values at or above this are treated as corrupt (RAY theoretical extents,
 * stale header leftovers, bad transforms) and never contribute to `viewBox`.
 */
const ABSURD_SVG_EXTENT = 1e10

interface SvgClusterBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function isAbsurdClusterBox(box: SvgClusterBox): boolean {
  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY)
  if (span >= ABSURD_SVG_EXTENT) {
    return true
  }
  return (
    Math.abs(box.minX) >= ABSURD_SVG_EXTENT ||
    Math.abs(box.minY) >= ABSURD_SVG_EXTENT ||
    Math.abs(box.maxX) >= ABSURD_SVG_EXTENT ||
    Math.abs(box.maxY) >= ABSURD_SVG_EXTENT
  )
}

/**
 * True when a 2D box has finite corners and is non-empty.
 *
 * Empty CAD boxes often carry `±Infinity` placeholders; those must not
 * participate in SVG `viewBox` unions.
 */
export function isUsableSvgBox(box: AcGeBox2d): boolean {
  if (box.isEmpty()) {
    return false
  }
  return (
    Number.isFinite(box.min.x) &&
    Number.isFinite(box.min.y) &&
    Number.isFinite(box.max.x) &&
    Number.isFinite(box.max.y)
  )
}

/**
 * Unions entity AABBs into a viewBox-ready box, dropping non-finite and
 * outlier-scale extents (same heuristic as zoom-to-fit / HTML export).
 *
 * A single corrupt/stale entity box (e.g. ~1e149) must not dominate the SVG
 * root `viewBox` when path coordinates remain finite (#690).
 */
export function computeSvgViewBox(boxes: ReadonlyArray<AcGeBox2d>): AcGeBox2d {
  const finite: SvgClusterBox[] = []
  for (const box of boxes) {
    if (!isUsableSvgBox(box)) {
      continue
    }
    finite.push({
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y
    })
  }
  if (finite.length === 0) {
    return new AcGeBox2d()
  }

  // Hard-reject absurd boxes first so one ~1e149 AABB cannot inflate the
  // median size and defeat the relative outlier filter.
  const sane = finite.filter(entry => !isAbsurdClusterBox(entry))
  if (sane.length === 0) {
    return new AcGeBox2d()
  }

  const sizes = sane.map(entry =>
    Math.max(entry.maxX - entry.minX, entry.maxY - entry.minY, 1e-9)
  )
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const hugeSpan = Math.max(medianSize * 50, ABSURD_SVG_EXTENT)

  const candidates: SvgClusterBox[] = []
  for (const entry of sane) {
    const span = Math.max(entry.maxX - entry.minX, entry.maxY - entry.minY)
    if (span < hugeSpan) {
      candidates.push(entry)
    }
  }
  if (candidates.length === 0) {
    return new AcGeBox2d()
  }

  const peeled = peelFarCenterBoxes(candidates)
  const clustered = unionDominantCluster(
    peeled.length > 0 ? peeled : candidates
  )
  if (!clustered) {
    return new AcGeBox2d()
  }
  return new AcGeBox2d(
    { x: clustered.minX, y: clustered.minY },
    { x: clustered.maxX, y: clustered.maxY }
  )
}

/**
 * Drops boxes whose center sits outlier-scale away from the median center.
 *
 * Catches tiny corrupt entities (near-zero AABB at 1e75) that the span-based
 * filter misses.
 */
function peelFarCenterBoxes(boxes: SvgClusterBox[]): SvgClusterBox[] {
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
  const limit = Math.max(medianSize * 50, ABSURD_SVG_EXTENT)
  const kept = centers.filter(c => Math.hypot(c.x - medX, c.y - medY) <= limit)
  return kept.length > 0 ? kept.map(c => c.box) : boxes
}

function splitDominantCluster(
  boxes: SvgClusterBox[],
  axis: 'x' | 'y'
): SvgClusterBox[] {
  if (boxes.length < 8) {
    return boxes
  }
  const keyed = boxes
    .map(box => ({
      value:
        axis === 'x' ? (box.minX + box.maxX) / 2 : (box.minY + box.maxY) / 2,
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

function unionBoxes(boxes: SvgClusterBox[]): SvgClusterBox | null {
  if (boxes.length === 0) {
    return null
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const box of boxes) {
    minX = Math.min(minX, box.minX)
    minY = Math.min(minY, box.minY)
    maxX = Math.max(maxX, box.maxX)
    maxY = Math.max(maxY, box.maxY)
  }
  return { minX, minY, maxX, maxY }
}

function unionDominantCluster(boxes: SvgClusterBox[]): SvgClusterBox | null {
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
