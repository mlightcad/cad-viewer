import {
  AcDbArc,
  AcDbCircle,
  AcDbCurve,
  AcDbEllipse,
  AcDbLine,
  AcDbPolyline,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import {
  acapComputeExtend,
  acapComputeTrim,
  acapComputeTrimPieces,
  acapCrossingPickPoint,
  acapExtendEndNearPick,
  acapFencePickPoints,
  acapResolveTrim
} from '../src/command/modify/acapTrimExtend'

const line = (x1: number, y1: number, x2: number, y2: number) =>
  new AcDbLine(new AcGePoint3d(x1, y1, 0), new AcGePoint3d(x2, y2, 0))

const p = (x: number, y: number) => new AcGePoint3d(x, y, 0)

const expectPoint = (actual: AcGePoint3d, x: number, y: number) => {
  expect(actual.x).toBeCloseTo(x, 6)
  expect(actual.y).toBeCloseTo(y, 6)
}

const ends = (curve: AcDbCurve) => {
  const start = curve.getPointAtParam(curve.startParam)!
  const end = curve.getPointAtParam(curve.endParam)!
  return [start, end]
}

describe('acapTrimExtend — TRIM', () => {
  const v1 = () => line(3, -5, 3, 5)
  const v2 = () => line(7, -5, 7, 5)

  it('removes the segment between two cutting edges', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeTrim(target, p(5, 0.01), [v1(), v2()])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(2)
    const [a, b] = result.keep.map(ends)
    expectPoint(a[0], 0, 0)
    expectPoint(a[1], 3, 0)
    expectPoint(b[0], 7, 0)
    expectPoint(b[1], 10, 0)
    const [r0, r1] = ends(result.removed)
    expectPoint(r0, 3, 0)
    expectPoint(r1, 7, 0)
  })

  it('removes the end segment beyond the last cutting edge', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeTrim(target, p(9, 0), [v1(), v2()])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(1)
    expectPoint(ends(result.keep[0])[0], 0, 0)
    expectPoint(ends(result.keep[0])[1], 7, 0)
  })

  it('keeps the rest of the object whole when other edges also cross it', () => {
    // Three cutting edges; picking the left end removes only 0..3 and the
    // remaining 3..10 stays one line (it must not be split at 5 and 7).
    const target = line(0, 0, 10, 0)
    const result = acapComputeTrim(target, p(1, 0), [
      v1(),
      line(5, -5, 5, 5),
      v2()
    ])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(1)
    const [start, end] = ends(result.keep[0])
    expectPoint(start, 3, 0)
    expectPoint(end, 10, 0)
  })

  it('removes an inner segment and keeps exactly two parts', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeTrim(target, p(6, 0), [
      v1(),
      line(5, -5, 5, 5),
      v2()
    ])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(2)
    const [a, b] = result.keep.map(ends)
    expectPoint(a[0], 0, 0)
    expectPoint(a[1], 5, 0)
    expectPoint(b[0], 7, 0)
    expectPoint(b[1], 10, 0)
  })

  it('erases an uncut object in Quick mode and refuses in Standard mode', () => {
    const target = line(0, 10, 10, 10)
    expect(
      acapComputeTrim(target, p(5, 10), [v1()], { eraseWhenUncut: true }).kind
    ).toBe('erase')
    expect(acapComputeTrim(target, p(5, 10), [v1()]).kind).toBe('none')
  })

  it('cuts at implied (extended) edges only when extendEdges is set', () => {
    const target = line(0, 20, 10, 20)
    // v1 stops at y=5, so it only cuts y=20 when treated as extended.
    expect(acapComputeTrim(target, p(1, 20), [v1()]).kind).toBe('none')
    const result = acapComputeTrim(target, p(1, 20), [v1()], {
      extendEdges: true
    })
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(1)
    expectPoint(ends(result.keep[0])[0], 3, 20)
  })

  it('trims a circle into an arc between two cutting edges', () => {
    const circle = new AcDbCircle(p(0, 0), 5)
    const edge = line(-10, 0, 10, 0)
    const result = acapComputeTrim(circle, p(0, 5), [edge])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(1)
    const kept = result.keep[0]
    expect(kept).toBeInstanceOf(AcDbArc)
    // The lower half remains.
    const mid = kept.getPointAtParam((kept.startParam + kept.endParam) / 2)!
    expectPoint(mid, 0, -5)
  })

  it('trims one segment of a polyline and keeps the rest as polylines', () => {
    const pline = new AcDbPolyline()
    pline.addVertexAt(0, new AcGePoint2d(0, 0))
    pline.addVertexAt(1, new AcGePoint2d(10, 0))
    pline.addVertexAt(2, new AcGePoint2d(10, 10))
    const result = acapComputeTrim(pline, p(10, 8), [line(5, 5, 15, 5)])
    expect(result.kind).toBe('split')
    if (result.kind !== 'split') return
    expect(result.keep).toHaveLength(1)
    expect(result.keep[0]).toBeInstanceOf(AcDbPolyline)
    const [start, end] = ends(result.keep[0])
    expectPoint(start, 0, 0)
    expectPoint(end, 10, 5)
  })

  it('resolves the removed piece from a cached split for any pick', () => {
    const pieces = acapComputeTrimPieces(line(0, 0, 10, 0), [v1(), v2()])
    expect(pieces.pieces).toHaveLength(3)
    const left = acapResolveTrim(pieces, p(1, 0), false)
    const right = acapResolveTrim(pieces, p(9, 0), false)
    expect(left.kind).toBe('split')
    expect(right.kind).toBe('split')
    if (left.kind !== 'split' || right.kind !== 'split') return
    expectPoint(ends(left.removed)[1], 3, 0)
    expectPoint(ends(right.removed)[0], 7, 0)
  })

  it('does not modify the target', () => {
    const target = line(0, 0, 10, 0)
    acapComputeTrim(target, p(5, 0), [v1(), v2()])
    expectPoint(target.endPoint, 10, 0)
  })
})

