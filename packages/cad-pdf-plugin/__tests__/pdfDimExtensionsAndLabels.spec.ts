import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbRotatedDimension
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
  acapPdfEnsureDimStyle
} from '../src/pdfDimensionConvert'
import {
  type PdfDimInput,
  type PdfLinearDimension,
  type PdfRadialDimension,
  recognizePdfDimensions
} from '../src/recognition/pdfDimensionPattern'

type P = { x: number; y: number }
let nextId = 0
const id = () => `e${nextId++}`

function arrow(tip: P, dir: P, size = 2.5) {
  const n = { x: -dir.y, y: dir.x }
  const base = { x: tip.x - dir.x * size, y: tip.y - dir.y * size }
  const w = size * 0.18
  return {
    id: id(),
    vertices: [
      tip,
      { x: base.x + n.x * w, y: base.y + n.y * w },
      { x: base.x - n.x * w, y: base.y - n.y * w }
    ]
  }
}
const seg = (p0: P, p1: P) => ({ id: id(), p0, p1 })
const text = (t: string, center: P, rotation = 0, height = 2.5) => ({
  id: id(),
  text: t,
  center,
  height,
  rotation
})
const empty = (): PdfDimInput<string> => ({
  segments: [],
  polygons: [],
  curves: [],
  texts: []
})

function fixture(name: string): PdfDimInput<string> {
  return JSON.parse(
    readFileSync(join(__dirname, 'fixtures', name), 'utf8')
  ) as PdfDimInput<string>
}

const linear = (dims: unknown[]) => dims as PdfLinearDimension<string>[]

/** A complete horizontal dimension from x0 to x1 at height y. */
function horizontal(
  input: PdfDimInput<string>,
  x0: number,
  x1: number,
  y: number,
  size = 4
) {
  input.segments.push(seg({ x: x0, y: y - 9 }, { x: x0, y: y + 1 }))
  input.segments.push(seg({ x: x1, y: y - 9 }, { x: x1, y: y + 1 }))
  input.segments.push(seg({ x: x0, y }, { x: x1, y }))
  input.polygons.push(arrow({ x: x0, y }, { x: -1, y: 0 }, size))
  input.polygons.push(arrow({ x: x1, y }, { x: 1, y: 0 }, size))
  input.texts.push(
    text(String(x1 - x0), { x: (x0 + x1) / 2, y: y + 2.5 }, 0, 3.5)
  )
}

/** Two 1:1 dimensions elsewhere on the sheet, as on the real page. */
function withScale(input: PdfDimInput<string>) {
  horizontal(input, 600, 650, 400)
  horizontal(input, 600, 675, 450)
}

describe('extension lines over object edges', () => {
  it('keeps a wall the second extension line is drawn over', () => {
    // 测试.pdf: the Ø50 dimension's right extension line (4.4 long) lies on
    // the 247 long tube wall. The wall used to win, lose its top half to
    // the extension and its bottom half to the eraser.
    const input = fixture('quille-tube-dia50.json')
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.text.text).toBe('Ø50')
    expect(dim.measured).toBeCloseTo(50, 6)
    // Walls (s1 left, s2 right) and the other tube lines stay.
    for (const wall of ['s0', 's1', 's2', 's3', 's4']) {
      expect(dim.consumed).not.toContain(wall)
    }
    // The real extension lines are replaced, and give the origins.
    expect(dim.consumed).toEqual(expect.arrayContaining(['s5', 's6']))
    const origins = [dim.xLine1, dim.xLine2].sort((a, b) => a.x - b.x)
    expect(origins[0].y).toBeCloseTo(199.2554, 3)
    expect(origins[1].y).toBeCloseTo(207.2554, 3)
  })

  it('never consumes an edge running through the tip on both sides', () => {
    const input = empty()
    input.segments.push(seg({ x: 0, y: 10 }, { x: 50, y: 10 }))
    input.segments.push(seg({ x: 0, y: 0 }, { x: 0, y: 12 }))
    // Object edge from far below to far above the dimension line.
    const wall = seg({ x: 50, y: -100 }, { x: 50, y: 150 })
    input.segments.push(wall)
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 50, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('50', { x: 25, y: 12 }))
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.measured).toBeCloseTo(50, 6)
    expect(dim.consumed).not.toContain(wall.id)
  })

  it('does not take an object edge that stops short of the tip', () => {
    // 测试.pdf weld detail: plate edges end 5 units from the "E maxi"
    // arrows, in line with the real (short) extension lines.
    const input = empty()
    const ext1 = seg({ x: 5, y: 0 }, { x: -1, y: 0 })
    const ext2 = seg({ x: 5, y: 10 }, { x: -1, y: 0 + 10 })
    const plate1 = seg({ x: 5.5, y: 0 }, { x: 40, y: 0 })
    const plate2 = seg({ x: 5.5, y: 10 }, { x: 40, y: 10 })
    input.segments.push(ext1, ext2, plate1, plate2)
    input.segments.push(seg({ x: 0, y: 0 }, { x: 0, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 0 }, { x: 0, y: -1 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: 0, y: 1 }))
    input.texts.push(text('10', { x: -1.5, y: 5 }, Math.PI / 2))
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.consumed).toEqual(expect.arrayContaining([ext1.id, ext2.id]))
    expect(dim.consumed).not.toContain(plate1.id)
    expect(dim.consumed).not.toContain(plate2.id)
    expect(dim.xLine1.x).toBeCloseTo(5, 6)
  })

  it('takes duplicate extension lines drawn over each other', () => {
    // Two dimensions to one corner, each drawing its own extension line
    // with origins half a unit apart: neither copy may be left behind.
    const input = empty()
    const a = seg({ x: 0, y: 0.5 }, { x: 0, y: 11 })
    const b = seg({ x: 0, y: 1 }, { x: 0, y: 11 })
    input.segments.push(a, b)
    input.segments.push(seg({ x: 40, y: 1 }, { x: 40, y: 11 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 40, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 40, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('40', { x: 20, y: 12 }))
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.consumed).toEqual(expect.arrayContaining([a.id, b.id]))
  })
})

