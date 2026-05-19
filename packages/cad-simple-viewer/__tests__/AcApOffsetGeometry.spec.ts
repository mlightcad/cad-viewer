import {
  AcDbLine, AcDbArc, AcDbCircle, AcDbEllipse, AcDbPolyline,
  AcGePoint3d, AcGeVector3d, AcGePoint2d,
} from '@mlightcad/data-model'

jest.mock(
  'clipper2-ts',
  () => ({
    EndType: { Polygon: 0, Butt: 1 },
    JoinType: { Miter: 0 },
    inflatePaths: (paths: unknown) => paths,
  }),
  { virtual: true }
)

import {
  offsetLine, offsetArc, offsetCircle, offsetEllipse, offsetPolyline, pickSide,
} from '../src/command/modify/AcApOffsetGeometry'

describe('offsetLine', () => {
  it('offsets a horizontal line upward by distance 2', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, 1)
    expect(result.startPoint.y).toBeCloseTo(2)
    expect(result.endPoint.y).toBeCloseTo(2)
    expect(result.startPoint.x).toBeCloseTo(0)
    expect(result.endPoint.x).toBeCloseTo(10)
  })
  it('offsets a horizontal line downward when side is -1', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, -1)
    expect(result.startPoint.y).toBeCloseTo(-2)
    expect(result.endPoint.y).toBeCloseTo(-2)
  })
})

describe('offsetArc', () => {
  it('increases radius when offsetting outward', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 5, 0, Math.PI)
    const result = offsetArc(arc, 2, 1)
    expect(result).not.toBeNull()
    expect(result!.radius).toBeCloseTo(7)
  })
  it('decreases radius when offsetting inward', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 5, 0, Math.PI)
    const result = offsetArc(arc, 2, -1)
    expect(result!.radius).toBeCloseTo(3)
  })
  it('returns null when inward offset collapses radius', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 2, 0, Math.PI)
    expect(offsetArc(arc, 3, -1)).toBeNull()
  })
})

describe('offsetCircle', () => {
  it('increases radius when offsetting outward', () => {
    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
    expect(offsetCircle(circle, 3, 1)!.radius).toBeCloseTo(8)
  })
  it('returns null when inward offset collapses radius', () => {
    expect(offsetCircle(new AcDbCircle(new AcGePoint3d(0, 0, 0), 2), 3, -1)).toBeNull()
  })
})

describe('offsetEllipse', () => {
  it('increases both radii when offsetting outward', () => {
    const e = new AcDbEllipse(
      new AcGePoint3d(0,0,0), new AcGeVector3d(0,0,1), new AcGeVector3d(1,0,0), 10, 5, 0, Math.PI*2
    )
    const result = offsetEllipse(e, 2, 1)
    expect(result!.majorAxisRadius).toBeCloseTo(12)
    expect(result!.minorAxisRadius).toBeCloseTo(7)
  })
  it('returns null when inward offset collapses minor radius', () => {
    const e = new AcDbEllipse(
      new AcGePoint3d(0,0,0), new AcGeVector3d(0,0,1), new AcGeVector3d(1,0,0), 10, 2, 0, Math.PI*2
    )
    expect(offsetEllipse(e, 3, -1)).toBeNull()
  })
})

describe('offsetPolyline', () => {
  it('offsets a closed square outward', () => {
    const poly = new AcDbPolyline()
    poly.addVertexAt(0, new AcGePoint2d(0, 0))
    poly.addVertexAt(1, new AcGePoint2d(10, 0))
    poly.addVertexAt(2, new AcGePoint2d(10, 10))
    poly.addVertexAt(3, new AcGePoint2d(0, 10))
    poly.closed = true
    const result = offsetPolyline(poly, 1, 1)
    expect(result).not.toBeNull()
    expect(result!.numberOfVertices).toBeGreaterThanOrEqual(4)
  })

  it('offsets an open polyline with 2 vertices', () => {
    const poly = new AcDbPolyline()
    poly.addVertexAt(0, new AcGePoint2d(0, 0))
    poly.addVertexAt(1, new AcGePoint2d(10, 0))
    poly.closed = false
    const result = offsetPolyline(poly, 2, 1)
    expect(result).not.toBeNull()
    expect(result!.numberOfVertices).toBe(2)
    expect(result!.getPoint2dAt(0).y).toBeCloseTo(2)
    expect(result!.getPoint2dAt(1).y).toBeCloseTo(2)
  })

  it('offsets an open polyline with 3 vertices, joining offset segments', () => {
    const poly = new AcDbPolyline()
    poly.addVertexAt(0, new AcGePoint2d(0, 0))
    poly.addVertexAt(1, new AcGePoint2d(10, 0))
    poly.addVertexAt(2, new AcGePoint2d(10, 10))
    poly.closed = false
    const result = offsetPolyline(poly, 1, 1)
    expect(result).not.toBeNull()
    expect(result!.numberOfVertices).toBe(3)
  })

  it('returns null for open polyline with fewer than 2 vertices', () => {
    const poly = new AcDbPolyline()
    poly.addVertexAt(0, new AcGePoint2d(0, 0))
    poly.closed = false
    expect(offsetPolyline(poly, 1, 1)).toBeNull()
  })
})

describe('pickSide', () => {
  it('returns 1 for point above a horizontal line', () => {
    const line = new AcDbLine(new AcGePoint3d(0,0,0), new AcGePoint3d(10,0,0))
    expect(pickSide(line, new AcGePoint3d(5, 3, 0))).toBe(1)
  })
  it('returns -1 for point below a horizontal line', () => {
    const line = new AcDbLine(new AcGePoint3d(0,0,0), new AcGePoint3d(10,0,0))
    expect(pickSide(line, new AcGePoint3d(5, -3, 0))).toBe(-1)
  })
  it('returns 1 for point outside a circle', () => {
    expect(pickSide(new AcDbCircle(new AcGePoint3d(0,0,0), 5), new AcGePoint3d(8,0,0))).toBe(1)
  })
  it('returns -1 for point inside a circle', () => {
    expect(pickSide(new AcDbCircle(new AcGePoint3d(0,0,0), 5), new AcGePoint3d(2,0,0))).toBe(-1)
  })
})
