import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  ACED_MAX_ACQUIRED_CENTER_MARKS,
  canonicalGsMark,
  gsMarkOccurrence,
  mergeAcquiredCenterMarks,
  resolveBlockSubEntity,
  type AcEdOsnapCenterMark
} from '../src/editor/input/AcEdOsnapCenterMarks'

function mark(x: number, y = 0): AcEdOsnapCenterMark {
  return { x, y, z: 0 }
}

describe('gsMark helpers', () => {
  it('parses canonical id and occurrence from spatial-index suffixes', () => {
    expect(canonicalGsMark('abc')).toBe('abc')
    expect(canonicalGsMark('abc#1')).toBe('abc')
    expect(gsMarkOccurrence('abc')).toBe(0)
    expect(gsMarkOccurrence('abc#1')).toBe(1)
    expect(gsMarkOccurrence('abc#12')).toBe(12)
  })
})

describe('resolveBlockSubEntity', () => {
  it('resolves the Nth duplicate nested INSERT instance (#745)', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()

    const cell = new AcDbBlockTableRecord()
    cell.name = 'CELL_745'
    db.tables.blockTable.add(cell)
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    cell.appendEntity(line)

    const row = new AcDbBlockTableRecord()
    row.name = 'ROW_745'
    db.tables.blockTable.add(row)
    for (const x of [0, 100]) {
      const nested = new AcDbBlockReference('CELL_745')
      nested.position = new AcGePoint3d(x, 0, 0)
      row.appendEntity(nested)
    }

    const ref = new AcDbBlockReference('ROW_745')
    db.tables.blockTable.modelSpace.appendEntity(ref)

    const first = resolveBlockSubEntity(ref, line.objectId)
    expect(first).toBeDefined()
    const firstOrigin = new AcGePoint3d(0, 0, 0).applyMatrix4(first!.transform)
    expect(firstOrigin.x).toBeCloseTo(0)
    expect(firstOrigin.y).toBeCloseTo(0)

    const second = resolveBlockSubEntity(ref, `${line.objectId}#1`)
    expect(second).toBeDefined()
    const secondOrigin = new AcGePoint3d(0, 0, 0).applyMatrix4(
      second!.transform
    )
    expect(secondOrigin.x).toBeCloseTo(100)
    expect(secondOrigin.y).toBeCloseTo(0)

    const byHint = resolveBlockSubEntity(ref, line.objectId, undefined, {
      x: 100.5,
      y: 0,
      z: 0
    })
    expect(byHint).toBeDefined()
    const hintOrigin = new AcGePoint3d(0, 0, 0).applyMatrix4(byHint!.transform)
    expect(hintOrigin.x).toBeCloseTo(100)
  })

  it('hint-prunes elevated nested INSERTs using XY only (#745)', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()

    const cell = new AcDbBlockTableRecord()
    cell.name = 'CELL_745_Z'
    db.tables.blockTable.add(cell)
    // Geometry at z=50 so nested INSERT extents exclude hint z=0.
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 50),
      new AcGePoint3d(1, 0, 50)
    )
    cell.appendEntity(line)

    const row = new AcDbBlockTableRecord()
    row.name = 'ROW_745_Z'
    db.tables.blockTable.add(row)
    for (const x of [0, 100]) {
      const nested = new AcDbBlockReference('CELL_745_Z')
      nested.position = new AcGePoint3d(x, 0, 0)
      row.appendEntity(nested)
    }

    const ref = new AcDbBlockReference('ROW_745_Z')
    db.tables.blockTable.modelSpace.appendEntity(ref)

    // Sanity: nested INSERT extents sit at z=50, so a full 3D containsPoint
    // with the spatial hint (z: 0) would reject every candidate.
    const nestedRefs = [...row.newIterator()].filter(
      e => e instanceof AcDbBlockReference
    ) as AcDbBlockReference[]
    expect(nestedRefs).toHaveLength(2)
    expect(
      nestedRefs[1]!.geometricExtents.containsPoint({ x: 100.5, y: 0, z: 0 })
    ).toBe(false)

    const byHint = resolveBlockSubEntity(ref, line.objectId, undefined, {
      x: 100.5,
      y: 0,
      z: 0
    })
    expect(byHint).toBeDefined()
    const hintOrigin = new AcGePoint3d(0, 0, 0).applyMatrix4(byHint!.transform)
    expect(hintOrigin.x).toBeCloseTo(100)
    expect(byHint!.entity.objectId).toBe(line.objectId)
  })
})

describe('mergeAcquiredCenterMarks', () => {
  it('returns the same array when nothing new is hovered', () => {
    const existing = [mark(1), mark(2)]
    expect(mergeAcquiredCenterMarks(existing, [])).toBe(existing)
  })

  it('keeps unique centers and ignores duplicates', () => {
    const existing = [mark(0)]
    const merged = mergeAcquiredCenterMarks(existing, [mark(0), mark(10)])
    expect(merged).toHaveLength(2)
    expect(merged[0]?.x).toBe(0)
    expect(merged[1]?.x).toBe(10)
  })

  it('caps acquired ticks so a fast sweep cannot grow without bound', () => {
    let marks: AcEdOsnapCenterMark[] = []
    for (let i = 0; i < ACED_MAX_ACQUIRED_CENTER_MARKS + 8; i++) {
      marks = mergeAcquiredCenterMarks(marks, [mark(i * 100)])
    }
    expect(marks).toHaveLength(ACED_MAX_ACQUIRED_CENTER_MARKS)
    expect(marks[0]?.x).toBe(8 * 100)
    expect(marks[marks.length - 1]?.x).toBe(
      (ACED_MAX_ACQUIRED_CENTER_MARKS + 7) * 100
    )
  })
})
