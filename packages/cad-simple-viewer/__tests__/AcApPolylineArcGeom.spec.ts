import {
  acgeBulgeArcTangentAtStart,
  acgeBulgeFromStartEndDirection
} from '@mlightcad/data-model'

import {
  acapPolylineArcFromTangentAndIncludedAngle,
  acapPolylineIncomingTangentRadians,
  acapPolylinePointAlongTangent
} from '../src/command/draw/AcApPolylineArcGeom'

const angleNear = (
  actual: number | undefined,
  expected: number,
  eps = 1e-9
) => {
  expect(actual).toBeDefined()
  let delta = ((actual! - expected + Math.PI) % (Math.PI * 2)) - Math.PI
  if (delta <= -Math.PI) delta += Math.PI * 2
  expect(Math.abs(delta)).toBeLessThan(eps)
}

describe('AcApPolylineArcGeom', () => {
  const start = { x: 0, y: 0 }
  const bulge90 = Math.tan(Math.PI / 8)

  it('resolves incoming tangent from the previous line or arc', () => {
    const afterLine = acapPolylineIncomingTangentRadians(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      [undefined, undefined]
    )
    angleNear(afterLine, 0)

    const afterArc = acapPolylineIncomingTangentRadians(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ],
      [bulge90, undefined]
    )
    angleNear(afterArc, Math.PI / 2)
  })

  it('keeps previous tangent for Angle and projects the endpoint', () => {
    const tangent = 0
    const included = Math.PI / 2
    const cursor = { x: 2, y: 1 }
    const chordLen = Math.hypot(cursor.x, cursor.y)
    const segment = acapPolylineArcFromTangentAndIncludedAngle(
      start,
      cursor,
      tangent,
      included
    )
    expect(segment).toBeDefined()
    expect(segment!.end.x).toBeCloseTo(Math.cos(Math.PI / 4) * chordLen, 9)
    expect(segment!.end.y).toBeCloseTo(Math.sin(Math.PI / 4) * chordLen, 9)
    expect(segment!.bulge).toBeCloseTo(Math.tan(Math.PI / 8), 9)

    angleNear(
      acgeBulgeArcTangentAtStart(start, segment!.end, segment!.bulge),
      tangent
    )
  })

  it('Direction override uses the custom tangent via geometry-engine', () => {
    const customTangent = Math.PI / 2
    const end = { x: 1, y: 1 }
    const bulge = acgeBulgeFromStartEndDirection(start, end, customTangent)
    expect(bulge).toBeDefined()
    angleNear(acgeBulgeArcTangentAtStart(start, end, bulge!), customTangent)
  })

  it('Length places the next point on the previous exit-tangent ray', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]
    const bulges = [bulge90, undefined]
    const tangent = acapPolylineIncomingTangentRadians(points, bulges)
    angleNear(tangent, Math.PI / 2)

    const next = acapPolylinePointAlongTangent(points[1], tangent, 5)
    expect(next).toBeDefined()
    expect(next!.x).toBeCloseTo(1, 9)
    expect(next!.y).toBeCloseTo(6, 9)
  })
})
