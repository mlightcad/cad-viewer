/**
 * @jest-environment node
 */
import {
  AcDb2dPolyline,
  AcDbCircle,
  AcDbDatabase,
  AcDbEllipse,
  type AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPoly2dType,
  AcDbPolyline,
  AcDbSolid,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import {
  AcApSmartBlockSearch,
  acedEntityToShapeFeature,
  acedFindShapeMatches,
  type AcEdShapeFeature
} from '../src/smartBlock'

/** An "L" plate with one rounded corner: a single closed polyline. */
function plate(): AcDbPolyline {
  const pl = new AcDbPolyline()
  pl.addVertexAt(0, new AcGePoint2d(0, 0))
  pl.addVertexAt(1, new AcGePoint2d(10, 0), 0.4)
  pl.addVertexAt(2, new AcGePoint2d(10, 3))
  pl.addVertexAt(3, new AcGePoint2d(3, 6))
  pl.addVertexAt(4, new AcGePoint2d(0, 6))
  pl.closed = true
  return pl
}

const place = (x: number, y: number, angle = 0, mirror = false) => {
  const m = new AcGeMatrix3d()
    .makeTranslation(x, y, 0)
    .multiply(new AcGeMatrix3d().makeRotationZ(angle))
  return mirror ? m.multiply(new AcGeMatrix3d().makeScale(1, -1, 1)) : m
}

function add(db: AcDbDatabase, entities: AcDbEntity[]): string[] {
  db.tables.blockTable.modelSpace.appendEntity(entities)
  return entities.map(e => e.objectId)
}

function features(entities: AcDbEntity[]): AcEdShapeFeature<string>[] {
  return entities.map(
    e => acedEntityToShapeFeature(e, e.objectId, { matchLayer: false })!
  )
}

describe('Smart Blocks matching: shapes and transforms', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
  })

  test('a single polyline matches rotated and mirrored copies', () => {
    const [source] = add(db, [plate()])
    add(db, [plate().transformBy(place(100, 0, Math.PI / 3))])
    add(db, [plate().transformBy(place(200, 0, 0, true))])
    // The same outline without the arc edge is a different shape.
    const straight = plate()
    straight.reset(true)
    ;[
      [0, 0],
      [10, 0],
      [10, 3],
      [3, 6],
      [0, 6]
    ].forEach(([x, y], i) => straight.addVertexAt(i, new AcGePoint2d(x, y)))
    straight.closed = true
    add(db, [straight.transformBy(place(300, 0))])

    const search = new AcApSmartBlockSearch(db, [source])
    expect(search.matches).toHaveLength(2)
    expect(search.matches.map(m => m.mirrored).sort()).toEqual([false, true])
    const rotated = search.matches.find(m => !m.mirrored)!
    expect(rotated.rotation).toBeCloseTo(Math.PI / 3)

    search.setOptions({ allowRotation: false, allowMirror: false })
    expect(search.matches).toHaveLength(0)
  })

  test('heavy and light polylines with the same bulges are the same shape', () => {
    const light = plate()
    const heavy = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 3, z: 0 },
        { x: 3, y: 6, z: 0 },
        { x: 0, y: 6, z: 0 }
      ],
      0,
      true,
      0,
      0,
      [0, 0.4, 0, 0, 0]
    )
    heavy.transformBy(place(50, 20, Math.PI))
    add(db, [light, heavy])
    const matches = acedFindShapeMatches(features([light]), features([heavy]))
    expect(matches).toHaveLength(1)
    expect(Math.abs(matches[0].rotation)).toBeCloseTo(Math.PI)
  })

  test('open polylines tracing the same path match however they are split', () => {
    // A PDF round trip rebuilds flattened curves with varying vertex
    // counts: one copy gets a run of segments as a single arc, another as
    // several pieces. The path is what matters, not its vertices.
    const sweepBulge = 0.3
    const halfBulge = Math.tan(Math.atan(sweepBulge) / 2)
    const coarse = () => {
      const pl = new AcDbPolyline()
      pl.addVertexAt(0, new AcGePoint2d(0, 0), sweepBulge)
      pl.addVertexAt(1, new AcGePoint2d(10, 0))
      pl.addVertexAt(2, new AcGePoint2d(10, 5))
      pl.addVertexAt(3, new AcGePoint2d(15, 5))
      return pl
    }
    const fine = (end = { x: 15, y: 5 }) => {
      // Same path: the arc as two halves (its midpoint is (5, -1.5)) and the
      // vertical edge with an extra vertex.
      const pl = new AcDbPolyline()
      pl.addVertexAt(0, new AcGePoint2d(0, 0), halfBulge)
      pl.addVertexAt(1, new AcGePoint2d(5, -1.5), halfBulge)
      pl.addVertexAt(2, new AcGePoint2d(10, 0))
      pl.addVertexAt(3, new AcGePoint2d(10, 2.5))
      pl.addVertexAt(4, new AcGePoint2d(10, 5))
      pl.addVertexAt(5, new AcGePoint2d(end.x, end.y))
      return pl
    }
    const [source] = add(db, [coarse()])
    add(db, [fine().transformBy(place(100, 0, Math.PI / 6))])
    // Drawn backwards: the reversed vertex order is the same path.
    const reversed = new AcDbPolyline()
    ;[
      [15, 5, 0],
      [10, 5, 0],
      [10, 0, -sweepBulge],
      [0, 0, 0]
    ].forEach(([x, y, b], i) =>
      reversed.addVertexAt(i, new AcGePoint2d(x, y), b)
    )
    add(db, [reversed.transformBy(place(200, 0))])
    // A different last edge is a different shape.
    add(db, [fine({ x: 15, y: 6 }).transformBy(place(300, 0))])

    const search = new AcApSmartBlockSearch(db, [source])
    expect(search.matches).toHaveLength(2)
  })

  test('closed polylines tracing the same outline match however they are split', () => {
    // A slot with rounded ends, like the chair outlines a PDF round trip
    // rebuilt with 8, 11 or 13 vertices: arcs split into pieces, an extra
    // vertex on a straight edge, and another start vertex.
    const q = Math.tan(Math.PI / 8) // bulge of a 90° arc
    const e = Math.tan(Math.PI / 16) // bulge of a 45° arc
    const r = Math.SQRT1_2 * 2
    const coarse = () => {
      const pl = new AcDbPolyline()
      ;[
        [0, -2, 0],
        [8, -2, q],
        [10, 0, q],
        [8, 2, 0],
        [0, 2, q],
        [-2, 0, q]
      ].forEach(([x, y, b], i) => pl.addVertexAt(i, new AcGePoint2d(x, y), b))
      pl.closed = true
      return pl
    }
    const fine = (shift = 0) => {
      // Starts on the top edge; the right corners are split at 45°.
      const pl = new AcDbPolyline()
      ;[
        [8, 2, 0],
        [4, 2, 0],
        [0, 2, q],
        [-2, 0, q],
        [0, -2, 0],
        [8, -2, e],
        [8 + r, -2 + (2 - r), e],
        [10 + shift, 0, e],
        [8 + r, r, e]
      ].forEach(([x, y, b], i) => pl.addVertexAt(i, new AcGePoint2d(x, y), b))
      pl.closed = true
      return pl
    }
    const [source] = add(db, [coarse()])
    add(db, [fine().transformBy(place(100, 0, Math.PI / 4))])
    add(db, [fine().transformBy(place(200, 0, 0, true))])
    // A dent at the right end is a different outline.
    add(db, [fine(-1).transformBy(place(300, 0))])

    const search = new AcApSmartBlockSearch(db, [source])
    expect(search.matches).toHaveLength(2)
  })

  test('full ellipses match regardless of their start parameter', () => {
    const a = new AcDbEllipse(
      new AcGePoint3d(0, 0, 0),
      AcGeVector3d.Z_AXIS,
      new AcGeVector3d(1, 0, 0),
      4,
      2,
      0,
      Math.PI * 2
    )
    const b = new AcDbEllipse(
      new AcGePoint3d(30, 0, 0),
      AcGeVector3d.Z_AXIS,
      new AcGeVector3d(0, 1, 0),
      4,
      2,
      1.1,
      1.1 + Math.PI * 2
    )
    add(db, [a, b])
    expect(acedFindShapeMatches(features([a]), features([b]))).toHaveLength(1)
  })

  test('2D solids match through rotation', () => {
    const solid = () => {
      const s = new AcDbSolid()
      s.setPointAt(0, new AcGePoint3d(0, 0, 0))
      s.setPointAt(1, new AcGePoint3d(4, 0, 0))
      s.setPointAt(2, new AcGePoint3d(0, 1, 0))
      s.setPointAt(3, new AcGePoint3d(0, 1, 0))
      return s
    }
    const line = () =>
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(0, 8, 0))
    const source = add(db, [solid(), line()])
    add(
      db,
      [solid(), line()].map(e => e.transformBy(place(40, 40, Math.PI / 2)))
    )
    expect(new AcApSmartBlockSearch(db, source).matches).toHaveLength(1)
  })

  test('scaled copies use a tolerance relative to their size', () => {
    const symbol = () => [
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0)),
      new AcDbCircle(new AcGePoint3d(8, 3, 0), 1)
    ]
    const source = add(db, symbol())
    // 100× larger copy with a radius off by 0.1 % of its size: inside the
    // relative tolerance, far outside the absolute one of the template.
    const big = symbol().map(e =>
      e.transformBy(
        place(1000, 0).multiply(new AcGeMatrix3d().makeScale(100, 100, 1))
      )
    )
    ;(big[1] as AcDbCircle).radius = 100.1
    add(db, big)
    const search = new AcApSmartBlockSearch(db, source, { allowScale: true })
    expect(search.matches).toHaveLength(1)
    expect(search.matches[0].scale).toBeCloseTo(100)
  })

  test('toggling layer matching during review searches again correctly', () => {
    const symbol = () => [
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0)),
      new AcDbCircle(new AcGePoint3d(8, 3, 0), 1)
    ]
    const source = add(db, symbol())
    const other = symbol().map(e => e.transformBy(place(50, 0)))
    other.forEach(e => (e.layer = 'OTHER'))
    add(db, other)
    const search = new AcApSmartBlockSearch(db, source)
    expect(search.matches).toHaveLength(0)
    search.setOptions({ matchLayer: false })
    expect(search.matches).toHaveLength(1)
    search.setOptions({ matchLayer: true })
    expect(search.matches).toHaveLength(0)
  })

  test('stays fast on a large drawing', () => {
    const symbol = () => [
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0)),
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(0, 4, 0)),
      new AcDbCircle(new AcGePoint3d(8, 3, 0), 1)
    ]
    const source = add(db, symbol())
    const entities: AcDbEntity[] = []
    // 400 copies among ~20 000 unrelated lines of similar sizes.
    for (let i = 0; i < 400; i++) {
      const m = place((i % 20) * 50, Math.floor(i / 20) * 50 + 100, i * 0.1)
      entities.push(...symbol().map(e => e.transformBy(m)))
    }
    for (let i = 0; i < 20000; i++) {
      const x = (i % 200) * 5
      const y = Math.floor(i / 200) * 5 + 1200
      entities.push(
        new AcDbLine(
          new AcGePoint3d(x, y, 0),
          new AcGePoint3d(x + 3 + (i % 9), y + (i % 4), 0)
        )
      )
    }
    add(db, entities)
    const start = Date.now()
    const search = new AcApSmartBlockSearch(db, source)
    const elapsed = Date.now() - start
    expect(search.matches).toHaveLength(400)
    // Generous bound for slow CI machines; locally this takes well under 1 s.
    expect(elapsed).toBeLessThan(5000)
  })
})
