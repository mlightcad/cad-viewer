import {
  AcDbAlignedDimension,
  AcDbCircle,
  AcDbDatabase,
  AcDbDimStyleTableRecord,
  AcDbLine,
  AcDbMText,
  AcDbRotatedDimension,
  AcGePoint3d,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import {
  allocateDimBlockName,
  applyCurrentDimStyle,
  commitDimBlock,
  definitionPointsFromEntity,
  DIM_PREVIEW_BLOCK,
  inferLinearRotation,
  rebuildPreviewBlock,
  removePreviewBlock
} from '../src/command/draw/AcApDimBlockUtil'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcApDimCmdUtil', () => {
  it('allocates increasing *D block names', () => {
    const db = createDb()
    expect(allocateDimBlockName(db)).toBe('*D1')
    const dim = new AcDbAlignedDimension(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0),
      new AcGePoint3d(5, 5, 0)
    )
    applyCurrentDimStyle(dim, db)
    commitDimBlock(db, dim)
    expect(allocateDimBlockName(db)).toBe('*D2')
  })

  it('rebuilds and removes preview *UDIM block', () => {
    const db = createDb()
    const dim = new AcDbRotatedDimension(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(20, 0, 0),
      new AcGePoint3d(10, 8, 0)
    )
    applyCurrentDimStyle(dim, db)
    rebuildPreviewBlock(db, dim)
    expect(db.tables.blockTable.getAt(DIM_PREVIEW_BLOCK)).toBeTruthy()
    removePreviewBlock(db)
    expect(db.tables.blockTable.getAt(DIM_PREVIEW_BLOCK)).toBeFalsy()
  })

  it('infers horizontal vs vertical rotation from dim line placement', () => {
    expect(
      inferLinearRotation(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 5, y: 8, z: 0 }
      )
    ).toBe(0)
    expect(
      inferLinearRotation(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 20, y: 1, z: 0 }
      )
    ).toBeCloseTo(Math.PI / 2)
  })

  it('extracts definition points from line and circle', () => {
    const line = new AcDbLine(
      new AcGePoint3d(1, 2, 0),
      new AcGePoint3d(4, 6, 0)
    )
    const fromLine = definitionPointsFromEntity(line)
    expect(fromLine?.xLine1Point).toMatchObject({ x: 1, y: 2, z: 0 })
    expect(fromLine?.xLine2Point).toMatchObject({ x: 4, y: 6, z: 0 })

    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
    const fromCircle = definitionPointsFromEntity(circle)
    expect(fromCircle?.xLine1Point).toMatchObject({ x: -5, y: 0, z: 0 })
    expect(fromCircle?.xLine2Point).toMatchObject({ x: 5, y: 0, z: 0 })
  })

  it('applies database dimstyle and respects dimtxt in committed block', () => {
    const db = createDb()
    const style = new AcDbDimStyleTableRecord({
      name: 'Tall',
      dimtxt: 4,
      dimscale: 2,
      dimasz: 1
    })
    db.tables.dimStyleTable.add(style)
    db.dimstyle = 'Tall'

    const dim = new AcDbAlignedDimension(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(30, 0, 0),
      new AcGePoint3d(15, 10, 0)
    )
    applyCurrentDimStyle(dim, db)
    expect(dim.dimensionStyleName).toBe('Tall')
    const name = commitDimBlock(db, dim)
    const block = db.tables.blockTable.getAt(name)!
    const mtexts = [...block.newIterator()].filter(
      (e): e is AcDbMText => e instanceof AcDbMText
    )
    expect(mtexts.length).toBeGreaterThanOrEqual(1)
    expect(mtexts[0].height).toBeCloseTo(8, 5)
  })
})
