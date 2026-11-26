import {
  AcDbAssocArrayItemLocator,
  AcDbAssocArrayPathMethod,
  AcDbAssocArrayPathParameters,
  AcDbPolyline,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { acapBuildPolarArrayParameters } from '../src/command/modify/array/AcApArrayPolarParams'
import {
  acapArrayFirstItemIsIdentity,
  acapArrayWorldItemTransform
} from '../src/command/modify/array/AcApArrayWorldTransform'

function transformPoint(matrix: AcGeMatrix3d, x: number, y: number) {
  // Column-major; apply as p' = M · [x,y,0,1]
  const e = matrix.elements
  return {
    x: e[0] * x + e[4] * y + e[12],
    y: e[1] * x + e[5] * y + e[13]
  }
}

describe('acapArrayWorldItemTransform', () => {
  it('rotates a world point around a non-origin polar center', () => {
    const center = new AcGePoint3d(100, 50, 0)
    const basePoint = new AcGePoint3d(100, 80, 0) // 30 above center
    const params = acapBuildPolarArrayParameters({
      itemCount: 5,
      fillAngleDegrees: 90,
      rotateItems: true,
      center,
      basePoint
    })

    // Item 4 at fill end: +90° CCW from base → to the left of center.
    const locator = new AcDbAssocArrayItemLocator(4, 0, 0)
    const world = acapArrayWorldItemTransform(params, locator, basePoint)
    const moved = transformPoint(world, basePoint.x, basePoint.y)

    expect(moved.x).toBeCloseTo(70, 5) // 100 - 30
    expect(moved.y).toBeCloseTo(50, 5)

    // Raw item matrix without T(base) wrap would orbit WCS origin instead.
    const raw = params.getItemTransform(locator)
    const wrong = transformPoint(raw, basePoint.x, basePoint.y)
    expect(Math.hypot(wrong.x - 70, wrong.y - 50)).toBeGreaterThan(1)
  })

  it('treats path item 0 as non-identity when base is not on the path start', () => {
    const path = new AcDbPolyline()
    path.addVertexAt(0, new AcGePoint2d(0, 0))
    path.addVertexAt(1, new AcGePoint2d(100, 0))
    const basePoint = new AcGePoint3d(100, 0, 0) // path end
    const params = new AcDbAssocArrayPathParameters(50, 1, 1, 3, 1, 1, 0)
    params.method = AcDbAssocArrayPathMethod.kDivide
    params.alignItems = true
    params.basePoint = basePoint
    params.setPathCurve(path)

    expect(acapArrayFirstItemIsIdentity(params, basePoint)).toBe(false)

    // Circles centered at the path start stay aligned with a fixed offset
    // from each path sample when align uses relative tangents.
    const center = new AcGePoint3d(0, 0, 0)
    const last = acapArrayWorldItemTransform(
      params,
      new AcDbAssocArrayItemLocator(2, 0, 0),
      basePoint
    )
    const moved = transformPoint(last, center.x, center.y)
    expect(moved.x).toBeCloseTo(0, 5)
    expect(moved.y).toBeCloseTo(0, 5)
  })

  it('keeps path item 0 identity when base sits on the object at path start', () => {
    const path = new AcDbPolyline()
    path.addVertexAt(0, new AcGePoint2d(0, 0))
    path.addVertexAt(1, new AcGePoint2d(100, 0))
    const basePoint = new AcGePoint3d(0, 0, 0)
    const params = new AcDbAssocArrayPathParameters(50, 1, 1, 3, 1, 1, 0)
    params.method = AcDbAssocArrayPathMethod.kDivide
    params.alignItems = true
    params.basePoint = basePoint
    params.setPathCurve(path)

    expect(acapArrayFirstItemIsIdentity(params, basePoint)).toBe(true)
  })
})
