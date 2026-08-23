import {
  AcCmColor,
  AcDbDatabase,
  AcDbHatch,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbText,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  ACAP_COMPAREPROPS_COLOR,
  acapCompareDrawings,
  acapToleranceFromCompareTolerance
} from '../src/compare'

function createDb(): AcDbDatabase {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function addLine(
  db: AcDbDatabase,
  start: [number, number],
  end: [number, number]
): AcDbLine {
  const line = new AcDbLine(
    new AcGePoint3d(start[0], start[1], 0),
    new AcGePoint3d(end[0], end[1], 0)
  )
  db.tables.blockTable.modelSpace.appendEntity(line)
  return line
}

function setAci(entity: AcDbLine, index: number) {
  const color = new AcCmColor()
  color.colorIndex = index
  entity.color = color
}

describe('acapCompareDrawings AutoCAD COMPARE sysvars', () => {
  it('ignores object color changes when COMPAREPROPS is 0', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    const left = addLine(leftDb, [0, 0], [10, 0])
    const right = addLine(rightDb, [0, 0], [10, 0])
    right.objectId = left.objectId
    setAci(left, 1)
    setAci(right, 3)

    const ignored = acapCompareDrawings(leftDb, rightDb, {
      compareProps: 0,
      includeUnchanged: true
    })
    expect(ignored.modified).toHaveLength(0)
    expect(ignored.unchanged).toHaveLength(2)

    const counted = acapCompareDrawings(leftDb, rightDb, {
      compareProps: ACAP_COMPAREPROPS_COLOR,
      includeUnchanged: true
    })
    expect(counted.modified).toHaveLength(2)
    expect(counted.modified[0]?.changes?.some(c => c.field === 'color')).toBe(
      true
    )
  })

  it('does not treat layer-name identity as a property when COMPAREPROPS omits Layer', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    const left = addLine(leftDb, [0, 0], [10, 0])
    const right = addLine(rightDb, [0, 0], [10, 0])
    right.objectId = left.objectId
    left.layer = 'WALL'
    right.layer = 'DOOR'

    const result = acapCompareDrawings(leftDb, rightDb, {
      compareProps: 0,
      includeUnchanged: true
    })
    expect(result.modified).toHaveLength(0)
    expect(result.unchanged).toHaveLength(2)
  })

  it('excludes hatch objects when COMPAREHATCH is 0', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    const leftLine = addLine(leftDb, [0, 0], [10, 0])
    const rightLine = addLine(rightDb, [0, 0], [10, 0])
    rightLine.objectId = leftLine.objectId
    const hatch = new AcDbHatch()
    rightDb.tables.blockTable.modelSpace.appendEntity(hatch)

    const excluded = acapCompareDrawings(leftDb, rightDb, { compareHatch: 0 })
    expect(excluded.added).toHaveLength(0)

    const included = acapCompareDrawings(leftDb, rightDb, { compareHatch: 1 })
    expect(included.added.some(h => h.dxfType === 'HATCH')).toBe(true)
  })

  it('excludes text objects when COMPARETEXT is 0', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    const leftLine = addLine(leftDb, [0, 0], [10, 0])
    const rightLine = addLine(rightDb, [0, 0], [10, 0])
    rightLine.objectId = leftLine.objectId
    const text = new AcDbText()
    text.textString = 'hello'
    rightDb.tables.blockTable.modelSpace.appendEntity(text)

    const excluded = acapCompareDrawings(leftDb, rightDb, { compareText: 0 })
    expect(excluded.added).toHaveLength(0)

    const included = acapCompareDrawings(leftDb, rightDb, { compareText: 1 })
    expect(included.added.some(h => h.dxfType === 'TEXT')).toBe(true)
  })

  it('uses COMPARETOLERANCE decimal places as geometric precision', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    const left = addLine(leftDb, [0, 0], [10, 0])
    const right = addLine(rightDb, [0, 0], [10, 1e-5])
    right.objectId = left.objectId

    const coarse = acapCompareDrawings(leftDb, rightDb, {
      compareTolerance: 4,
      includeUnchanged: true
    })
    expect(coarse.modified).toHaveLength(0)
    expect(coarse.unchanged).toHaveLength(2)

    const fine = acapCompareDrawings(leftDb, rightDb, {
      compareTolerance: 6,
      includeUnchanged: true
    })
    expect(fine.modified.length).toBeGreaterThan(0)
  })

  it('builds revision-cloud change sets from COMPARERCMARGIN', () => {
    const leftDb = createDb()
    const rightDb = createDb()
    addLine(leftDb, [0, 0], [10, 0])
    addLine(rightDb, [1000, 1000], [1010, 1000])

    const result = acapCompareDrawings(leftDb, rightDb, {
      compareRcMargin: 5
    })
    expect(result.navigation.length).toBeGreaterThan(0)
    expect(result.changeSets.length).toBeGreaterThan(0)
  })

  it('converts COMPARETOLERANCE 6 to 1e-6', () => {
    expect(acapToleranceFromCompareTolerance(6)).toBeCloseTo(1e-6, 12)
    expect(acapToleranceFromCompareTolerance(0)).toBe(1)
  })
})