describe('acapTrimExtend — EXTEND', () => {
  const boundary = () => line(20, -10, 20, 10)

  it('extends the end nearest the pick to the boundary', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeExtend(target, p(9, 0), [boundary()])
    expect(result.kind).toBe('extend')
    if (result.kind !== 'extend') return
    expect(result.atStart).toBe(false)
    expectPoint(result.point, 20, 0)
    expectPoint(ends(result.preview)[1], 20, 0)
    // The source curve is untouched; only the preview copy grew.
    expectPoint(target.endPoint, 10, 0)
  })

  it('extends the start when the pick is nearer the start', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeExtend(target, p(1, 0), [line(-5, -1, -5, 1)])
    expect(result.kind).toBe('extend')
    if (result.kind !== 'extend') return
    expect(result.atStart).toBe(true)
    expectPoint(result.point, -5, 0)
  })

  it('picks the nearest of several boundaries', () => {
    const target = line(0, 0, 10, 0)
    const result = acapComputeExtend(target, p(9, 0), [
      boundary(),
      line(15, -1, 15, 1)
    ])
    expect(result.kind).toBe('extend')
    if (result.kind !== 'extend') return
    expectPoint(result.point, 15, 0)
  })

  it('reports nothing when no edge lies in that direction', () => {
    const target = line(0, 0, 10, 0)
    expect(acapComputeExtend(target, p(9, 0), [line(-5, -1, -5, 1)]).kind).toBe(
      'none'
    )
  })

  it('needs extendEdges to reach an edge that falls short', () => {
    const target = line(0, 0, 10, 0)
    const short = line(20, 2, 20, 10)
    expect(acapComputeExtend(target, p(9, 0), [short]).kind).toBe('none')
    const result = acapComputeExtend(target, p(9, 0), [short], {
      extendEdges: true
    })
    expect(result.kind).toBe('extend')
  })

  it('extends an arc along its circle to a line', () => {
    // Quarter arc from 0 to 90 degrees on a radius-10 circle.
    const arc = new AcDbArc(p(0, 0), 10, 0, Math.PI / 2)
    const edge = line(-20, 0, 0, 0)
    const result = acapComputeExtend(arc, p(0.5, 9.9), [edge])
    expect(result.kind).toBe('extend')
    if (result.kind !== 'extend') return
    expect(result.atStart).toBe(false)
    expectPoint(result.point, -10, 0)
  })

  it('does not extend closed curves', () => {
    const circle = new AcDbCircle(p(0, 0), 5)
    expect(acapComputeExtend(circle, p(5, 0), [boundary()]).kind).toBe('none')
  })

  it('chooses the end along the curve', () => {
    const target = line(0, 0, 10, 0)
    expect(acapExtendEndNearPick(target, p(4, 3))).toBe(true)
    expect(acapExtendEndNearPick(target, p(6, -3))).toBe(false)
  })
})

describe('acapTrimExtend — Fence / Crossing pick points', () => {
  it('returns fence crossings in fence order', () => {
    const target = line(0, 0, 10, 0)
    const points = acapFencePickPoints(target, [p(2, 5), p(2, -5), p(8, 5)])
    expect(points).toHaveLength(2)
    expectPoint(points[0], 2, 0)
    expectPoint(points[1], 5, 0)
  })

  it('returns a point of the curve inside the crossing box', () => {
    const target = line(0, 0, 10, 0)
    const box = new AcGeBox2d({ x: 4, y: -1 }, { x: 6, y: 3 })
    const point = acapCrossingPickPoint(target, box)!
    expect(point.x).toBeGreaterThanOrEqual(4)
    expect(point.x).toBeLessThanOrEqual(6)
    expect(point.y).toBeCloseTo(0, 6)
  })
})

/**
 * TRIM a line against a circle / arc / ellipse / elliptical arc, as AutoCAD
 * does: the picked span between neighbouring cut points (or a line end) is
 * removed and the rest stays, one piece per side. A tangent point is a cut
 * point. Runs with axis-aligned and rotated curves, near the origin and at
 * large world coordinates.
 */
