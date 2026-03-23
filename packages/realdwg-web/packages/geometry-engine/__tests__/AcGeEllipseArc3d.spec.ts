import {
  AcGeEllipseArc3d,
  AcGeVector3d,
  DEFAULT_TOL,
  ORIGIN_POINT_3D
} from '../src'

describe('Test AcGeEllipseArc3d', () => {
  it('caches and recalculates bounding box correctly', () => {
    const arc1 = new AcGeEllipseArc3d(
      ORIGIN_POINT_3D,
      AcGeVector3d.Z_AXIS,
      AcGeVector3d.X_AXIS,
      2,
      1.5,
      0,
      Math.PI
    )
    let box1 = arc1.box
    let box2 = arc1.box
    expect(box1 === box2).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc1.box.min, { x: -2, y: 0 })).toBeTruthy()
    expect(
      DEFAULT_TOL.equalPoint2d(arc1.box.max, { x: 2, y: 1.5 })
    ).toBeTruthy()

    arc1.majorAxisRadius = 3
    box1 = arc1.box
    box2 = arc1.box
    expect(box1 === box2).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc1.box.min, { x: -3, y: 0 })).toBeTruthy()
    expect(
      DEFAULT_TOL.equalPoint2d(arc1.box.max, { x: 3, y: 1.5 })
    ).toBeTruthy()

    const arc2 = new AcGeEllipseArc3d(
      ORIGIN_POINT_3D,
      AcGeVector3d.Z_AXIS,
      AcGeVector3d.Y_AXIS,
      2,
      1.5,
      0,
      Math.PI
    )
    expect(
      DEFAULT_TOL.equalPoint2d(arc2.box.min, { x: -1.5, y: -2 })
    ).toBeTruthy()
    expect(DEFAULT_TOL.equalPoint2d(arc2.box.max, { x: 0, y: 2 })).toBeTruthy()
  })

  it('computes length correctly', () => {
    const arc1 = new AcGeEllipseArc3d(
      ORIGIN_POINT_3D,
      AcGeVector3d.Z_AXIS,
      AcGeVector3d.X_AXIS,
      2,
      2,
      0,
      Math.PI
    )
    expect(arc1.length).toBeCloseTo(2 * Math.PI, 5)

    const arc2 = new AcGeEllipseArc3d(
      ORIGIN_POINT_3D,
      AcGeVector3d.Z_AXIS,
      AcGeVector3d.X_AXIS,
      2,
      1,
      0,
      2 * Math.PI
    )
    expect(arc2.length).toBeCloseTo(9.688448220547675, 4)
  })
})
