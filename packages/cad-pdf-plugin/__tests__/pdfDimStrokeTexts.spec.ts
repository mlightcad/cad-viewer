import {
  AcDbDatabase,
  AcDbLine,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d,
  acdbHostApplicationServices,
  type AcDbEntity
} from '@mlightcad/data-model'

jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
)

import {
  acapPdfCreateSolidHatch,
  acapPdfShapeToLoop
} from '../src/pdfImportEntities'
import {
  acapPdfAttachDimStrokeTexts,
  acapPdfCollectDimStrokeLines,
  acapPdfDimTextsFromStrokeLines,
  acapPdfPrepareDimStrokeTexts
} from '../src/pdfDimStrokeTexts'
import { pdfEntitiesToDimInput } from '../src/pdfDimensionConvert'
import {
  type PdfLinearDimension,
  recognizePdfDimensions
} from '../src/recognition/pdfDimensionPattern'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

type P = { x: number; y: number }

function line(a: P, b: P) {
  return new AcDbLine(
    new AcGePoint3d(a.x, a.y, 0),
    new AcGePoint3d(b.x, b.y, 0)
  )
}

function triangle(tip: P, dir: P, size = 4) {
  const n = { x: -dir.y, y: dir.x }
  const base = { x: tip.x - dir.x * size, y: tip.y - dir.y * size }
  const w = size * 0.18
  const poly = new AcDbPolyline()
  poly.addVertexAt(0, new AcGePoint2d(tip.x, tip.y))
  poly.addVertexAt(1, new AcGePoint2d(base.x + n.x * w, base.y + n.y * w))
  poly.addVertexAt(2, new AcGePoint2d(base.x - n.x * w, base.y - n.y * w))
  poly.closed = true
  return poly
}

function hatchTriangle(db: AcDbDatabase, tip: P, dir: P, size = 4) {
  const poly = triangle(tip, dir, size)
  const vertices = [0, 1, 2].map(i => {
    const p = poly.getPoint2dAt(i)
    return { x: p.x, y: p.y, bulge: 0 }
  })
  const loop = acapPdfShapeToLoop({ kind: 'polyline', closed: true, vertices })
  return acapPdfCreateSolidHatch(db, [loop!])!
}

/** Stick-font "5" matching the built-in digit template. */
function stickFive(origin: P, h: number): AcDbLine[] {
  const pts: P[] = [
    { x: 0.8, y: 0.95 },
    { x: 0.2, y: 0.95 },
    { x: 0.2, y: 0.55 },
    { x: 0.75, y: 0.55 },
    { x: 0.8, y: 0.45 },
    { x: 0.8, y: 0.15 },
    { x: 0.7, y: 0.05 },
    { x: 0.2, y: 0.05 }
  ].map(p => ({ x: origin.x + p.x * h, y: origin.y + p.y * h }))
  const out: AcDbLine[] = []
  for (let i = 0; i < pts.length - 1; i++) out.push(line(pts[i], pts[i + 1]))
  return out
}

/**
 * Bottom "55" linear dimension shaped like r14-frozen-2.pdf: hatch arrows,
 * dim line, extensions, and stroke digits — no AcDbText.
 */
function bottomDimEntities(db: AcDbDatabase): AcDbEntity[] {
  const y = 185.637
  const x0 = 236.305
  const x1 = 291.305
  const h = 3.5
  const entities: AcDbEntity[] = [
    hatchTriangle(db, { x: x0, y }, { x: -1, y: 0 }),
    hatchTriangle(db, { x: x1, y }, { x: 1, y: 0 }),
    line({ x: 240.305, y }, { x: 287.305, y }),
    line({ x: x0, y: 225.408 }, { x: x0, y: 184.637 }),
    line({ x: x1, y: 225.408 }, { x: x1, y: 184.637 }),
    ...stickFive({ x: 260.7, y: 186.26 }, h),
    ...stickFive({ x: 260.7 + h * 1.05, y: 186.26 }, h)
  ]
  db.tables.blockTable.modelSpace.appendEntity(entities)
  return entities
}

