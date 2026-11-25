import {
  AcDbCircle,
  AcDbDatabase,
  AcDbPolyline,
  AcGeLoop2d,
  AcGePoint2d,
  acdbHatchBoundaryEdgesFromEntity
} from '@mlightcad/data-model'

function addRect(
  db: AcDbDatabase,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  const pl = new AcDbPolyline()
  pl.closed = true
  pl.addVertexAt(0, new AcGePoint2d(minX, minY), 0)
  pl.addVertexAt(1, new AcGePoint2d(maxX, minY), 0)
  pl.addVertexAt(2, new AcGePoint2d(maxX, maxY), 0)
  pl.addVertexAt(3, new AcGePoint2d(minX, maxY), 0)
  db.tables.blockTable.modelSpace.appendEntity(pl)
}

function addCircle(db: AcDbDatabase, x: number, y: number, r: number) {
  const c = new AcDbCircle()
  c.center = { x, y, z: 0 }
  c.radius = r
  db.tables.blockTable.modelSpace.appendEntity(c)
}

function signedArea(points: Array<{ x: number; y: number }>) {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += points[j].x * points[i].y - points[i].x * points[j].y
  }
  return sum * 0.5
}

function isPointInPolygon(
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>
) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

describe('HATCH pick-point loop isolation', () => {
  test('disjoint rect + two circles resolve independently', () => {
    const db = new AcDbDatabase()
    addRect(db, 0, 0, 10, 20)
    addCircle(db, 25, 10, 5)
    addCircle(db, 40, 10, 5)

    const edges = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      edges.push(...acdbHatchBoundaryEdgesFromEntity(entity))
    }
    const loops = AcGeLoop2d.buildFromEdges(edges, 1e-3).filter(
      loop => loop.closed && loop.numberOfEdges > 0
    )
    const infos = loops.map(loop => {
      const points = loop.tessellate().map(p => ({ x: p.x, y: p.y }))
      return { loop, points, area: Math.abs(signedArea(points)) }
    })

    expect(loops.length).toBeGreaterThanOrEqual(3)

    const pick = (point: { x: number; y: number }) => {
      const containing = infos
        .map((info, index) =>
          isPointInPolygon(point, info.points) ? index : -1
        )
        .filter(index => index >= 0)
      containing.sort((a, b) => infos[a].area - infos[b].area)
      return containing[0]
    }

    const inRect = pick({ x: 5, y: 10 })
    const inMid = pick({ x: 25, y: 10 })
    const inRight = pick({ x: 40, y: 10 })
    const outside = pick({ x: 100, y: 100 })

    expect(inRect).toBeDefined()
    expect(inMid).toBeDefined()
    expect(inRight).toBeDefined()
    expect(outside).toBeUndefined()
    expect(inRect).not.toBe(inMid)
    expect(inMid).not.toBe(inRight)
    expect(inRect).not.toBe(inRight)
  })
})
