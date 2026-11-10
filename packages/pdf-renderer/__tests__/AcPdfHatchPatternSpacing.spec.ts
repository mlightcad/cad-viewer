import {
  AcDbDatabase,
  AcDbDxfFiler,
  AcDbHatch,
  acdbHostApplicationServices,
  AcGePoint2d,
  AcGePolyline2d
} from '@mlightcad/data-model'

import type { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'

/**
 * A `size`×`size` ANSI31 HATCH as AutoCAD writes it (taken from
 * `hatch.dxf`): one explicit definition line at 45° whose world-space offset
 * (45/46) gives a line spacing of 1.5875 × `scale`.
 */
function ansi31Dxf(scale: number, size = 100): string {
  const d = 1.122532015133644 * scale
  const s = size.toFixed(1)
  return [
    ['0', 'HATCH', '5', '173', '100', 'AcDbEntity', '8', '0'],
    ['100', 'AcDbHatch', '10', '0.0', '20', '0.0', '30', '0.0'],
    ['210', '0.0', '220', '0.0', '230', '1.0'],
    ['2', 'ANSI31', '70', '0', '71', '0', '91', '1'],
    ['92', '2', '72', '0', '73', '1', '93', '4'],
    ['10', '0.0', '20', '0.0', '10', s, '20', '0.0'],
    ['10', s, '20', s, '10', '0.0', '20', s],
    ['97', '0', '75', '0', '76', '1', '52', '0.0', '41', String(scale)],
    ['77', '0', '78', '1', '53', '45.0', '43', '0.0', '44', '0.0'],
    ['45', String(-d), '46', String(d), '79', '0', '98', '0'],
    ['0', 'ENDSEC']
  ]
    .flat()
    .join('\n')
}

function createDb(): AcDbDatabase {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function readHatch(db: AcDbDatabase, dxf: string): AcDbHatch {
  const hatch = new AcDbHatch()
  db.tables.blockTable.modelSpace.appendEntity(hatch)
  const filer = AcDbDxfFiler.fromString(dxf, { database: db })
  expect(filer.readItem()?.value).toBe('HATCH')
  hatch.dxfIn(filer)
  return hatch
}

/**
 * Draws the hatch and returns the distinct gaps between neighbouring stroke
 * rows, measured perpendicular to the 45° stroke direction.
 */
function rowGaps(db: AcDbDatabase, hatch: AcDbHatch): number[] {
  const renderer = new AcPdfRenderer()
  renderer.context.database = db
  const entity = hatch.worldDraw(renderer) as unknown as AcPdfEntity
  const rows: number[] = []
  entity.forEachOp(op => {
    if (op.kind !== 'stroke') return
    const [a, b] = op.points
    // Every stroke must run at 45°.
    expect(Math.abs(b.x - a.x - (b.y - a.y))).toBeLessThan(1e-6)
    rows.push((a.y - a.x) * Math.SQRT1_2)
  })
  rows.sort((p, q) => p - q)
  const distinct = rows.filter((r, i) => i === 0 || r - rows[i - 1] > 1e-6)
  return distinct.slice(1).map((r, i) => r - distinct[i])
}

describe('PDF pattern hatch line spacing', () => {
  it('draws an imported ANSI31 hatch with the spacing of its DXF lines', () => {
    const db = createDb()
    const gaps = rowGaps(db, readHatch(db, ansi31Dxf(1)))

    expect(gaps.length).toBeGreaterThan(50)
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(1.5875, 6)
    }
  })

  it('keeps the DXF spacing of a scaled ANSI31 hatch', () => {
    const db = createDb()
    const gaps = rowGaps(db, readHatch(db, ansi31Dxf(40, 1000)))

    // 1414 units of diagonal / 63.5 spacing.
    expect(gaps.length).toBeGreaterThan(20)
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(1.5875 * 40, 6)
    }
  })

  it('draws a predefined ANSI31 hatch at its PAT spacing', () => {
    const db = createDb()
    const hatch = new AcDbHatch()
    db.tables.blockTable.modelSpace.appendEntity(hatch)
    hatch.patternName = 'ANSI31'
    hatch.patternScale = 1
    hatch.add(
      new AcGePolyline2d(
        [
          new AcGePoint2d(0, 0),
          new AcGePoint2d(100, 0),
          new AcGePoint2d(100, 100),
          new AcGePoint2d(0, 100)
        ],
        true
      )
    )

    const gaps = rowGaps(db, hatch)
    expect(gaps.length).toBeGreaterThan(20)
    for (const gap of gaps) {
      // acadiso.pat ANSI31: 45, 0,0, 0,3.175
      expect(gap).toBeCloseTo(3.175, 6)
    }
  })
})
