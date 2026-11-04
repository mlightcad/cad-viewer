import { AcGePoint2d } from '@mlightcad/data-model'

import {
  hatchLoopHasSelfIntersection,
  resolveSelfIntersectingHatchLoop
} from '../src/object/AcTrHatchLoopRepair'

/**
 * Self-intersecting hatch foot from DWG handle 14AE (simplified, no arc):
 * a vertical strip with a left-hand ledge whose long left edge crosses the
 * bottom ledge — AutoCAD stores this without a T-junction vertex.
 */
function hatch14AeFootLoop() {
  return [
    new AcGePoint2d(1439.03, 691.02),
    new AcGePoint2d(1439.03, 628.96),
    new AcGePoint2d(1418.03, 628.96),
    new AcGePoint2d(1418.03, 627.46),
    new AcGePoint2d(1435.03, 627.46),
    new AcGePoint2d(1435.03, 688.53),
    new AcGePoint2d(1439.03, 691.02)
  ]
}

describe('AcTrHatchLoopRepair', () => {
  it('detects the T-junction self-intersection in hatch 14AE-style foot', () => {
    expect(hatchLoopHasSelfIntersection(hatch14AeFootLoop())).toBe(true)
  })

  it('leaves a simple rectangle unchanged', () => {
    const rect = [
      new AcGePoint2d(0, 0),
      new AcGePoint2d(10, 0),
      new AcGePoint2d(10, 5),
      new AcGePoint2d(0, 5)
    ]
    expect(hatchLoopHasSelfIntersection(rect)).toBe(false)
    const regions = resolveSelfIntersectingHatchLoop(rect)
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveLength(4)
  })

  it('decomposes the self-intersecting foot into simple even-odd regions', () => {
    const regions = resolveSelfIntersectingHatchLoop(hatch14AeFootLoop())
    expect(regions.length).toBeGreaterThan(1)
    for (const region of regions) {
      expect(hatchLoopHasSelfIntersection(region)).toBe(false)
      expect(region.length).toBeGreaterThanOrEqual(3)
    }

    // Notch interior stays filled; concave exterior left of the upright does not.
    expect(regions.some(region => pointInPoly(1425, 628.2, region))).toBe(true)
    expect(regions.some(region => pointInPoly(1437, 650, region))).toBe(true)
    expect(regions.some(region => pointInPoly(1425, 640, region))).toBe(false)
  })

  it('drops a spike drawn out and back along the same edge', () => {
    const regions = resolveSelfIntersectingHatchLoop(
      ring([
        [0, 0],
        [100, 0],
        [100, 100],
        [50, 100],
        [50, -50],
        [50, 100],
        [0, 100]
      ])
    )
    expect(regions).toHaveLength(1)
    // The unrepaired fallback also has shoelace area 10000, but crosses itself.
    expect(hatchLoopHasSelfIntersection(regions[0])).toBe(false)
    expect(totalArea(regions)).toBeCloseTo(10000)
    expect(regions.some(region => pointInPoly(50.5, -25, region))).toBe(false)
  })

  it('keeps a notch reached along an edge drawn twice', () => {
    const regions = resolveSelfIntersectingHatchLoop(
      ring([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 60],
        [60, 60],
        [60, 40],
        [0, 40],
        [0, 60]
      ])
    )
    expect(regions).toHaveLength(1)
    expect(totalArea(regions)).toBeCloseTo(8800)
    expect(regions.some(region => pointInPoly(30, 50, region))).toBe(false)
  })
})

function pointInPoly(
  x: number,
  y: number,
  poly: Array<{ x: number; y: number }>
): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function ring(coords: Array<[number, number]>): AcGePoint2d[] {
  return coords.map(([x, y]) => new AcGePoint2d(x, y))
}

function totalArea(regions: Array<Array<{ x: number; y: number }>>): number {
  return regions.reduce((sum, region) => {
    let area = 0
    for (let i = 0; i < region.length; i++) {
      const p = region[i]
      const q = region[(i + 1) % region.length]
      area += p.x * q.y - q.x * p.y
    }
    return sum + Math.abs(area) / 2
  }, 0)
}