describe('acapTrimExtend - TRIM a line at circles and ellipses', () => {
  interface Frame {
    origin: [number, number]
    axis: [number, number]
  }
  const frames: Frame[] = []
  for (const origin of [
    [0, 0],
    [3.2e6, 4.1e6]
  ] as [number, number][]) {
    for (const axis of [
      [1, 0],
      [0.6, 0.8]
    ] as [number, number][]) {
      frames.push({ origin, axis })
    }
  }

  /** Local (x along axis, y perpendicular) to WCS. */
  const wcs = (f: Frame, x: number, y: number) =>
    p(
      f.origin[0] + x * f.axis[0] - y * f.axis[1],
      f.origin[1] + x * f.axis[1] + y * f.axis[0]
    )
  const rotation = (f: Frame) => Math.atan2(f.axis[1], f.axis[0])
  const center = (f: Frame) => p(f.origin[0], f.origin[1])
  const ellipseX = (h: number) => 5 * Math.sqrt(1 - (h * h) / 4)

  type Edge = (f: Frame) => AcDbCurve
  const circle: Edge = f => new AcDbCircle(center(f), 5)
  const arc =
    (start: number, end: number): Edge =>
    f =>
      new AcDbArc(center(f), 5, start + rotation(f), end + rotation(f))
  const ellipse =
    (start = 0, end = 0): Edge =>
    f =>
      new AcDbEllipse(
        center(f),
        AcGeVector3d.Z_AXIS,
        new AcGeVector3d(f.axis[0], f.axis[1], 0),
        5,
        2,
        start,
        end
      )

  interface Case {
    name: string
    edge: Edge
    /** Local height of the horizontal target line from x = -10 to 10. */
    y: number
    /** Local x of the cut points, ascending. */
    cuts: number[]
  }
  const cases: Case[] = [
    { name: 'line through a circle', edge: circle, y: 3, cuts: [-4, 4] },
    { name: 'line tangent to a circle', edge: circle, y: 5, cuts: [0] },
    {
      name: 'line crossing an arc once',
      edge: arc(0, Math.PI / 2),
      y: 3,
      cuts: [4]
    },
    {
      name: 'line crossing an arc twice',
      edge: arc(0, Math.PI),
      y: 3,
      cuts: [-4, 4]
    },
    {
      name: 'line tangent to an arc',
      edge: arc(0, Math.PI),
      y: 5,
      cuts: [0]
    },
    {
      name: 'line through a full ellipse (stored 0..0)',
      edge: ellipse(),
      y: 1,
      cuts: [-ellipseX(1), ellipseX(1)]
    },
    {
      name: 'line through a full ellipse (stored 0..2PI)',
      edge: ellipse(0, Math.PI * 2),
      y: 1,
      cuts: [-ellipseX(1), ellipseX(1)]
    },
    {
      name: 'line tangent to an ellipse',
      edge: ellipse(),
      y: 2,
      cuts: [0]
    },
    {
      name: 'line crossing an elliptical arc once',
      edge: ellipse(0, Math.PI / 2),
      y: 1,
      cuts: [ellipseX(1)]
    },
    {
      name: 'line crossing an elliptical arc twice',
      edge: ellipse(0, Math.PI),
      y: 1,
      cuts: [-ellipseX(1), ellipseX(1)]
    },
    {
      name: 'line tangent to an elliptical arc',
      edge: ellipse(0, Math.PI),
      y: 2,
      cuts: [0]
    }
  ]

  const expectLocal = (f: Frame, actual: AcGePoint3d, x: number, y: number) =>
    expect(actual.distanceTo(wcs(f, x, y))).toBeLessThan(1e-6)

  describe.each(frames)('origin $origin, axis $axis', f => {
    it.each(cases)('$name', ({ edge, y, cuts }) => {
      const bounds = [-10, ...cuts, 10]
      // Pick the middle of every span; the picked span must go, and the
      // remainder stays as one piece per side.
      for (let i = 0; i + 1 < bounds.length; i++) {
        const from = bounds[i]
        const to = bounds[i + 1]
        const target = line(
          wcs(f, -10, y).x,
          wcs(f, -10, y).y,
          wcs(f, 10, y).x,
          wcs(f, 10, y).y
        )
        const pick = wcs(f, (from + to) / 2, y)
        const result = acapComputeTrim(target, pick, [edge(f)], {
          eraseWhenUncut: true
        })
        expect(result.kind).toBe('split')
        if (result.kind !== 'split') return

        const [r0, r1] = ends(result.removed)
        expectLocal(f, r0, from, y)
        expectLocal(f, r1, to, y)

        const keep = result.keep.map(ends)
        const expected: [number, number][] = []
        if (from > -10) expected.push([-10, from])
        if (to < 10) expected.push([to, 10])
        expect(keep).toHaveLength(expected.length)
        expected.forEach(([a, b], k) => {
          expectLocal(f, keep[k][0], a, y)
          expectLocal(f, keep[k][1], b, y)
        })
      }
    })
  })
})