describe('pdfDimStrokeTexts', () => {
  it('clusters stroke digits beside a dimension', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const entities = bottomDimEntities(db)
    const byId = new Map(entities.map(e => [e.objectId, e]))
    const lines = acapPdfCollectDimStrokeLines(byId)
    expect(lines.length).toBeGreaterThanOrEqual(1)
    const label = lines.find(l => l.glyphs.length >= 2)
    expect(label).toBeDefined()
    expect(label!.height).toBeGreaterThan(2)
    expect(label!.width).toBeGreaterThan(3)
  })

  it('recognizes the bottom dimension when text is only strokes', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const entities = bottomDimEntities(db)
    const byId = new Map(entities.map(e => [e.objectId, e]))
    const lines = acapPdfCollectDimStrokeLines(byId)
    const input = pdfEntitiesToDimInput(byId)
    expect(input.texts).toHaveLength(0)
    expect(input.polygons.length).toBeGreaterThanOrEqual(2)

    // Force unread placeholders (outline/stick fragmentation must not invent
    // a wrong value such as "111"); the measured length supplies "55".
    const { unread } = acapPdfDimTextsFromStrokeLines(
      lines,
      lines.map(() => undefined)
    )
    acapPdfAttachDimStrokeTexts(input, [], unread)
    expect(input.unreadTexts?.length).toBeGreaterThanOrEqual(1)

    const dims = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dims).toHaveLength(1)
    expect(dims[0].measured).toBeCloseTo(55, 3)
    expect(dims[0].text.text).toBe('55')
    expect(dims[0].consumed.length).toBeGreaterThan(5)
  })

  it('falls back to measured length for unread stroke text', () => {
    const input = pdfEntitiesToDimInput(new Map())
    const y = 10
    input.segments.push(
      { id: 'ext0', p0: { x: 0, y: 1 }, p1: { x: 0, y: y + 2 } },
      { id: 'ext1', p0: { x: 55, y: 1 }, p1: { x: 55, y: y + 2 } },
      { id: 'dim', p0: { x: 0, y }, p1: { x: 55, y } }
    )
    const arrow = (tip: P, dir: P, id: string, size = 2.5) => {
      const u = { x: dir.x, y: dir.y }
      const n = { x: -u.y, y: u.x }
      const base = { x: tip.x - u.x * size, y: tip.y - u.y * size }
      const w = size * 0.18
      return {
        id,
        vertices: [
          tip,
          { x: base.x + n.x * w, y: base.y + n.y * w },
          { x: base.x - n.x * w, y: base.y - n.y * w }
        ]
      }
    }
    input.polygons.push(arrow({ x: 0, y }, { x: -1, y: 0 }, 'a0'))
    input.polygons.push(arrow({ x: 55, y }, { x: 1, y: 0 }, 'a1'))
    input.unreadTexts = [
      {
        id: 's0',
        extraIds: ['s1', 's2'],
        center: { x: 27.5, y: y + 2 },
        height: 2.5
      }
    ]
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.text.text).toBe('55')
    expect(dim.consumed).toEqual(
      expect.arrayContaining(['s0', 's1', 's2', 'a0', 'a1', 'dim'])
    )
  })

  it('keeps a dictionary-read value instead of an unread placeholder', () => {
    const lines = [
      {
        strokes: [
          {
            id: 's0',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0 }
            ]
          },
          {
            id: 's1',
            points: [
              { x: 1.2, y: 0 },
              { x: 2.2, y: 0 }
            ]
          }
        ],
        glyphs: [],
        rotation: 0,
        position: { x: 24, y: 11 },
        height: 2.5,
        width: 4
      }
    ]
    const { texts, unread } = acapPdfDimTextsFromStrokeLines(lines, ['5000'])
    expect(unread).toHaveLength(0)
    expect(texts).toHaveLength(1)
    expect(texts[0].text).toBe('5000')
    expect(texts[0].extraIds).toEqual(['s1'])

    const input = pdfEntitiesToDimInput(new Map())
    input.segments.push(
      {
        id: 'dim',
        p0: { x: 0, y: 10 },
        p1: { x: 50, y: 10 }
      },
      {
        id: 's0',
        p0: { x: 0, y: 0 },
        p1: { x: 1, y: 0 }
      },
      {
        id: 's1',
        p0: { x: 1.2, y: 0 },
        p1: { x: 2.2, y: 0 }
      }
    )
    acapPdfAttachDimStrokeTexts(input, texts, unread)
    expect(input.segments.map(s => s.id)).toEqual(['dim'])
    expect(input.texts[0].text).toBe('5000')
  })
})
