import { AcDbDxfCode, AcDbLine, AcGePoint3d } from '@mlightcad/data-model'

import { AcEdSelectionFilter } from '../src/editor/input/AcEdSelectionFilter'

describe('AcEdSelectionFilter', () => {
  const createLine = (objectId: string, layer = '0') => {
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    line.objectId = objectId
    line.layer = layer
    return line
  }

  test('matches entity by handle (objectId)', () => {
    const entity = createLine('1A2B')
    const filter = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Handle, value: '1a2b' }
    ])

    expect(filter.matches(entity)).toBe(true)
  })

  test('rejects entity when handle does not match', () => {
    const entity = createLine('1A2B')
    const filter = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Handle, value: 'FFFF' }
    ])

    expect(filter.matches(entity)).toBe(false)
  })

  test('supports notEquals operator for handle', () => {
    const entity = createLine('100')
    const equalsFilter = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Operator, value: '!=' },
      { code: AcDbDxfCode.Handle, value: '100' }
    ])
    const otherFilter = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Operator, value: '!=' },
      { code: AcDbDxfCode.Handle, value: '101' }
    ])

    expect(equalsFilter.matches(entity)).toBe(false)
    expect(otherFilter.matches(entity)).toBe(true)
  })

  test('ANDs handle with other clauses', () => {
    const entity = createLine('ABC', 'Wall')
    const matching = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Handle, value: 'abc' },
      { code: AcDbDxfCode.LayerName, value: 'Wall' }
    ])
    const mismatching = new AcEdSelectionFilter([
      { code: AcDbDxfCode.Handle, value: 'abc' },
      { code: AcDbDxfCode.LayerName, value: 'Door' }
    ])

    expect(matching.matches(entity)).toBe(true)
    expect(mismatching.matches(entity)).toBe(false)
  })

  test('compares handles as strings, not numbers', () => {
    // Digit-only / scientific-looking handles must not collapse via Number().
    const padded = createLine('0100')
    const scientific = createLine('1e2')

    expect(
      new AcEdSelectionFilter([
        { code: AcDbDxfCode.Handle, value: '100' }
      ]).matches(padded)
    ).toBe(false)
    expect(
      new AcEdSelectionFilter([
        { code: AcDbDxfCode.Handle, value: '0100' }
      ]).matches(padded)
    ).toBe(true)
    expect(
      new AcEdSelectionFilter([
        { code: AcDbDxfCode.Handle, value: '100' }
      ]).matches(scientific)
    ).toBe(false)
  })
})
