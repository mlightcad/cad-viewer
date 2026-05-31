import {
  AcDbAlignedDimension,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbDataGenerator,
  AcDbHatch,
  AcDbLeader,
  AcDbLine,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLine,
  AcDbPoint,
  AcDbRasterImage,
  AcDbRay,
  AcDbTable,
  AcDbText,
  AcDbTrace,
  AcDbXline,
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
  it('exports snap primitives for geometry inside block references', () => {
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
    const line = catalog.primitives.find(p => p.kind === 'line')
    expect(line).toEqual({
      kind: 'line',
      layer: '0',
      x0: 100,
      y0: 50,
      x1: 110,
      y1: 50
    })
  })

  it('exports snap primitives for rotated block references', () => {
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
    const line = catalog.primitives.find(p => p.kind === 'line')
    expect(line?.x0).toBeCloseTo(0, 5)
    expect(line?.y0).toBeCloseTo(0, 5)
    expect(line?.x1).toBeCloseTo(0, 5)
    expect(line?.y1).toBeCloseTo(10, 5)
  })

  it('exports snap primitives for dimension anonymous blocks', () => {
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
    modelSpace.appendEntity(dimension)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    expect(catalog.primitives.length).toBeGreaterThan(0)

    const extensionLine = catalog.primitives.find(
      (p): p is Extract<typeof p, { kind: 'line' }> =>
        p.kind === 'line' &&
        Math.abs(p.x0) < 1e-10 &&
        Math.abs(p.x1) < 1e-10 &&
        p.y0 < p.y1
    )
    expect(extensionLine).toBeDefined()

    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild({
      btrId: modelSpace.objectId,
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })

    const endpointSnap = index.findSnap(0.1, extensionLine!.y0 + 0.05, 1)
    expect(endpointSnap?.mode).toBe('endpoint')
    expect(endpointSnap?.x).toBeCloseTo(0, 5)
    expect(endpointSnap?.y).toBeCloseTo(extensionLine!.y0, 5)
  })

  it('exports snap primitives for ray, xline, trace, leader, text, and point', () => {
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
    trace.setPointAt(2, new AcGePoint3d(30, 10, 0))
    trace.setPointAt(3, new AcGePoint3d(20, 10, 0))
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
    expect(catalog.primitives.some(p => p.kind === 'line')).toBe(true)
    expect(catalog.primitives.some(p => p.kind === 'point' && p.x === 60)).toBe(
      true
    )
    expect(catalog.primitives.some(p => p.kind === 'point' && p.x === 70)).toBe(
      true
    )
  })

  it('exports snap primitives for MLINE reference path', () => {
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
    const lines = catalog.primitives.filter(p => p.kind === 'line')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      kind: 'line',
      layer: '0',
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 0
    })
    expect(lines[1]).toMatchObject({
      kind: 'line',
      x0: 10,
      y0: 0,
      x1: 10,
      y1: 10
    })
  })

  it('exports snap primitives for MLEADER leader lines and text anchor', () => {
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
    expect(catalog.primitives.some(p => p.kind === 'line')).toBe(true)
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
      lineBatches: [],
      meshBatches: [],
      osnap: catalog
    })
    const snap = index.findSnap(0.1, 0.1, 5)
    expect(snap?.mode).toBe('endpoint')
    expect(snap?.x).toBeCloseTo(0, 5)
    expect(snap?.y).toBeCloseTo(0, 5)
  })

  it('exports snap primitives for hatch boundary loops', () => {
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
    const lines = catalog.primitives.filter(p => p.kind === 'line')
    expect(lines.length).toBeGreaterThanOrEqual(4)
    expect(
      lines.some(p => p.x0 === 0 && p.y0 === 0 && p.x1 === 20 && p.y1 === 0)
    ).toBe(true)
  })

  it('exports snap primitives for hatch edge loops with arcs', () => {
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
    expect(catalog.primitives.filter(p => p.kind === 'line')).toHaveLength(4)
  })

  it('exports snap primitives for raster image frame boundary', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const image = new AcDbRasterImage()
    image.position = new AcGePoint3d(5, 5, 0)
    image.width = 20
    image.height = 10
    modelSpace.appendEntity(image)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const lines = catalog.primitives.filter(p => p.kind === 'line')
    expect(lines.length).toBeGreaterThanOrEqual(4)
    expect(
      catalog.primitives.some(p => p.kind === 'point' && p.x === 5 && p.y === 5)
    ).toBe(true)
  })

  it('exports snap primitives for procedural table grid lines', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const table = new AcDbTable('SNAP_TABLE', 2, 2)
    table.position = new AcGePoint3d(10, 20, 0)
    table.setUniformRowHeight(5)
    table.setUniformColumnWidth(8)
    modelSpace.appendEntity(table)

    const catalog = buildOsnapCatalog(db, modelSpace.objectId)
    const lines = catalog.primitives.filter(p => p.kind === 'line')
    expect(lines.length).toBeGreaterThanOrEqual(6)
    expect(
      catalog.primitives.some(
        p => p.kind === 'point' && p.x === 10 && p.y === 20
      )
    ).toBe(true)
  })

  it('exports snap primitives for table anonymous blocks', () => {
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
    const line = catalog.primitives.find(p => p.kind === 'line')
    expect(line).toMatchObject({
      kind: 'line',
      x0: 0,
      y0: 0,
      x1: 12,
      y1: 0
    })
  })
})
