import { AcGePoint2d, AcGePoint2dLike, log } from '@mlightcad/data-model'
import { GeometryEpsilon, PolyBool } from '@velipso/polybool'

/**
 * Returns whether two 2-D points are exactly equal.
 */
function isSamePoint2d(a: AcGePoint2dLike, b: AcGePoint2dLike): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Orientation of `c` relative to the directed line `a`→`b`.
 */
function orientation2d(
  a: AcGePoint2dLike,
  b: AcGePoint2dLike,
  c: AcGePoint2dLike
): number {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

/**
 * Returns whether segments `ab` and `cd` cross in their interiors.
 */
function segmentsProperlyIntersect(
  a: AcGePoint2dLike,
  b: AcGePoint2dLike,
  c: AcGePoint2dLike,
  d: AcGePoint2dLike
): boolean {
  return (
    orientation2d(a, b, c) !== orientation2d(a, b, d) &&
    orientation2d(c, d, a) !== orientation2d(c, d, b)
  )
}

/**
 * Open ring without a duplicated closing vertex.
 */
function openRing(points: AcGePoint2dLike[]): AcGePoint2dLike[] {
  const ring: AcGePoint2dLike[] = []
  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      (ring.length > 0 && isSamePoint2d(ring[ring.length - 1], point))
    ) {
      continue
    }
    ring.push(point)
  }
  while (ring.length > 1 && isSamePoint2d(ring[0], ring[ring.length - 1])) {
    ring.pop()
  }
  return ring
}

/**
 * Returns whether the closed loop crosses itself.
 *
 * Hatch edge paths from DWG often meet at T-junctions without inserting a
 * shared vertex, so one long edge properly intersects another. Earcut then
 * invents triangles that cover the concave exterior (pattern lines "leak"
 * past the boundary).
 */
export function hatchLoopHasSelfIntersection(
  points: AcGePoint2dLike[]
): boolean {
  const ring = openRing(points)
  const count = ring.length
  if (count < 4) {
    return false
  }
  for (let i = 0; i < count; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % count]
    for (let j = i + 1; j < count; j++) {
      if ((j + 1) % count === i || j === (i + 1) % count) {
        continue
      }
      const c = ring[j]
      const d = ring[(j + 1) % count]
      if (segmentsProperlyIntersect(a, b, c, d)) {
        return true
      }
    }
  }
  return false
}

function polyboolEpsilonFor(points: AcGePoint2dLike[]): number {
  const first = points[0]
  if (
    first &&
    typeof (first as AcGePoint2d).relativeEps === 'function'
  ) {
    return Math.min((first as AcGePoint2d).relativeEps(), 1e-6)
  }
  const scale = Math.max(
    ...points.flatMap(p => [Math.abs(p.x), Math.abs(p.y)]),
    1
  )
  return Math.min(scale * 1e-9, 1e-6)
}

/**
 * Decomposes a self-intersecting hatch loop into simple even-odd regions.
 *
 * Uses PolyBool's segment rebuild (`segments` → `polygon`), which splits at
 * crossings and emits non-self-intersecting rings earcut can triangulate.
 * Loops that are already simple are returned unchanged.
 *
 * @returns One or more simple rings. On failure, returns the original loop.
 */
export function resolveSelfIntersectingHatchLoop(
  points: AcGePoint2dLike[]
): AcGePoint2d[][] {
  const ring = openRing(points)
  if (ring.length < 3 || !hatchLoopHasSelfIntersection(ring)) {
    return [ring.map(p => new AcGePoint2d(p.x, p.y))]
  }

  const epsilon = polyboolEpsilonFor(ring)
  try {
    const polybool = new PolyBool(new GeometryEpsilon(epsilon))
    const rebuilt = polybool.polygon(
      polybool.segments({
        regions: [ring.map(p => [p.x, p.y] as [number, number])],
        inverted: false
      })
    )
    const regions = rebuilt.regions
      .filter(region => region.length >= 3)
      .map(region =>
        region.map(p => new AcGePoint2d(p[0], p[1]))
      )
    if (regions.length > 0) {
      return regions
    }
    log.warn('PolyBool hatch loop repair produced no regions')
  } catch (error) {
    log.warn(`PolyBool hatch loop repair failed: ${error}, epsilon=${epsilon}`)
  }
  return [ring.map(p => new AcGePoint2d(p.x, p.y))]
}