describe('text placed beyond the extension lines', () => {
  it('keeps the text position and takes the run out to it', () => {
    const input = fixture('quille-tube-dia50.json')
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    // s8 runs from the left extension line out under "Ø50".
    expect(dim.consumed).toContain('s8')
    expect(dim.textPosition?.x).toBeCloseTo(dim.text.center.x, 6)
    expect(dim.textPosition?.y).toBeCloseTo(dim.text.center.y, 6)
  })

  it('leaves text at home when no run leads to it', () => {
    const input = empty()
    input.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 11 }))
    input.segments.push(seg({ x: 10, y: 1 }, { x: 10, y: 11 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 10, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 10, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('10', { x: 14, y: 11.5 }))
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.textPosition).toBeUndefined()
  })
})

describe('dimensions labelled with a symbol', () => {
  it('recognizes the weld detail dimensions and keeps their stroke labels', () => {
    // 测试.pdf page 2: "e mini" (outside arrows on a span as long as one
    // arrow, label out along the dimension line), "E maxi" (vertical, label
    // past the upper arrow) and "a" (diagonal, span shorter than an arrow).
    const input = fixture('quille-weld-labels.json')
    // The rest of the sheet is drawn 1:1; alone, the misread "5" on the
    // 10 long "E maxi" span would set the scale.
    withScale(input)
    const dims = linear(recognizePdfDimensions(input, { profile: 'import' }))
    const labelled = dims.filter(d => d.labelKept)
    expect(
      labelled.map(d => Math.round(d.measured * 100) / 100).sort()
    ).toEqual([10, 2.12, 4])
    const labelIds = new Set<string>()
    for (const t of [...input.texts, ...(input.unreadTexts ?? [])]) {
      labelIds.add(t.id)
      for (const extra of t.extraIds ?? []) labelIds.add(extra)
    }
    for (const dim of labelled) {
      // No invented value: the dimension text is suppressed...
      expect(dim.text.text).toBe(' ')
      // ...and the label strokes stay in the drawing.
      expect(dim.consumed.filter(c => labelIds.has(c))).toEqual([])
    }
    const eMini = labelled.find(d => Math.abs(d.measured - 4) < 0.01)!
    expect(eMini.arrowsOut).toBe(true)
    // The dimension line ends under the label, where the drawing ended it.
    expect(eMini.textPosition?.x).toBeCloseTo(767.1312, 3)
    const eMaxi = labelled.find(d => Math.abs(d.measured - 10) < 0.01)!
    // Extension lines, not the plate edges they point at.
    expect(eMaxi.xLine1.x).toBeLessThan(722)
    expect(eMaxi.xLine2.x).toBeLessThan(722)
    const a = labelled.find(d => Math.abs(d.measured - 2.12) < 0.01)!
    expect(a.kind).toBe('aligned')
  })

  it('uses a real text label as the text override', () => {
    const input = empty()
    // Outside arrows on a span shorter than three arrows, labelled "a".
    input.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 11 }))
    input.segments.push(seg({ x: 3, y: 1 }, { x: 3, y: 11 }))
    input.segments.push(seg({ x: -5, y: 10 }, { x: -2.5, y: 10 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 3, y: 10 }))
    const run = seg({ x: 5.5, y: 10 }, { x: 14, y: 10 })
    input.segments.push(run)
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: 1, y: 0 }))
    input.polygons.push(arrow({ x: 3, y: 10 }, { x: -1, y: 0 }))
    const label = text('a', { x: 12, y: 11.5 })
    input.texts.push(label)
    const [dim] = linear(recognizePdfDimensions(input, { profile: 'import' }))
    expect(dim.text.text).toBe('a')
    expect(dim.labelKept).toBe(false)
    expect(dim.measured).toBeCloseTo(3, 6)
    expect(dim.consumed).toEqual(expect.arrayContaining([label.id, run.id]))
  })

  it('leaves a lone pair of arrows with a label but no extension lines', () => {
    const input = empty()
    input.segments.push(seg({ x: 0, y: 10 }, { x: 3, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: 1, y: 0 }))
    input.polygons.push(arrow({ x: 3, y: 10 }, { x: -1, y: 0 }))
    input.texts.push(text('a', { x: 1.5, y: 11.5 }))
    expect(recognizePdfDimensions(input, { profile: 'import' })).toEqual([])
  })
})

