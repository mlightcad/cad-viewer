/**
 * @jest-environment node
 */
import {
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbBlockReference,
  AcDbCircle,
  AcDbDatabase,
  type AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbText,
  AcGeMatrix3d,
  AcGePoint3d} from '@mlightcad/data-model'

import {
  acapAllocateBlockName,
  acapConvertSmartBlock,
  acapFindEquivalentBlocks,
  acapInvertAffine2d,
  AcApSmartBlockSearch,
  acapValidateNewBlockName} from '../src/smartBlock'
import { acapRunDatabaseEdit } from '../src/util/AcApDatabaseEdit'

/** Door-like symbol: frame, leaf, marker circle and optional label. */
function symbolEntities(label?: string): AcDbEntity[] {
  const entities: AcDbEntity[] = [
    new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0)),
    new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(0, 4, 0)),
    new AcDbCircle(new AcGePoint3d(8, 3, 0), 1)
  ]
  if (label !== undefined) {
    const text = new AcDbText()
    text.textString = label
    text.height = 1
    text.position = new AcGePoint3d(2, 1, 0)
    entities.push(text)
  }
  return entities
}

function place(
  db: AcDbDatabase,
  matrix: AcGeMatrix3d,
  label?: string
): string[] {
  const entities = symbolEntities(label).map(e => e.transformBy(matrix))
  db.tables.blockTable.modelSpace.appendEntity(entities)
  return entities.map(e => e.objectId)
}

const at = (x: number, y: number, angle = 0) =>
  new AcGeMatrix3d()
    .makeTranslation(x, y, 0)
    .multiply(new AcGeMatrix3d().makeRotationZ(angle))

const mirroredAt = (x: number, y: number) =>
  at(x, y).multiply(new AcGeMatrix3d().makeScale(1, -1, 1))

function modelSpaceOf(db: AcDbDatabase) {
  return [...db.tables.blockTable.modelSpace.newIterator()]
}

