import { AcGeCircArc2d, AcGeTol, DEFAULT_TOL, ORIGIN_POINT_2D } from '../src'

describe('Test AcGeCircArc2d', () => {
  it('computes closed property correctly', () => {
    const closedArc1 = new AcGeCircArc2d(
      ORIGIN_POINT_2D,
      1,
      0,
      2 * Math.PI,
      true
    )
    expect(closedArc1.closed).toBe(true)

    const closedArc2 = new AcGeCircArc2d(
      ORIGIN_POINT_2D,
      1,
      0,
      4 * Math.PI,
      true
    )
    expect(closedArc2.closed).toBe(true)

    const closedArc3 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, 0, true)
    expect(closedArc3.closed).toBe(true)

    const notClosedArc1 = new AcGeCircArc2d(
      ORIGIN_POINT_2D,
      1,
      0,
      Math.PI,
      true
    )
    expect(notClosedArc1.closed).toBe(false)
  })

  it('computes clockwise property correctly', () => {
    const arc1 = new AcGeCircArc2d(
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 }
    )
    expect(arc1.clockwise).toBe(false)

    const arc2 = new AcGeCircArc2d(
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 0 }
    )
    expect(arc2.clockwise).toBe(true)
  })

  it('computes midpoint correctly', () => {
    const arc1 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI, true)
    expect(AcGeTol.equal(arc1.midPoint.x, 0))
    expect(AcGeTol.equal(arc1.midPoint.y, 1))

    const arc2 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI, false)
    expect(AcGeTol.equal(arc2.midPoint.x, 0))
    expect(AcGeTol.equal(arc2.midPoint.y, -1))
  })

  it('computes bounding box correctly', () => {
    const arc1 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI, false)
    const box1 = arc1.box
    const box2 = arc1.box
    // The bounding box should be cached and not be calculated again
    expect(box1 === box2).toBeTruthy()

    expect(DEFAULT_TOL.equalPoint2d(arc1.box.min, { x: -1, y: 0 })).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc1.box.max, { x: 1, y: 1 })).toBeTruthy()

    const arc2 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI, true)
    expect(
      DEFAULT_TOL.equalPoint2d(arc2.box.min, { x: -1, y: -1 })
    ).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc2.box.max, { x: 1, y: 0 })).toBeTruthy()
  })

  it('caches and recalculates bounding box correctly', () => {
    const arc1 = new AcGeCircArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI, false)
    let box1 = arc1.box
    let box2 = arc1.box
    expect(box1 === box2).toBeTruthy()

    arc1.radius = 2
    box1 = arc1.box
    box2 = arc1.box
    expect(box1 === box2).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc1.box.min, { x: -2, y: 0 })).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc1.box.max, { x: 2, y: 2 })).toBeTruthy()
  })

  it('creates arc by three points correctly', () => {
    const arc = new AcGeCircArc2d(
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 1 }
    )
    expect(arc.startAngle).toBe(Math.PI)
    expect(arc.endAngle).toBe(0)
    expect(arc.radius).toBe(1)
    expect(arc.center.x).toBe(1)
    expect(arc.center.y).toBe(1)
  })

  it('creates arc by start point, end point, and bulge correctly', () => {
    const arc1 = new AcGeCircArc2d({ x: 0, y: 0 }, { x: 2, y: 0 }, 1)
    expect(arc1.radius).toBe(1)
    expect(arc1.center.x).toBe(1)
    expect(AcGeTol.equalToZero(arc1.center.y)).toBeTruthy()
    expect(arc1.startAngle).toBe(Math.PI)
    expect(AcGeTol.equalToZero(arc1.endAngle)).toBeTruthy()
    expect(arc1.clockwise).toBe(false)

    const arc2 = new AcGeCircArc2d({ x: 0, y: 0 }, { x: 2, y: 0 }, -1)
    expect(arc2.radius).toBe(1)
    expect(arc2.center.x).toBe(1)
    expect(AcGeTol.equalToZero(arc2.center.y)).toBeTruthy()
    expect(arc2.startAngle).toBe(Math.PI)
    expect(AcGeTol.equalToZero(arc2.endAngle)).toBeTruthy()
    expect(arc2.clockwise).toBe(true)
  })
})
