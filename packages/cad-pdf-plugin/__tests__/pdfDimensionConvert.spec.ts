import {
  AcDb3PointAngularDimension,
  AcDbCircle,
  AcDbDatabase,
  AcDbDiametricDimension,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbRotatedDimension,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

// The conversion only needs the dim-block helpers; the package entry would
// also load editor UI modules that are irrelevant here.
jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
)

import {
  acapPdfCreateDimensions,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  PDF_DIM_STYLE,
  pdfEntitiesToDimInput
} from '../src/pdfDimensionConvert'
import {
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from '../src/recognition/pdfDimensionPattern'

type P = { x: number; y: number }

function line(a: P, b: P) {
  return new AcDbLine(
    new AcGePoint3d(a.x, a.y, 0),
    new AcGePoint3d(b.x, b.y, 0)
  )
}

function triangle(tip: P, dir: P, size = 2.5) {
  const n = { x: -dir.y, y: dir.x }
  const base = { x: tip.x - dir.x * size, y: tip.y - dir.y * size }
  const poly = new AcDbPolyline()
  poly.addVertexAt(0, new AcGePoint2d(tip.x, tip.y))
  poly.addVertexAt(1, new AcGePoint2d(base.x + n.x * 0.45, base.y + n.y * 0.45))
  poly.addVertexAt(2, new AcGePoint2d(base.x - n.x * 0.45, base.y - n.y * 0.45))
  poly.closed = true
  return poly
}

function text(value: string, x: number, y: number) {
  const t = new AcDbText()
  t.textString = value
  t.position = new AcGePoint3d(x, y, 0)
  t.height = 2.5
  return t
}

function setup() {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  // An exploded 1:100 dimension (70 mm on paper reads 7000) and a Ø16 circle.
  const entities: AcDbEntity[] = [
    line({ x: 30, y: 66 }, { x: 30, y: 77 }),
    line({ x: 100, y: 66 }, { x: 100, y: 77 }),
    line({ x: 30, y: 75 }, { x: 100, y: 75 }),
    triangle({ x: 30, y: 75 }, { x: -1, y: 0 }),
    triangle({ x: 100, y: 75 }, { x: 1, y: 0 }),
    text('7000', 62.2, 75.8),
    new AcDbCircle(new AcGePoint3d(65, 47.5, 0), 8),
    triangle(
      { x: 65 + 8 * Math.SQRT1_2, y: 47.5 + 8 * Math.SQRT1_2 },
      { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
    ),
    text('Ø16', 82.5, 64.8)
  ]
  db.tables.blockTable.modelSpace.appendEntity(entities)
  const byId = new Map(entities.map(e => [e.objectId, e]))
  return { db, byId }
}

describe('PDF dimension conversion', () => {
  it('creates a PDF_DIM style and real dimension entities', () => {
    const { db, byId } = setup()
    const candidates = recognizePdfDimensions(pdfEntitiesToDimInput(byId))
    expect(candidates.map(c => c.kind).sort()).toEqual(['diameter', 'linear'])

    const scale = acapPdfNiceScale(suggestPdfDimensionScale(candidates)!)
    expect(scale).toBe(100)

    const style = acapPdfEnsureDimStyle(db, candidates, scale)
    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)).toBe(style)
    expect(style.dimlfac).toBe(100)
    expect(style.dimtxt).toBeCloseTo(2.5, 9)
    expect(style.dimasz).toBeCloseTo(2.5, 9)

    const dims = acapPdfCreateDimensions(db, candidates, scale)
    const linear = dims.find(
      d => d instanceof AcDbRotatedDimension
    ) as AcDbRotatedDimension
    const diameter = dims.find(
      d => d instanceof AcDbDiametricDimension
    ) as AcDbDiametricDimension
    expect(linear.xLine1Point.x).toBeCloseTo(30, 9)
    expect(linear.xLine2Point.x).toBeCloseTo(100, 9)
    expect(linear.rotation).toBeCloseTo(0, 9)
    expect(linear.dimensionStyleName).toBe(PDF_DIM_STYLE)
    // 70 × DIMLFAC 100 = 7000: no override needed.
    expect(linear.dimensionText || '').toBe('')
    // The Ø prefix is kept as an override.
    expect(diameter.dimensionText).toBe('Ø16')

    for (const d of dims) {
      expect(d.dimBlockId).toBeTruthy()
      expect(db.tables.blockTable.getAt(d.dimBlockId!)).toBeTruthy()
    }
  })

  it('keeps disagreeing texts as overrides', () => {
    const { db, byId } = setup()
    const candidates = recognizePdfDimensions(pdfEntitiesToDimInput(byId))
    acapPdfEnsureDimStyle(db, candidates, 1)
    const dims = acapPdfCreateDimensions(db, candidates, 1)
    const linear = dims.find(d => d instanceof AcDbRotatedDimension)!
    expect(linear.dimensionText).toBe('7000')
  })

  it('updates an existing PDF_DIM style inside a command transaction', () => {
    const { db, byId } = setup()
    const candidates = recognizePdfDimensions(pdfEntitiesToDimInput(byId))
    // Commands record edits; existing symbol table records must then be
    // opened for write before they change.
    db.runDatabaseEdit('PDFDIM', () => {
      acapPdfEnsureDimStyle(db, candidates, 50)
    })
    db.runDatabaseEdit('PDFDIM', () => {
      acapPdfEnsureDimStyle(db, candidates, 100)
      acapPdfCreateDimensions(db, candidates, 100)
    })
    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)?.dimlfac).toBe(100)
  })

  it('creates an angular dimension without overriding a degree text', () => {
    const { db } = setup()
    acapPdfEnsureDimStyle(db, [], 100)
    const [dim] = acapPdfCreateDimensions(
      db,
      [
        {
          kind: 'angular',
          center: { x: 0, y: 0 },
          xLine1: { x: 5, y: 0 },
          xLine2: { x: 0, y: 5 },
          arcPoint: { x: 14.14, y: 14.14 },
          measured: 90,
          text: { id: 't', text: '90°', center: { x: 15, y: 15 }, height: 2.5 },
          arrowSize: 2.5,
          consumed: []
        }
      ],
      100
    )
    expect(dim).toBeInstanceOf(AcDb3PointAngularDimension)
    expect(dim.dimensionText || '').toBe('')
  })

  it('converts a dimension drawn without arrowheads', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const label = text('44mm', 383.817139, 2761.588189)
    label.rotation = Math.PI / 2
    const entities: AcDbEntity[] = [
      line({ x: 387.25399, y: 2770.718955 }, { x: 383.284534, y: 2770.718955 }),
      line(
        { x: 387.081058, y: 2758.714527 },
        { x: 383.284464, y: 2758.714527 }
      ),
      line(
        { x: 385.004361, y: 2770.718955 },
        { x: 385.004361, y: 2758.714633 }
      ),
      label
    ]
    db.tables.blockTable.modelSpace.appendEntity(entities)
    const byId = new Map(entities.map(e => [e.objectId, e]))
    const candidates = recognizePdfDimensions(pdfEntitiesToDimInput(byId))
    expect(candidates).toHaveLength(1)

    const style = acapPdfEnsureDimStyle(db, candidates, 1)
    expect(style.dimblk.toUpperCase()).toBe('_NONE')
    expect(style.dimasz).toBeCloseTo(2.5, 9)
    const [dim] = acapPdfCreateDimensions(db, candidates, 1)
    expect(dim).toBeInstanceOf(AcDbRotatedDimension)
    expect(dim.dimensionText).toBe('44mm')
    expect(dim.dimBlockId).toBeTruthy()
  })

  it('snaps scales to common values', () => {
    expect(acapPdfNiceScale(99.6)).toBe(100)
    expect(acapPdfNiceScale(49.8)).toBe(50)
    expect(acapPdfNiceScale(0.25)).toBe(0.25)
    expect(acapPdfNiceScale(37)).toBe(37)
  })
})