describe('Smart Blocks search and convert', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
  })

  test('finds translated, rotated and mirrored copies', () => {
    const source = place(db, at(0, 0))
    place(db, at(100, 0))
    place(db, at(0, 100, Math.PI / 2))
    place(db, mirroredAt(200, 0))
    // Different geometry: a longer leaf.
    db.tables.blockTable.modelSpace.appendEntity(
      new AcDbLine(new AcGePoint3d(300, 0, 0), new AcGePoint3d(300, 5, 0))
    )

    const search = new AcApSmartBlockSearch(db, source)
    expect(search.matches).toHaveLength(3)
    expect(search.matches.filter(m => m.mirrored)).toHaveLength(1)

    search.setOptions({ allowMirror: false })
    expect(search.matches).toHaveLength(2)
  })

  test('does not match copies on other layers unless asked', () => {
    const source = place(db, at(0, 0))
    const other = place(db, at(100, 0))
    other.forEach(id => {
      db.tables.blockTable.getEntityById(id)!.layer = 'OTHER'
    })
    expect(new AcApSmartBlockSearch(db, source).matches).toHaveLength(0)
    expect(
      new AcApSmartBlockSearch(db, source, { matchLayer: false }).matches
    ).toHaveLength(1)
  })

  test('converts source and included copies into one new block', () => {
    const source = place(db, at(0, 0))
    place(db, at(100, 0))
    place(db, at(0, 100, Math.PI / 2))
    place(db, mirroredAt(200, 0))
    const search = new AcApSmartBlockSearch(db, source)
    // Exclude the copy at x = 100 (sorted left to right: 0, 100, 200).
    const excluded = search.matches.findIndex(
      m => Math.abs(m.transform.e - 100) < 1e-6
    )
    search.setIncluded(excluded, false)

    const name = acapAllocateBlockName(db, 'Door')
    expect(name).toBe('Door1')
    const result = acapConvertSmartBlock(db, search.template, search.matches, {
      target: { kind: 'new', name, basePoint: { x: 0, y: 0 } }
    })

    expect(result.references).toHaveLength(3)
    expect(result.erasedCount).toBe(9)
    const record = db.tables.blockTable.getAt(name)!
    expect([...record.newIterator()]).toHaveLength(3)

    const inserts = modelSpaceOf(db).filter(
      e => e instanceof AcDbBlockReference
    ) as AcDbBlockReference[]
    expect(inserts).toHaveLength(3)
    const rotated = inserts.find(r => Math.abs(r.rotation - Math.PI / 2) < 1e-9)
    expect(rotated?.position.x).toBeCloseTo(0)
    expect(rotated?.position.y).toBeCloseTo(100)
    const mirrored = inserts.find(r => r.scaleFactors.y < 0)
    expect(mirrored?.position.x).toBeCloseTo(200)
    // The excluded copy stays as loose geometry.
    expect(modelSpaceOf(db).filter(e => e instanceof AcDbLine)).toHaveLength(2)
    expect(acapValidateNewBlockName(db, name)).toBe('exists')
  })

  test('source objects only leaves the copies alone', () => {
    const source = place(db, at(0, 0))
    place(db, at(100, 0))
    const search = new AcApSmartBlockSearch(db, source)
    const result = acapConvertSmartBlock(db, search.template, search.matches, {
      target: { kind: 'new', name: 'B', basePoint: { x: 5, y: 2 } },
      sourceOnly: true
    })
    expect(result.references).toHaveLength(1)
    expect(result.references[0].position.x).toBeCloseTo(5)
    expect(modelSpaceOf(db).filter(e => e instanceof AcDbLine)).toHaveLength(2)
  })

  test('the whole conversion undoes in one step', () => {
    const source = place(db, at(0, 0))
    place(db, at(100, 0))
    const before = modelSpaceOf(db).length
    const search = new AcApSmartBlockSearch(db, source)
    acapRunDatabaseEdit(db, 'BSEARCH', () => {
      acapConvertSmartBlock(db, search.template, search.matches, {
        target: { kind: 'new', name: 'U', basePoint: { x: 0, y: 0 } }
      })
    })
    expect(modelSpaceOf(db)).toHaveLength(2)
    expect(db.transactionManager.undo()).toBe(true)
    expect(modelSpaceOf(db)).toHaveLength(before)
    expect(modelSpaceOf(db).some(e => e instanceof AcDbBlockReference)).toBe(
      false
    )
  })

  test('text variations become attributes', () => {
    const source = place(db, at(0, 0), '101')
    place(db, at(100, 0), '101')
    place(db, at(200, 0), '102')

    const exact = new AcApSmartBlockSearch(db, source)
    expect(exact.matches).toHaveLength(1)

    const search = new AcApSmartBlockSearch(db, source, {
      textVariations: true
    })
    expect(search.matches).toHaveLength(2)
    expect(search.variableTexts).toEqual([3])

    const result = acapConvertSmartBlock(db, search.template, search.matches, {
      target: {
        kind: 'new',
        name: 'ROOM',
        basePoint: { x: 0, y: 0 },
        attributes: [{ index: 3, tag: 'NUMBER', prompt: 'Room number' }]
      }
    })
    const def = [...db.tables.blockTable.getAt('ROOM')!.newIterator()].find(
      e => e instanceof AcDbAttributeDefinition
    ) as AcDbAttributeDefinition
    expect(def.tag).toBe('NUMBER')
    expect(def.prompt).toBe('Room number')
    const values = result.references.map(ref => {
      const attrs = [...ref.attributeIterator()] as AcDbAttribute[]
      return attrs.map(a => `${a.tag}=${a.textString}`).join()
    })
    expect(values.sort()).toEqual(['NUMBER=101', 'NUMBER=101', 'NUMBER=102'])
  })

  test('finds references of an equivalent block and converts into it', () => {
    // Define DOOR from a rotated copy of the symbol around its own origin.
    const defSource = place(db, at(500, 500, Math.PI / 2))
    const defSearch = new AcApSmartBlockSearch(db, defSource)
    acapConvertSmartBlock(db, defSearch.template, [], {
      target: { kind: 'new', name: 'DOOR', basePoint: { x: 500, y: 500 } }
    })

    const source = place(db, at(0, 0))
    place(db, at(100, 0, Math.PI))
    const search = new AcApSmartBlockSearch(db, source, {
      includeExistingBlocks: true
    })
    expect(search.matches).toHaveLength(2)
    expect(search.matches.filter(m => m.blockReference)).toHaveLength(1)

    const [equivalent] = acapFindEquivalentBlocks(db, search.template)
    expect(equivalent.blockName).toBe('DOOR')
    const result = acapConvertSmartBlock(db, search.template, search.matches, {
      target: {
        kind: 'existing',
        blockName: 'DOOR',
        placement: acapInvertAffine2d(equivalent.transform)
      }
    })
    expect(result.references).toHaveLength(3)
    // The source symbol is unrotated; DOOR holds it rotated by 90°, so its
    // reference must turn back by -90° to cover the source.
    const sourceRef = result.references[0]
    expect(Math.cos(sourceRef.rotation)).toBeCloseTo(0)
    expect(Math.sin(sourceRef.rotation)).toBeCloseTo(-1)
    expect(sourceRef.position.x).toBeCloseTo(0)
    expect(sourceRef.position.y).toBeCloseTo(0)
    expect(
      modelSpaceOf(db).filter(e => e instanceof AcDbBlockReference)
    ).toHaveLength(3)
  })
})
