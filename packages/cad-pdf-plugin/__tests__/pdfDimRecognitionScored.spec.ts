import { recognizePdfDimStrokeText } from '../src/recognition/pdfDimDigitRecognition'
import {
  type PdfDimInput,
  type PdfLinearDimension,
  type PdfOrdinateDimension,
  type PdfRadialDimension,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from '../src/recognition/pdfDimensionPattern'
import { PdfDimEvidence, pdfDimResolve } from '../src/recognition/pdfDimScoring'
import { pdfDimReadStrokeTexts } from '../src/recognition/pdfDimStrokeReader'
import {
  pdfDimArrowFromPolygon,
  pdfDimOpenArrows
} from '../src/recognition/pdfDimTerminators'
import {
  clusterPdfTextStrokes,
  type PdfTextStroke
} from '../src/recognition/pdfGlyphClustering'

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

/** A complete horizontal dimension from x0 to x1 over an object at y=0. */
function horizontal(
  input: PdfDimInput<string>,
  x0: number,
  x1: number,
  label: string,
  y = 10
) {
  input.segments.push(seg({ x: x0, y: 1 }, { x: x0, y: y + 1.25 }))
  input.segments.push(seg({ x: x1, y: 1 }, { x: x1, y: y + 1.25 }))
  input.segments.push(seg({ x: x0, y }, { x: x1, y }))
  input.polygons.push(arrow({ x: x0, y }, { x: -1, y: 0 }))
  input.polygons.push(arrow({ x: x1, y }, { x: 1, y: 0 }))
  input.texts.push(text(label, { x: (x0 + x1) / 2, y: y + 2 }))
}

describe('pdf dimension terminators', () => {
  it('reads a filled arrow drawn as a quad with a repeated corner', () => {
    const arrowQuad = pdfDimArrowFromPolygon([
      { x: 0, y: 0 },
      { x: -2.5, y: 0.45 },
      { x: -2.5, y: 0.45 + 1e-6 },
      { x: -2.5, y: -0.45 }
    ])
    expect(arrowQuad?.tip).toEqual({ x: 0, y: 0 })
    expect(arrowQuad?.direction.x).toBeCloseTo(1, 6)
  })

  it('finds open arrows: two equal strokes meeting at a sharp tip', () => {
    const open = pdfDimOpenArrows(
      [
        { id: 'a', p0: { x: 0, y: 0 }, p1: { x: -2.5, y: 0.6 } },
        { id: 'b', p0: { x: 0, y: 0 }, p1: { x: -2.5, y: -0.6 } },
        // A right angle is a corner, not an arrow.
        { id: 'c', p0: { x: 10, y: 0 }, p1: { x: 12, y: 0 } },
        { id: 'd', p0: { x: 10, y: 0 }, p1: { x: 10, y: 2 } }
      ],
      4,
      0.01
    )
    expect(open).toHaveLength(1)
    expect(open[0].ids.sort()).toEqual(['a', 'b'])
    expect(open[0].direction!.x).toBeCloseTo(1, 6)
  })
})

describe('pdf dimension recognition (scored)', () => {
  it('reports score and evidence for each dimension', () => {
    const input = empty()
    horizontal(input, 0, 40, '40')
    const [dim] = recognizePdfDimensions(input)
    expect(dim.score).toBeGreaterThan(10)
    expect(dim.evidence).toEqual(
      expect.arrayContaining(['dimLine', 'numericText', 'scaleAgrees'])
    )
  })

  it('import profile drops a value that contradicts the drawing scale', () => {
    const input = empty()
    horizontal(input, 0, 40, '40')
    horizontal(input, 50, 70, '20')
    horizontal(input, 80, 110, '30')
    // 15 long but labelled 37: a misread or a reference size.
    horizontal(input, 120, 135, '37')
    const review = recognizePdfDimensions(input, { profile: 'review' })
    const imported = recognizePdfDimensions(input, { profile: 'import' })
    // Review keeps it (with the measured value) for a person to check.
    expect(review.some(d => Math.abs(d.measured - 15) < 1e-6)).toBe(true)
    expect(imported.map(d => d.text.text).sort()).toEqual(['20', '30', '40'])
  })

  it('reads a dimension line split by its value text', () => {
    const input = empty()
    input.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 11 }))
    input.segments.push(seg({ x: 60, y: 1 }, { x: 60, y: 11 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 25, y: 10 }))
    input.segments.push(seg({ x: 35, y: 10 }, { x: 60, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 60, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('60', { x: 30, y: 10.5 }))
    const [dim] = recognizePdfDimensions(input, {
      profile: 'import'
    }) as PdfLinearDimension<string>[]
    expect(dim.measured).toBeCloseTo(60, 6)
    // Both halves of the dimension line are replaced.
    expect(dim.consumed).toEqual(
      expect.arrayContaining([input.segments[2].id, input.segments[3].id])
    )
  })

  it('treats one open polyline as several segments of one id', () => {
    const input = empty()
    // Extension, dimension line and second extension drawn as one path.
    const pathId = 'path'
    const pts = [
      { x: 0, y: 1 },
      { x: 0, y: 11 }
    ]
    input.segments.push({ id: pathId, p0: pts[0], p1: pts[1] })
    input.segments.push({
      id: pathId,
      p0: { x: 0, y: 10 },
      p1: { x: 30, y: 10 }
    })
    input.segments.push(seg({ x: 30, y: 1 }, { x: 30, y: 11 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 30, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('30', { x: 15, y: 12 }))
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.consumed.filter(c => c === pathId)).toHaveLength(1)
  })

  it('recognizes an aligned dimension on a slanted edge', () => {
    const input = empty()
    const u = { x: Math.SQRT1_2, y: Math.SQRT1_2 }
    const n = { x: -u.y, y: u.x }
    const L = 30
    const off = (p: P, d: number) => ({ x: p.x + n.x * d, y: p.y + n.y * d })
    const a = { x: 0, y: 0 }
    const b = { x: u.x * L, y: u.y * L }
    input.segments.push(seg(off(a, 1), off(a, 11)))
    input.segments.push(seg(off(b, 1), off(b, 11)))
    input.segments.push(seg(off(a, 10), off(b, 10)))
    input.polygons.push(arrow(off(a, 10), { x: -u.x, y: -u.y }))
    input.polygons.push(arrow(off(b, 10), u))
    input.texts.push(
      text('30', off({ x: u.x * 15, y: u.y * 15 }, 12), Math.PI / 4)
    )
    const [dim] = recognizePdfDimensions(input, { profile: 'import' })
    expect(dim.kind).toBe('aligned')
    expect(dim.measured).toBeCloseTo(30, 6)
  })

  it('recognizes a dot-terminated dimension', () => {
    const input = empty()
    input.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 11 }))
    input.segments.push(seg({ x: 20, y: 1 }, { x: 20, y: 11 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 20, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.curves.push({ id: 'dot', center: { x: 20, y: 10 }, radius: 0.6 })
    input.texts.push(text('20', { x: 10, y: 12 }))
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.measured).toBeCloseTo(20, 6)
    expect(dim.consumed).toContain('dot')
  })

  it('reads a radius callout from outside the arc, with its leader', () => {
    const input = empty()
    input.curves.push({ id: 'c', center: { x: 0, y: 0 }, radius: 10 })
    // Arrow outside the circle pointing in, leader running away.
    const tip = { x: 10, y: 0 }
    input.polygons.push(arrow(tip, { x: -1, y: 0 }))
    input.segments.push(seg({ x: 12.5, y: 0 }, { x: 25, y: 0 }))
    input.texts.push(text('R10', { x: 28, y: 0 }))
    const [dim] = recognizePdfDimensions(input, {
      profile: 'import'
    }) as PdfRadialDimension<string>[]
    expect(dim.kind).toBe('radius')
    expect(dim.consumed).toContain(input.segments[0].id)
  })

  it('recognizes ordinate dimensions only as a consistent group', () => {
    const input = empty()
    for (const [x, label] of [
      [0, '0'],
      [20, '20'],
      [45, '45']
    ] as const) {
      // Vertical leader from the feature (y=0) up to a vertical label.
      input.segments.push(seg({ x, y: 1 }, { x, y: 20 }))
      input.texts.push(text(label, { x, y: 22.5 }, Math.PI / 2))
    }
    const dims = recognizePdfDimensions(input, {
      profile: 'import'
    }) as PdfOrdinateDimension<string>[]
    expect(dims.map(d => d.kind)).toEqual(['ordinate', 'ordinate', 'ordinate'])
    expect(dims.every(d => d.useXAxis)).toBe(true)
    expect(dims.find(d => d.text.text === '45')!.measured).toBeCloseTo(45, 6)

    const lone = empty()
    lone.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 20 }))
    lone.texts.push(text('12', { x: 0, y: 22.5 }, Math.PI / 2))
    expect(recognizePdfDimensions(lone, { profile: 'import' })).toHaveLength(0)
  })

  it('tells arc length from angular by the text', () => {
    const make = (label: string) => {
      const input = empty()
      input.arcs = [
        {
          id: 'arc',
          center: { x: 0, y: 0 },
          radius: 20,
          startAngle: 0,
          endAngle: Math.PI / 2
        }
      ]
      input.polygons.push(arrow({ x: 20, y: 0 }, { x: 0, y: -1 }))
      input.polygons.push(arrow({ x: 0, y: 20 }, { x: -1, y: 0 }))
      // Object arc inside, radius 10.
      input.segments.push(seg({ x: 10.5, y: 0 }, { x: 21, y: 0 }))
      input.segments.push(seg({ x: 0, y: 10.5 }, { x: 0, y: 21 }))
      input.texts.push(text(label, { x: 15.6, y: 15.6 }))
      return recognizePdfDimensions(input)
    }
    expect(make('90°')[0].kind).toBe('angular')
    expect(make('⌒15.71')[0].kind).toBe('arcLength')
  })
})

