import {
  AcDbArc,
  AcDbCircle,
  AcDbPolyline,
  AcGeCircArc2d,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  lockCurvesFromEntity,
  pickLockOnEntities,
  pointLiesOnCircle
} from '../src/command/measure/AcApMeasureArcLock'

describe('lockCurvesFromEntity', () => {
  it('returns a full circle for AcDbCircle', () => {
    const curves = lockCurvesFromEntity(
      new AcDbCircle(new AcGePoint3d(0, 0, 0), 10)
    )
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0)
    expect(curves[0]!.center.y).toBeCloseTo(0)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('returns the drawn sweep for AcDbArc, not the complementary gap', () => {
    const curves = lockCurvesFromEntity(
      new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)
    )
    expect(curves).toHaveLength(1)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('ignores straight polyline chords', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 0)
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 0)
    expect(lockCurvesFromEntity(polyline)).toHaveLength(0)
  })

  it('returns a bulge segment from a polyline', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(10, 0), Math.tan(Math.PI / 8))
    polyline.addVertexAt(1, new AcGePoint2d(0, 10), 0)
    const curves = lockCurvesFromEntity(polyline)
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0, 5)
    expect(curves[0]!.center.y).toBeCloseTo(0, 5)
    expect(curves[0]!.radius).toBeCloseTo(10, 5)
  })
})

describe('pickLockOnEntities', () => {
  const quarterArc = new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)

  it('locks onto a circle circumference', () => {
    const hit = pickLockOnEntities(
      [new AcDbCircle(new AcGePoint3d(0, 0, 0), 10)],
      { x: 10.2, y: 0, z: 0 },
      1
    )
    expect(hit?.geom).toEqual({ cx: 0, cy: 0, r: 10 })
  })

  it('locks onto the drawn arc, not the complementary sweep', () => {
    const hit = pickLockOnEntities(
      [quarterArc],
      { x: 7.071, y: 7.071, z: 0 },
      1
    )
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    expect(
      pickLockOnEntities([quarterArc], { x: -10, y: 0, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('keeps nearest on the drawn stroke when a pick would project onto the complementary arc', () => {
    const hit = pickLockOnEntities([quarterArc], { x: 9, y: -1, z: 0 }, 2)
    expect(hit).toBeDefined()
    expect(hit!.nearest.y).toBeGreaterThanOrEqual(0)
    expect(hit!.nearest.x).toBeCloseTo(10, 1)
  })

  it('maps -Z extrusion OCS angles into WCS (X mirrored)', () => {
    const arc = new AcDbArc({ x: 0, y: 0, z: 0 }, 10, 0, Math.PI / 2, {
      x: 0,
      y: 0,
      z: -1
    })
    // Drawn stroke is Q2: (-10, 0) → (0, 10) through (−√2/2, √2/2).
    const hit = pickLockOnEntities([arc], { x: -7.071, y: 7.071, z: 0 }, 1)
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    // Naive startAngle/endAngle in world XY would lock the +Z quarter in Q1.
    expect(
      pickLockOnEntities([arc], { x: 7.071, y: 7.071, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('locks onto a polyline bulge and ignores a far straight chord', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(10, 0), Math.tan(Math.PI / 8))
    polyline.addVertexAt(1, new AcGePoint2d(0, 10), 0)
    polyline.addVertexAt(2, new AcGePoint2d(80, 10), 0)

    expect(
      pickLockOnEntities([polyline], { x: 7.071, y: 7.071, z: 0 }, 1)?.geom
    ).toMatchObject({
      cx: expect.closeTo(0, 5),
      cy: expect.closeTo(0, 5),
      r: expect.closeTo(10, 5)
    })
    expect(
      pickLockOnEntities([polyline], { x: 50, y: 10, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('at a shared bulge vertex, locks the arc the cursor is closer to', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), -Math.tan(Math.PI / 16))
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 1)
    polyline.addVertexAt(2, new AcGePoint2d(50, 0))

    const first = new AcGeCircArc2d(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      -Math.tan(Math.PI / 16)
    )
    const second = new AcGeCircArc2d({ x: 40, y: 0 }, { x: 50, y: 0 }, 1)
    const toward = (
      curve: AcGeCircArc2d,
      fromStart: boolean,
      dist: number
    ) => {
      const pts = curve.getPoints(16)
      const origin = fromStart ? pts[0]! : pts[pts.length - 1]!
      const inward = fromStart ? pts[1]! : pts[pts.length - 2]!
      const ix = inward.x - origin.x
      const iy = inward.y - origin.y
      const len = Math.hypot(ix, iy)
      return {
        x: origin.x + (ix / len) * dist,
        y: origin.y + (iy / len) * dist,
        z: 0
      }
    }

    expect(
      pickLockOnEntities([polyline], toward(first, false, 0.05), 2)?.geom.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      pickLockOnEntities([polyline], toward(second, true, 0.05), 2)?.geom.r
    ).toBeCloseTo(second.radius, 5)
    // Exact vertex: distances tie; do not let the later segment win.
    expect(
      pickLockOnEntities([polyline], { x: 40, y: 0, z: 0 }, 2)?.geom.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: first.center.x, cy: first.center.y, r: first.radius }
      )
    ).toBe(true)
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: second.center.x, cy: second.center.y, r: second.radius }
      )
    ).toBe(true)
  })
})
