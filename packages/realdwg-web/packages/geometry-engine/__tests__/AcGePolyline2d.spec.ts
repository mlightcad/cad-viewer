import { AcGePolyline2d } from '../src'

describe('Test AcGePolyline2d', () => {
  it('computes length correctly', () => {
    const polyline1 = new AcGePolyline2d()
    expect(polyline1.length).toBe(0)

    const polyline2 = new AcGePolyline2d()
    polyline2.addVertexAt(0, { x: 0, y: 0 })
    polyline2.addVertexAt(1, { x: 1, y: 0, bulge: 1 })
    polyline2.addVertexAt(2, { x: 3, y: 0 })
    expect(polyline2.length).toBe(1 + Math.PI)

    const polyline3 = new AcGePolyline2d()
    polyline3.addVertexAt(0, { x: 0, y: 0 })
    polyline3.addVertexAt(1, { x: 1, y: 0, bulge: 1 })
    polyline3.addVertexAt(2, { x: 1, y: 2 })
    expect(polyline3.length).toBe(1 + Math.PI)

    const polyline4 = new AcGePolyline2d()
    polyline4.addVertexAt(0, { x: 0, y: 0, bulge: 1 })
    polyline4.addVertexAt(1, { x: 2, y: 0, bulge: 1 })
    polyline4.closed = true
    expect(polyline4.length).toBe(2 * Math.PI)
  })
})