describe('review fixes', () => {
  it('finds extension lines drawn in the same path as the dimension line', () => {
    const input = empty()
    const path = 'path'
    // orig1 → tip1 → tip2 → orig2 as one open polyline.
    input.segments.push({ id: path, p0: { x: 0, y: 1 }, p1: { x: 0, y: 10 } })
    input.segments.push({ id: path, p0: { x: 0, y: 10 }, p1: { x: 40, y: 10 } })
    input.segments.push({ id: path, p0: { x: 40, y: 10 }, p1: { x: 40, y: 1 } })
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 40, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('40', { x: 20, y: 12 }))
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.xLine1).toEqual({ x: 0, y: 1 })
    expect(dim.xLine2).toEqual({ x: 40, y: 1 })
    // Every piece is claimed, so the path is replaced.
    expect(dim.consumed).toContain(path)
  })

  it('keeps a polyline when a dimension uses only one of its edges', () => {
    const input = empty()
    horizontal(input, 0, 30, '30')
    // An object outline whose left edge is the first extension line.
    const outline = 'outline'
    const ext = input.segments[0]
    input.segments.splice(0, 1)
    input.segments.push({ id: outline, p0: ext.p0, p1: ext.p1 })
    input.segments.push({ id: outline, p0: ext.p0, p1: { x: -20, y: 1 } })
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.extensionIds).toContain(outline)
    expect(dim.consumed).not.toContain(outline)
  })

  it('does not erase the object edges an angular dimension measures', () => {
    const input = empty()
    input.arcs = [
      {
        id: 'arc',
        center: { x: 0, y: 0 },
        radius: 20,
        startAngle: 0,
        endAngle: Math.PI / 2
      }
    ]
    input.polygons.push(arrow({ x: 20, y: 0 }, { x: 0, y: -1 }))
    input.polygons.push(arrow({ x: 0, y: 20 }, { x: -1, y: 0 }))
    // Object edges from the vertex, running far past the dimension arc.
    input.segments.push(seg({ x: 0, y: 0 }, { x: 60, y: 0 }))
    input.segments.push(seg({ x: 0, y: 0 }, { x: 0, y: 60 }))
    input.texts.push(text('90°', { x: 15.6, y: 15.6 }))
    const [dim] = recognizePdfDimensions(input)
    expect(dim.kind).toBe('angular')
    expect(dim.consumed).not.toContain(input.segments[0].id)
    expect(dim.consumed).not.toContain(input.segments[1].id)
  })

  it('marks measured stand-in texts and keeps them out of the scale vote', () => {
    const input = empty()
    horizontal(input, 0, 40, '2000')
    horizontal(input, 50, 70, '1000')
    // An unread value on a third dimension.
    input.segments.push(seg({ x: 80, y: 1 }, { x: 80, y: 11.25 }))
    input.segments.push(seg({ x: 110, y: 1 }, { x: 110, y: 11.25 }))
    input.segments.push(seg({ x: 80, y: 10 }, { x: 110, y: 10 }))
    input.polygons.push(arrow({ x: 80, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 110, y: 10 }, { x: 1, y: 0 }))
    input.unreadTexts = [
      { id: 'u', extraIds: ['u2'], center: { x: 95, y: 12 }, height: 2.5 }
    ]
    const dims = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    const standIn = dims.find(d => d.text.id === 'u')!
    expect(standIn.measuredText).toBe(true)
    expect(suggestPdfDimensionScale(dims)).toBeCloseTo(50, 6)
  })
})

