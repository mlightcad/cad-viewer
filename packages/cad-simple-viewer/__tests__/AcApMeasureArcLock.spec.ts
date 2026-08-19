import {
  AcDbArc,
  AcDbCircle,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  lockCurvesFromEntity,
  pickLockOnEntities
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
    expect(
      pickLockOnEntities([quarterArc], { x: 7.071, y: 7.071, z: 0 }, 1)?.geom
    ).toMatchObject({ cx: 0, cy: 0, r: 10 })
    expect(
      pickLockOnEntities([quarterArc], { x: -10, y: 0, z: 0 }, 1)
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
})
