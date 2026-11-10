import {
  AcDbDatabase,
  AcDbHatchPatternType,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import {
  acapPdfCreatePatternHatch,
  acapPdfCreateSolidHatch,
  acapPdfEnsureDashLinetype,
  acapPdfEnsureTextStyle,
  acapPdfFitWidthFactor,
  acapPdfFontFamily,
  acapPdfShapeToLoop,
  PDF_DASH_LINETYPE_PREFIX
} from '../src/pdfImportEntities'

function createDb() {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('PDF import entities', () => {
  it('creates one dash linetype per pattern', () => {
    const db = createDb()
    const a = acapPdfEnsureDashLinetype(db, [2, 1])
    const b = acapPdfEnsureDashLinetype(db, [2, 1])
    const c = acapPdfEnsureDashLinetype(db, [4, 1])
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a.startsWith(PDF_DASH_LINETYPE_PREFIX)).toBe(true)
    const record = db.tables.linetypeTable.getAt(a)!
    expect(record.numDashes).toBe(2)
    expect([record.dashLengthAt(0), record.dashLengthAt(1)]).toEqual([2, -1])
    expect(record.patternLength).toBeCloseTo(3, 9)
  })

  it('builds loops only for closed shapes', () => {
    expect(
      acapPdfShapeToLoop({ kind: 'circle', center: { x: 0, y: 0 }, radius: 5 })
    ).toBeDefined()
    expect(
      acapPdfShapeToLoop({
        kind: 'polyline',
        closed: true,
        vertices: [
          { x: 0, y: 0, bulge: 0 },
          { x: 10, y: 0, bulge: 1 },
          { x: 10, y: 10, bulge: 0 }
        ]
      })
    ).toBeDefined()
    expect(
      acapPdfShapeToLoop({
        kind: 'line',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 }
      })
    ).toBeUndefined()
    expect(
      acapPdfShapeToLoop({
        kind: 'polyline',
        closed: false,
        vertices: [
          { x: 0, y: 0, bulge: 0 },
          { x: 10, y: 0, bulge: 0 },
          { x: 10, y: 10, bulge: 0 }
        ]
      })
    ).toBeUndefined()
  })

  it('fills closed two-vertex outlines that have a bulge', () => {
    // A rounded tab: a semicircle closed by its chord.
    expect(
      acapPdfShapeToLoop({
        kind: 'polyline',
        closed: true,
        vertices: [
          { x: 0, y: 0, bulge: 1 },
          { x: 10, y: 0, bulge: 0 }
        ]
      })
    ).toBeDefined()
    // Two straight vertices enclose nothing.
    expect(
      acapPdfShapeToLoop({
        kind: 'polyline',
        closed: true,
        vertices: [
          { x: 0, y: 0, bulge: 0 },
          { x: 10, y: 0, bulge: 0 }
        ]
      })
    ).toBeUndefined()
  })

  it('creates a solid hatch with holes from several loops', () => {
    const db = createDb()
    const square = (s: number) =>
      acapPdfShapeToLoop({
        kind: 'polyline',
        closed: true,
        vertices: [
          { x: -s, y: -s, bulge: 0 },
          { x: s, y: -s, bulge: 0 },
          { x: s, y: s, bulge: 0 },
          { x: -s, y: s, bulge: 0 }
        ]
      })!
    const hatch = acapPdfCreateSolidHatch(db, [square(10), square(4)])!
    expect(hatch.isSolidFill).toBe(true)
    expect(hatch.patternName).toBe('SOLID')
    // Nothing backs the loops; HPASSOC must not make it associative.
    expect(hatch.associative).toBe(false)
    expect(acapPdfCreateSolidHatch(db, [])).toBeUndefined()
  })

  it('creates a pattern hatch that keeps the recognized lines', () => {
    const db = createDb()
    const loop = acapPdfShapeToLoop({
      kind: 'circle',
      center: { x: 0, y: 0 },
      radius: 10
    })!
    const line = {
      angle: Math.PI / 4,
      base: { x: 1, y: 2 },
      offset: { x: -4.49, y: 4.49 },
      dashLengths: []
    }
    const hatch = acapPdfCreatePatternHatch(
      db,
      [loop],
      { type: 'predefined', name: 'ANSI31', scale: 2, angle: 0.1 },
      [line]
    )!
    expect(hatch.isSolidFill).toBe(false)
    expect(hatch.patternType).toBe(AcDbHatchPatternType.Predefined)
    expect(hatch.patternName).toBe('ANSI31')
    expect(hatch.patternScale).toBe(2)
    expect(hatch.patternAngle).toBeCloseTo(0.1)
    expect(hatch.associative).toBe(false)
    // The library must not replace the lines matched against the PDF.
    expect(hatch.definitionLines).toHaveLength(1)
    expect(hatch.definitionLines[0].base).toEqual({ x: 1, y: 2 })

    const user = acapPdfCreatePatternHatch(
      db,
      [loop],
      { type: 'userDefined', angle: 0, spacing: 3, double: true },
      [line, { ...line, angle: (Math.PI * 3) / 4 }]
    )!
    expect(user.patternType).toBe(AcDbHatchPatternType.UserDefined)
    expect(user.patternDouble).toBe(true)
    expect(user.definitionLines).toHaveLength(2)
    const single = {
      type: 'userDefined' as const,
      angle: 0,
      spacing: 3,
      double: false
    }
    expect(acapPdfCreatePatternHatch(db, [], single, [line])).toBeUndefined()
    expect(acapPdfCreatePatternHatch(db, [loop], single, [])).toBeUndefined()
  })

  it.each([
    ['Helvetica', 'Helvetica'],
    ['ABCDEF+SimSun', 'SimSun'],
    ['Arial-BoldMT', 'Arial'],
    ['Arial,Bold', 'Arial'],
    ['TimesNewRomanPSMT', 'TimesNewRoman'],
    ['GHIJKL+FangSong_GB2312', 'FangSong_GB2312']
  ])('font family of %s is %s', (name, family) => {
    expect(acapPdfFontFamily(name)).toBe(family)
  })

  it('creates one PDF_<family> text style per family', () => {
    const db = createDb()
    const a = acapPdfEnsureTextStyle(db, 'SimSun')
    expect(a).toBe('PDF_SimSun')
    expect(acapPdfEnsureTextStyle(db, 'SimSun')).toBe(a)
    expect(db.tables.textStyleTable.getAt(a)?.textStyle.font).toBe('SimSun')
  })
})

describe('acapPdfFitWidthFactor', () => {
  test('stretches or squeezes text to the PDF advance width', () => {
    expect(acapPdfFitWidthFactor(1, 80, 100)).toBeCloseTo(0.8)
    expect(acapPdfFitWidthFactor(1, 120, 100)).toBeCloseTo(1.2)
  })

  test('keeps the PDF width factor when the width is unknown', () => {
    expect(acapPdfFitWidthFactor(0.9, undefined, 100)).toBe(0.9)
    expect(acapPdfFitWidthFactor(0.9, 80, undefined)).toBe(0.9)
    expect(acapPdfFitWidthFactor(0.9, 80, 0)).toBe(0.9)
  })

  test('clamps implausible ratios', () => {
    expect(acapPdfFitWidthFactor(1, 1000, 1)).toBe(10)
    expect(acapPdfFitWidthFactor(1, 0.001, 100)).toBe(0.1)
  })
})
