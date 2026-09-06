import {
  AcDbAlignedDimension,
  AcDbAttribute,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbDataGenerator,
  AcDbEllipse,
  AcDbHatch,
  AcDbLeader,
  AcDbLine,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLine,
  AcDbOle2Frame,
  AcDbPoint,
  AcDbPolyline,
  AcDbRasterImage,
  AcDbRay,
  AcDbSolid,
  AcDbTable,
  AcDbText,
  AcDbTrace,
  AcDbXline,
  AcGeCircArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGePolyline2d,
  AcGeVector3d,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { buildOsnapCatalog } from '../src/AcExOsnapPrimitiveBuilder'
import { AcExOsnapIndex } from '../src/AcExOsnap'

describe('buildOsnapCatalog', () => {
  it('omits line primitives from block references (lines come from geometry batches)', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'SNAP_TEST_BLOCK'
    db.tables.blockTable.add(blockRecord)
    blockRecord.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    )

    const insert = new AcDbBlockReference('SNAP_TEST_BLOCK')
    insert.position = new AcGePoint3d(100, 50, 0)
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
  })

  it('omits line primitives from rotated block references', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'SNAP_ROT_BLOCK'
    db.tables.blockTable.add(blockRecord)
    blockRecord.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    )

    const insert = new AcDbBlockReference('SNAP_ROT_BLOCK')
    insert.position = new AcGePoint3d(0, 0, 0)
    insert.rotation = Math.PI / 2
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
  })

  it('exports analytic curves but omits straight lines', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    modelSpace.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    )
    modelSpace.appendEntity(
      new AcDbEllipse(
        new AcGePoint3d(20, 0, 0),
        AcGeVector3d.Z_AXIS,
        new AcGeVector3d(4, 0, 0),
        4,
        2,
        0,
        Math.PI * 2
      )
    )

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)

    expect(catalog.primitives.some(prim => prim.kind === 'line')).toBe(false)
    expect(catalog.primitives.some(prim => prim.kind === 'ellipse')).toBe(true)
  })

  it('omits straight polyline segments from the catalog', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0))
    polyline.addVertexAt(1, new AcGePoint2d(10, 0))
    polyline.addVertexAt(2, new AcGePoint2d(10, 10))
    modelSpace.appendEntity(polyline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line').length).toBe(0)
    expect(catalog.primitives.filter(p => p.kind === 'path').length).toBe(0)
  })

  it('exports a wide LWPOLYLINE centerline as one path (mesh, not lineBatches)', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 0, 2, 1)
    polyline.addVertexAt(1, new AcGePoint2d(10, 0), 0, 1, 2)
    polyline.addVertexAt(2, new AcGePoint2d(10, 10), 0, 2, 2)
    modelSpace.appendEntity(polyline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    const paths = catalog.primitives.filter(p => p.kind === 'path')
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatchObject({
      kind: 'path',
      closed: false,
      vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0]
    })

    const index = new AcExOsnapIndex(['endpoint', 'midpoint', 'nearest'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })
    expect(index.findSnap(10.1, 0.1, 1)).toEqual({
      x: 10,
      y: 0,
      mode: 'endpoint'
    })
    expect(index.findSnap(5, 0.1, 1)?.mode).toBe('midpoint')
    expect(index.findSnap(5, 0.1, 1)?.x).toBeCloseTo(5, 5)
  })

  it('keeps bulge on a wide LWPOLYLINE path so arc nearest still works', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 1, 2, 2)
    polyline.addVertexAt(1, new AcGePoint2d(10, 0), 0, 2, 2)
    modelSpace.appendEntity(polyline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    if (path?.kind === 'path') {
      expect(path.vertices[2]).toBe(1)
    }

    const arc = new AcGeCircArc2d({ x: 0, y: 0 }, { x: 10, y: 0 }, 1)
    const index = new AcExOsnapIndex(['nearest'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })
    const mid = arc.midPoint
    const snap = index.findSnap(mid.x, mid.y, 1)
    expect(snap?.mode).toBe('nearest')
    expect(snap?.x).toBeCloseTo(mid.x, 5)
    expect(snap?.y).toBeCloseTo(mid.y, 5)
  })

  it('snaps nearest on both CCW and CW polyline bulge segments', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const polyline = new AcDbPolyline()
    // Shallow clockwise bulge (below the chord) then a CCW semicircle.
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), -Math.tan(Math.PI / 16))
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 1)
    polyline.addVertexAt(2, new AcGePoint2d(50, 0))
    modelSpace.appendEntity(polyline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'arc')).toHaveLength(2)

    const index = new AcExOsnapIndex(['nearest'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })

    const cw = new AcGeCircArc2d(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      -Math.tan(Math.PI / 16)
    )
    const ccw = new AcGeCircArc2d({ x: 40, y: 0 }, { x: 50, y: 0 }, 1)
    const cwMid = cw.midPoint
    const ccwMid = ccw.midPoint

    const cwSnap = index.findSnap(cwMid.x, cwMid.y, 1)
    expect(cwSnap?.mode).toBe('nearest')
    expect(cwSnap?.x).toBeCloseTo(cwMid.x, 5)
    expect(cwSnap?.y).toBeCloseTo(cwMid.y, 5)

    const ccwSnap = index.findSnap(ccwMid.x, ccwMid.y, 1)
    expect(ccwSnap?.mode).toBe('nearest')
    expect(ccwSnap?.x).toBeCloseTo(ccwMid.x, 5)
    expect(ccwSnap?.y).toBeCloseTo(ccwMid.y, 5)

    expect(index.findCircleOrArcNear(cwMid.x, cwMid.y, 1)?.r).toBeCloseTo(
      cw.radius,
      5
    )
    expect(index.findCircleOrArcNear(ccwMid.x, ccwMid.y, 1)?.r).toBeCloseTo(
      ccw.radius,
      5
    )
  })

  it('locks the polyline arc the cursor is closer to at a shared vertex', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), -Math.tan(Math.PI / 16))
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 1)
    polyline.addVertexAt(2, new AcGePoint2d(50, 0))
    modelSpace.appendEntity(polyline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const index = new AcExOsnapIndex(['nearest'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })

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
        y: origin.y + (iy / len) * dist
      }
    }

    const towardFirst = toward(first, false, 0.05)
    const towardSecond = toward(second, true, 0.05)
    expect(
      index.findCircleOrArcNear(towardFirst.x, towardFirst.y, 2)?.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      index.findCircleOrArcNear(towardSecond.x, towardSecond.y, 2)?.r
    ).toBeCloseTo(second.radius, 5)
  })

  it('omits dimension extension lines from the catalog (derived from batches at runtime)', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const modelSpace = db.tables.blockTable.modelSpace
    const generator = new AcDbDataGenerator(db)
    generator.createArrowBlock()

    const dimension = new AcDbAlignedDimension(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0),
      new AcGePoint3d(5, 2, 0)
    )
    const blockName = '*DIM_TEST'
    db.tables.blockTable.add(dimension.createDimBlock(blockName))
    dimension.dimBlockId = blockName
    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    expect(catalog.primitives.filter(p => p.kind === 'path')).toHaveLength(0)
  })

  it('exports points for text/point and omits ray/xline/trace/leader lines', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const modelSpace = db.tables.blockTable.modelSpace

    const ray = new AcDbRay()
    ray.basePoint = new AcGePoint3d(0, 0, 0)
    ray.unitDir = new AcGeVector3d(1, 0, 0)
    modelSpace.appendEntity(ray)

    const xline = new AcDbXline()
    xline.basePoint = new AcGePoint3d(0, 10, 0)
    xline.unitDir = new AcGeVector3d(0, 1, 0)
    modelSpace.appendEntity(xline)

    const trace = new AcDbTrace()
    trace.setPointAt(0, new AcGePoint3d(20, 0, 0))
    trace.setPointAt(1, new AcGePoint3d(30, 0, 0))
    trace.setPointAt(2, new AcGePoint3d(20, 10, 0))
    trace.setPointAt(3, new AcGePoint3d(30, 10, 0))
    modelSpace.appendEntity(trace)

    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint3d(40, 0, 0))
    leader.appendVertex(new AcGePoint3d(50, 10, 0))
    modelSpace.appendEntity(leader)

    const text = new AcDbText()
    text.position = new AcGePoint3d(60, 60, 0)
    modelSpace.appendEntity(text)

    const point = new AcDbPoint()
    point.position = new AcGePoint3d(70, 70, 0)
    modelSpace.appendEntity(point)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.some(p => p.kind === 'line')).toBe(false)
    const tracePath = catalog.primitives.find(p => p.kind === 'path')
    expect(tracePath?.kind).toBe('path')
    if (tracePath?.kind === 'path') {
      expect(tracePath.closed).toBe(true)
      expect(tracePath.vertices).toEqual([
        20, 0, 0, 30, 0, 0, 30, 10, 0, 20, 10, 0
      ])
    }
    expect(catalog.primitives.some(p => p.kind === 'point' && p.x === 60)).toBe(
      true
    )
    expect(catalog.primitives.some(p => p.kind === 'point' && p.x === 70)).toBe(
      true
    )
  })

  it('omits MLINE path lines from the catalog', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const mline = new AcDbMLine()
    mline.startPosition = new AcGePoint3d(0, 0, 0)
    mline.segments = [
      {
        position: new AcGePoint3d(10, 0, 0),
        direction: new AcGeVector3d(1, 0, 0),
        miterDirection: new AcGeVector3d(0, 1, 0),
        elements: [
          {
            parameterCount: 1,
            parameters: [0],
            fillCount: 0,
            fillParameters: []
          }
        ]
      },
      {
        position: new AcGePoint3d(10, 10, 0),
        direction: new AcGeVector3d(0, 1, 0),
        miterDirection: new AcGeVector3d(-1, 0, 0),
        elements: [
          {
            parameterCount: 1,
            parameters: [0],
            fillCount: 0,
            fillParameters: []
          }
        ]
      }
    ]
    modelSpace.appendEntity(mline)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
  })

  it('exports MLEADER text anchors and omits leader lines from the catalog', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const mleader = new AcDbMLeader()
    mleader.contentType = AcDbMLeaderContentType.MTextContent
    mleader.mtextContent = {
      text: 'Note',
      anchorPoint: new AcGePoint3d(20, 20, 0)
    }
    const leaderIndex = mleader.addLeader()
    mleader.addLeaderLine(leaderIndex, [
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 10, 0)
    ])
    modelSpace.appendEntity(mleader)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.some(p => p.kind === 'line')).toBe(false)
    expect(
      catalog.primitives.some(
        p => p.kind === 'point' && p.x === 20 && p.y === 20
      )
    ).toBe(true)

    const index = new AcExOsnapIndex()
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [0, 0, 0],
          positions: Float32Array.from([0, 0, 0, 10, 10, 0])
        }
      ],
      meshBatches: [],
      osnap: catalog
    })
    const snap = index.findSnap(0.1, 0.1, 5)
    expect(snap?.mode).toBe('endpoint')
    expect(snap?.x).toBeCloseTo(0, 5)
    expect(snap?.y).toBeCloseTo(0, 5)
  })

  it('exports hatch polyline boundary as one path', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const hatch = new AcDbHatch()
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 10 },
          { x: 0, y: 10 }
        ],
        true
      )
    )
    modelSpace.appendEntity(hatch)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    const paths = catalog.primitives.filter(p => p.kind === 'path')
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatchObject({
      kind: 'path',
      closed: true,
      vertices: [0, 0, 0, 20, 0, 0, 20, 10, 0, 0, 10, 0]
    })
  })

  it('exports hatch edge-loop lines as one path', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const hatch = new AcDbHatch()
    const loop = new AcGeLoop2d()
    loop.add(new AcGeLine2d(new AcGePoint2d(0, 0), new AcGePoint2d(10, 0)))
    loop.add(new AcGeLine2d(new AcGePoint2d(10, 0), new AcGePoint2d(10, 5)))
    loop.add(new AcGeLine2d(new AcGePoint2d(10, 5), new AcGePoint2d(0, 5)))
    loop.add(new AcGeLine2d(new AcGePoint2d(0, 5), new AcGePoint2d(0, 0)))
    hatch.add(loop)
    modelSpace.appendEntity(hatch)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    const paths = catalog.primitives.filter(p => p.kind === 'path')
    expect(paths).toHaveLength(1)
    expect(paths[0]?.kind).toBe('path')
    if (paths[0]?.kind === 'path') {
      expect(paths[0].closed).toBe(true)
      expect(paths[0].vertices.length).toBe(12)
    }
  })

  it('exports raster image insertion points and clip-frame path', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const image = new AcDbRasterImage()
    image.position = new AcGePoint3d(5, 5, 0)
    image.width = 20
    image.height = 10
    modelSpace.appendEntity(image)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    expect(
      catalog.primitives.some(p => p.kind === 'point' && p.x === 5 && p.y === 5)
    ).toBe(true)
    const frame = catalog.primitives.find(p => p.kind === 'path')
    expect(frame?.kind).toBe('path')
    if (frame?.kind === 'path') {
      expect(frame.closed).toBe(true)
      expect(frame.vertices).toEqual([5, 5, 0, 25, 5, 0, 25, 15, 0, 5, 15, 0])
    }
  })

  it('exports table insertion points and omits grid lines', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const table = new AcDbTable('SNAP_TABLE', 2, 2)
    table.position = new AcGePoint3d(10, 20, 0)
    table.setUniformRowHeight(5)
    table.setUniformColumnWidth(8)
    modelSpace.appendEntity(table)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
    expect(
      catalog.primitives.some(
        p => p.kind === 'point' && p.x === 10 && p.y === 20
      )
    ).toBe(true)
  })

  it('omits table anonymous-block lines from the catalog', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = '*T_SNAP_TABLE'
    db.tables.blockTable.add(blockRecord)
    blockRecord.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(12, 0, 0))
    )

    const table = new AcDbTable('*T_SNAP_TABLE', 1, 1)
    table.position = new AcGePoint3d(0, 0, 0)
    modelSpace.appendEntity(table)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(0)
  })

  it('indexes curve ACEO with lineBatches for hybrid snap', () => {
    const index = new AcExOsnapIndex()
    index.rebuild({
      btrId: 'ms',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [0, 0, 0],
          positions: Float32Array.from([0, 0, 0, 10, 0, 0])
        }
      ],
      meshBatches: [],
      osnap: {
        primitives: [
          {
            kind: 'circle',
            layer: '0',
            cx: 5,
            cy: 5,
            r: 2,
            normalSign: 1
          }
        ]
      }
    })

    const end = index.findSnap(0.1, 0.1, 2)
    expect(end?.mode).toBe('endpoint')
    expect(end?.x).toBeCloseTo(0, 5)

    const center = index.findSnap(5.1, 5.1, 2)
    expect(center?.mode).toBe('center')
    expect(center?.x).toBeCloseTo(5, 5)
  })

  it('transforms hatch paths inside INSERT and emits INS points', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'HATCH_BLOCK'
    db.tables.blockTable.add(blockRecord)
    const hatch = new AcDbHatch()
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 4 },
          { x: 0, y: 4 }
        ],
        true
      )
    )
    blockRecord.appendEntity(hatch)

    const insert = new AcDbBlockReference('HATCH_BLOCK')
    insert.position = new AcGePoint3d(100, 50, 0)
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(
      catalog.primitives.some(
        p => p.kind === 'point' && p.x === 100 && p.y === 50
      )
    ).toBe(true)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    if (path?.kind === 'path') {
      expect(path.vertices[0]).toBeCloseTo(100, 5)
      expect(path.vertices[1]).toBeCloseTo(50, 5)
      expect(path.vertices[3]).toBeCloseTo(110, 5)
    }
  })

  it('zeros path bulge under non-uniform INSERT scale (circular → chord)', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'HATCH_BULGE_NU'
    db.tables.blockTable.add(blockRecord)
    const hatch = new AcDbHatch()
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0, bulge: 1 },
          { x: 10, y: 0 },
          { x: 10, y: 4 },
          { x: 0, y: 4 }
        ],
        true
      )
    )
    blockRecord.appendEntity(hatch)

    const insert = new AcDbBlockReference('HATCH_BULGE_NU')
    insert.position = new AcGePoint3d(0, 0, 0)
    insert.scaleFactors = new AcGePoint3d(2, 1, 1)
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    if (path?.kind === 'path') {
      expect(path.vertices[0]).toBeCloseTo(0, 5)
      expect(path.vertices[3]).toBeCloseTo(20, 5)
      expect(path.vertices[2]).toBe(0)
    }
  })

  it('flips path bulge under mirrored INSERT', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'HATCH_BULGE_MIRROR'
    db.tables.blockTable.add(blockRecord)
    const hatch = new AcDbHatch()
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0, bulge: 1 },
          { x: 10, y: 0 },
          { x: 10, y: 4 },
          { x: 0, y: 4 }
        ],
        true
      )
    )
    blockRecord.appendEntity(hatch)

    const insert = new AcDbBlockReference('HATCH_BULGE_MIRROR')
    insert.position = new AcGePoint3d(0, 0, 0)
    insert.scaleFactors = new AcGePoint3d(-1, 1, 1)
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    if (path?.kind === 'path') {
      expect(path.vertices[2]).toBeCloseTo(-1, 5)
    }
  })

  it('emits one INS point per MINSERT instance', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'MINSERT_BLOCK'
    db.tables.blockTable.add(blockRecord)
    blockRecord.appendEntity(new AcDbPoint())

    const insert = new AcDbBlockReference('MINSERT_BLOCK')
    insert.position = new AcGePoint3d(0, 0, 0)
    insert.columnCount = 2
    insert.rowCount = 2
    insert.columnSpacing = 30
    insert.rowSpacing = 20
    modelSpace.appendEntity(insert)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const points = catalog.primitives.filter(p => p.kind === 'point')
    expect(points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'point', x: 0, y: 0 }),
        expect.objectContaining({ kind: 'point', x: 30, y: 0 }),
        expect.objectContaining({ kind: 'point', x: 0, y: 20 }),
        expect.objectContaining({ kind: 'point', x: 30, y: 20 })
      ])
    )
  })

  it('exports ATTRIB text points in parent space', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const modelSpace = db.tables.blockTable.modelSpace

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'ATTR_BLOCK'
    db.tables.blockTable.add(blockRecord)

    const insert = new AcDbBlockReference('ATTR_BLOCK')
    insert.position = new AcGePoint3d(40, 10, 0)
    modelSpace.appendEntity(insert)

    const attrib = new AcDbAttribute()
    attrib.position = new AcGePoint3d(45, 12, 0)
    insert.appendAttributes(attrib)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(
      catalog.primitives.some(
        p => p.kind === 'point' && p.x === 45 && p.y === 12
      )
    ).toBe(true)
  })

  it('snaps IMAGE clip vertices rather than the unclipped rectangle', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const image = new AcDbRasterImage()
    image.position = new AcGePoint3d(5, 5, 0)
    image.width = 20
    image.height = 10
    image.isClipped = true
    image.clipBoundary = [
      new AcGePoint2d(0, 0),
      new AcGePoint2d(1, 0),
      new AcGePoint2d(0.5, 1),
      new AcGePoint2d(0, 0)
    ]
    modelSpace.appendEntity(image)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    if (path?.kind === 'path') {
      expect(path.vertices).toEqual([5, 5, 0, 25, 5, 0, 15, 15, 0])
    }

    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })
    const snap = index.findSnap(15.1, 14.9, 1)
    expect(snap).toEqual({ x: 15, y: 15, mode: 'endpoint' })
  })

  it('skips SOLID fills inside dimension blocks but keeps layout SOLID paths', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const solid = new AcDbSolid()
    solid.setPointAt(0, new AcGePoint3d(0, 0, 0))
    solid.setPointAt(1, new AcGePoint3d(2, 0, 0))
    solid.setPointAt(2, new AcGePoint3d(0, 1, 0))
    solid.setPointAt(3, new AcGePoint3d(2, 1, 0))
    modelSpace.appendEntity(solid)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.filter(p => p.kind === 'path')).toHaveLength(1)
  })

  it('exports OLE frame corners as a path', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace
    const ole = new AcDbOle2Frame()
    ole.setLocation(new AcGePoint3d(0, 10, 0))
    ole.setWcsWidth(8)
    ole.setWcsHeight(4)
    modelSpace.appendEntity(ole)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const path = catalog.primitives.find(p => p.kind === 'path')
    expect(path?.kind).toBe('path')
    expect(
      catalog.primitives.some(p => p.kind === 'point' && p.x === 0 && p.y === 10)
    ).toBe(true)
  })
})
