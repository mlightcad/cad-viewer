import {
  AcDbAlignedDimension,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbDataGenerator,
  AcDbLine,
  AcGePoint3d,
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
})