describe('diameter with outside arrows', () => {
  it('takes the dimension line stub behind the far arrow', () => {
    const input = empty()
    input.curves.push({ id: id(), center: { x: 0, y: 0 }, radius: 6 })
    // Leader side: arrow at (6, 0) pointing in, line out to the text.
    input.polygons.push(arrow({ x: 6, y: 0 }, { x: -1, y: 0 }))
    input.segments.push(seg({ x: 8.5, y: 0 }, { x: 20, y: 0 }))
    input.segments.push(seg({ x: -6, y: 0 }, { x: 6, y: 0 }))
    // Far side: arrow at (-6, 0) pointing in, with a stub behind it.
    input.polygons.push(arrow({ x: -6, y: 0 }, { x: 1, y: 0 }))
    const stub = seg({ x: -8.5, y: 0 }, { x: -12, y: 0 })
    input.segments.push(stub)
    input.texts.push(text('Ø12', { x: 22, y: 1.5 }))
    const dims = recognizePdfDimensions(input, {
      profile: 'import'
    }) as PdfRadialDimension<string>[]
    const diameter = dims.find(d => d.kind === 'diameter')!
    expect(diameter.consumed).toContain(stub.id)

    // The dim block only draws between the chord points; the stub and the
    // leader out to the text must be drawn again.
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    acapPdfEnsureDimStyle(db, [diameter], 1)
    const [dim] = acapPdfCreateDimensions(db, [diameter], 1)
    const block = db.tables.blockTable.getAt(dim.dimBlockId!)!
    const spans = [...block.newIterator()]
      .filter((e): e is AcDbLine => e instanceof AcDbLine)
      .map(l => [l.startPoint.x, l.endPoint.x].sort((a, b) => a - b))
    const has = (lo: number, hi: number) =>
      spans.some(([a, b]) => Math.abs(a - lo) < 1e-6 && Math.abs(b - hi) < 1e-6)
    expect(has(-12, -8.5)).toBe(true)
    expect(has(8.5, 20)).toBe(true)
    // The line across the circle is drawn once.
    expect(spans.filter(([a, b]) => a === -6 && b === 6)).toHaveLength(1)
  })
})

describe('creating labelled dimensions', () => {
  it('draws the dimension line past outside arrows, away from the label', () => {
    // 测试.pdf weld detail "a": the tail behind the lower arrow used to be
    // erased without being drawn again.
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const input = fixture('quille-weld-labels.json')
    withScale(input)
    const candidates = linear(
      recognizePdfDimensions(input, { profile: 'import' })
    ).filter(d => d.labelKept && d.arrowsOut)
    expect(candidates).toHaveLength(2)
    acapPdfEnsureDimStyle(db, candidates, 1)
    const dims = acapPdfCreateDimensions(db, candidates, 1)
    const ends = dims.map(dim => {
      const block = db.tables.blockTable.getAt(dim.dimBlockId!)!
      return [...block.newIterator()]
        .filter((e): e is AcDbLine => e instanceof AcDbLine)
        .flatMap(l => [l.startPoint, l.endPoint])
    })
    const has = (points: { x: number; y: number }[], x: number, y: number) =>
      points.some(p => Math.abs(p.x - x) < 0.01 && Math.abs(p.y - y) < 0.01)
    const a = candidates.findIndex(d => Math.abs(d.measured - 2.12) < 0.01)
    const eMini = candidates.findIndex(d => Math.abs(d.measured - 4) < 0.01)
    // "a": tail out to (752.28, 512.33); "e mini": tail out to x = 732.91.
    expect(has(ends[a], 752.2782, 512.3333)).toBe(true)
    expect(has(ends[eMini], 732.9062, 556.3933)).toBe(true)
  })

  it('suppresses the text of a kept label and keeps an outside text position', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const input = fixture('quille-weld-labels.json')
    withScale(input)
    const candidates = recognizePdfDimensions(input, { profile: 'import' })
    const eMini = linear(candidates).find(
      d => d.labelKept && Math.abs(d.measured - 4) < 0.01
    )!
    acapPdfEnsureDimStyle(db, [eMini], 1)
    const [dim] = acapPdfCreateDimensions(db, [eMini], 1) as [
      AcDbRotatedDimension
    ]
    expect(dim.dimensionText).toBe(' ')
    expect(dim.isUsingDefaultTextPosition).toBe(false)
    // The block runs the dimension line out to the label's end.
    const block = db.tables.blockTable.getAt(dim.dimBlockId!)!
    const lines = [...block.newIterator()].filter(
      (e): e is AcDbLine => e instanceof AcDbLine
    )
    const reach = Math.max(
      ...lines.map(l => Math.max(l.startPoint.x, l.endPoint.x))
    )
    expect(reach).toBeCloseTo(767.1312, 3)
  })
})