describe('pdfDimResolve', () => {
  it('keeps the best of two conflicting hypotheses', () => {
    const strong = new PdfDimEvidence()
    strong.add('terminator', 2)
    strong.add('dimLine')
    strong.add('numericText')
    const weak = new PdfDimEvidence()
    weak.add('terminator', 2)
    const base = {
      measured: 10,
      value: 10,
      arrowSize: 2.5,
      textHeight: 2.5,
      strongEnough: true,
      span: 10
    }
    const picked = pdfDimResolve(
      [
        { ...base, exclusive: ['a', 'b'], evidence: weak },
        { ...base, exclusive: ['b', 'c'], evidence: strong }
      ],
      'review'
    )
    expect(picked).toHaveLength(1)
    expect(picked[0].candidate.exclusive).toEqual(['b', 'c'])
  })
})

describe('dimension stroke text', () => {
  /** Romans-style SHX "2" and "5" (rounded bowls). */
  const two = (x: number): P[] => [
    { x, y: 2.9 },
    { x: x + 0.3, y: 3.35 },
    { x: x + 0.8, y: 3.5 },
    { x: x + 1.3, y: 3.35 },
    { x: x + 1.55, y: 2.9 },
    { x: x + 1.45, y: 2.3 },
    { x: x + 1.1, y: 1.7 },
    { x: x + 0.05, y: 0 },
    { x: x + 1.65, y: 0 }
  ]
  const five = (x: number): P[] => [
    { x: x + 1.45, y: 3.5 },
    { x: x + 0.25, y: 3.5 },
    { x: x + 0.15, y: 2.1 },
    { x: x + 0.5, y: 2.3 },
    { x: x + 1.0, y: 2.3 },
    { x: x + 1.4, y: 2.0 },
    { x: x + 1.6, y: 1.4 },
    { x: x + 1.6, y: 0.9 },
    { x: x + 1.4, y: 0.35 },
    { x: x + 1.0, y: 0 },
    { x: x + 0.5, y: 0 },
    { x: x + 0.15, y: 0.2 },
    { x, y: 0.5 }
  ]

  it('reads rounded SHX digits the blocky templates missed', () => {
    const strokes: PdfTextStroke<string>[] = [
      { id: 'a', points: two(0) },
      { id: 'b', points: five(2.3) }
    ]
    const { lines } = clusterPdfTextStrokes(strokes, {
      textHeight: 3.5,
      angle: 0,
      attachLongStrokes: false
    })
    expect(recognizePdfDimStrokeText(lines[0])).toBe('25')
  })

  it('reads value text beside a dimension line, in the line direction', () => {
    // Vertical dimension: text runs bottom-to-top (rotation 90°).
    const rot = (pts: P[]) => pts.map(p => ({ x: 10 - p.y, y: p.x + 40 }))
    const strokes: PdfTextStroke<string>[] = [
      { id: 'a', points: rot(two(0)) },
      { id: 'b', points: rot(five(2.3)) },
      // The dimension line itself is not a glyph.
      {
        id: 'line',
        points: [
          { x: 11, y: 0 },
          { x: 11, y: 100 }
        ]
      }
    ]
    const readings = pdfDimReadStrokeTexts(
      strokes,
      [{ p0: { x: 11, y: 0 }, p1: { x: 11, y: 100 } }],
      { textHeight: 3.5 }
    )
    expect(readings.map(r => r.text)).toEqual(['25'])
    expect(readings[0].ids.sort()).toEqual(['a', 'b'])
  })

  it('reads digits printed as filled outlines', () => {
    const ring = (cx: number, rx: number, ry: number): P[] =>
      Array.from({ length: 33 }, (_, i) => ({
        x: cx + rx * Math.cos((i / 32) * 2 * Math.PI),
        y: 1.25 + ry * Math.sin((i / 32) * 2 * Math.PI)
      }))
    const w = 0.35
    const strokes: PdfTextStroke<string>[] = [
      // "1": a narrow bar with a flag.
      {
        id: 'one',
        filled: true,
        points: [
          { x: 0.6, y: 0 },
          { x: 0.6 + w, y: 0 },
          { x: 0.6 + w, y: 2.5 },
          { x: 0.45, y: 2.5 },
          { x: 0.1, y: 2.1 },
          { x: 0.2, y: 2.0 },
          { x: 0.6, y: 2.25 },
          { x: 0.6, y: 0 }
        ]
      },
      // "0": outer contour plus a hole.
      { id: 'zero', filled: true, points: ring(2.5, 0.7, 1.25) },
      { id: 'zero', filled: true, points: ring(2.5, 0.7 - w, 1.25 - w) }
    ]
    const { lines } = clusterPdfTextStrokes(strokes, {
      textHeight: 2.5,
      angle: 0,
      attachLongStrokes: false
    })
    expect(recognizePdfDimStrokeText(lines[0])).toBe('10')
  })
})
