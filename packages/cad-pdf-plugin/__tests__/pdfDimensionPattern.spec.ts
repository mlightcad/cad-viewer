import {
  parsePdfDimensionValue,
  pdfArrowFromPolygon,
  type PdfDimInput,
  type PdfLinearDimension,
  type PdfRadialDimension,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from '../src/recognition/pdfDimensionPattern'

type P = { x: number; y: number }
let nextId = 0
const id = () => `e${nextId++}`

/** Slender arrow triangle with its tip at `tip`, pointing along `dir`. */
function arrow(tip: P, dir: P, size = 2.5) {
  const len = Math.hypot(dir.x, dir.y)
  const u = { x: dir.x / len, y: dir.y / len }
  const n = { x: -u.y, y: u.x }
  const base = { x: tip.x - u.x * size, y: tip.y - u.y * size }
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

function seg(p0: P, p1: P) {
  return { id: id(), p0, p1 }
}

function text(t: string, center: P, height = 2.5) {
  return { id: id(), text: t, center, height }
}

function empty(): PdfDimInput<string> {
  return { segments: [], polygons: [], curves: [], texts: [] }
}

/** Horizontal dimension from x0 to x1 measuring an object at y = 0. */
function addHorizontal(
  input: PdfDimInput<string>,
  x0: number,
  x1: number,
  label: string,
  y = 10
) {
  input.segments.push(seg({ x: x0, y: 1 }, { x: x0, y: y + 2 }))
  input.segments.push(seg({ x: x1, y: 1 }, { x: x1, y: y + 2 }))
  input.segments.push(seg({ x: x0, y }, { x: x1, y }))
  input.polygons.push(arrow({ x: x0, y }, { x: -1, y: 0 }))
  input.polygons.push(arrow({ x: x1, y }, { x: 1, y: 0 }))
  input.texts.push(text(label, { x: (x0 + x1) / 2, y: y + 2 }))
}

describe('pdfArrowFromPolygon', () => {
  it('finds tip and direction of a slender triangle', () => {
    const a = pdfArrowFromPolygon(
      arrow({ x: 5, y: 5 }, { x: 0, y: 1 }).vertices
    )!
    expect(a.tip).toEqual({ x: 5, y: 5 })
    expect(a.direction.y).toBeCloseTo(1, 9)
    expect(a.size).toBeCloseTo(2.5, 9)
  })

  it('rejects blunt triangles', () => {
    expect(
      pdfArrowFromPolygon([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 8 }
      ])
    ).toBeUndefined()
  })
})

describe('parsePdfDimensionValue', () => {
  it.each([
    ['50', 50],
    ['1,200', 1200],
    ['12,5', 12.5],
    ['Ø25', 25],
    ['R 10.5', 10.5],
    ['2x Ø6', 2]
  ])('%s → %d', (input, expected) => {
    expect(parsePdfDimensionValue(input)).toBe(expected)
  })
})

describe('recognizePdfDimensions', () => {
  it('recognizes a horizontal dimension with extension lines', () => {
    const input = empty()
    addHorizontal(input, 0, 50, '50')
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.kind).toBe('linear')
    expect(dim.measured).toBeCloseTo(50, 9)
    expect(dim.rotation).toBeCloseTo(0, 9)
    expect(dim.xLine1).toEqual({ x: 0, y: 1 })
    expect(dim.xLine2).toEqual({ x: 50, y: 1 })
    expect(dim.dimLinePoint.y).toBeCloseTo(10, 9)
    expect(dim.extensionBeyond).toBeCloseTo(2, 9)
    expect(dim.text.text).toBe('50')
    // 2 arrows + text + dim line + 2 extension lines.
    expect(dim.consumed).toHaveLength(6)
  })

  it('keeps chained dimensions sharing an extension line apart', () => {
    const input = empty()
    addHorizontal(input, 0, 30, '30')
    addHorizontal(input, 30, 80, '50')
    const dims = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dims.map(d => d.text.text).sort()).toEqual(['30', '50'])
    expect(dims.map(d => Math.round(d.measured)).sort((a, b) => a - b)).toEqual(
      [30, 50]
    )
  })

  it('shares one extension line between chained dimensions', () => {
    // As imported from PDF: duplicate outlines are de-duplicated, so the
    // middle extension line exists once and both dimensions reference it.
    const input = empty()
    input.segments.push(seg({ x: 0, y: 1 }, { x: 0, y: 12 }))
    input.segments.push(seg({ x: 30, y: 1 }, { x: 30, y: 12 }))
    input.segments.push(seg({ x: 80, y: 1 }, { x: 80, y: 12 }))
    input.segments.push(seg({ x: 0, y: 10 }, { x: 30, y: 10 }))
    input.segments.push(seg({ x: 30, y: 10 }, { x: 80, y: 10 }))
    input.polygons.push(arrow({ x: 0, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 30, y: 10 }, { x: 1, y: 0 }))
    input.polygons.push(arrow({ x: 30, y: 10 }, { x: -1, y: 0 }))
    input.polygons.push(arrow({ x: 80, y: 10 }, { x: 1, y: 0 }))
    input.texts.push(text('30', { x: 15, y: 12 }))
    input.texts.push(text('50', { x: 55, y: 12 }))
    const dims = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dims).toHaveLength(2)
    const short = dims.find(d => d.text.text === '30')!
    const long = dims.find(d => d.text.text === '50')!
    expect(short.xLine2).toEqual({ x: 30, y: 1 })
    expect(long.xLine1).toEqual({ x: 30, y: 1 })
    // Each dimension line belongs to its own dimension only.
    const all = [...short.consumed, ...long.consumed]
    expect(new Set(all).size).toBe(all.length)
    expect(new Set(all).size).toBe(input.segments.length + 4 + 2)
  })

  it('recognizes vertical dimensions and outside arrows', () => {
    const input = empty()
    // Vertical, arrows outside a short span (pointing toward each other).
    input.polygons.push(arrow({ x: 20, y: 0 }, { x: 0, y: 1 }))
    input.polygons.push(arrow({ x: 20, y: 4 }, { x: 0, y: -1 }))
    input.segments.push(seg({ x: 20, y: -5 }, { x: 20, y: 9 }))
    input.texts.push(text('4', { x: 22.5, y: 2 }))
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.measured).toBeCloseTo(4, 9)
    expect(dim.rotation).toBeCloseTo(Math.PI / 2, 9)
  })

  it('recognizes architectural tick dimensions', () => {
    const input = empty()
    input.segments.push(seg({ x: -1, y: 10 }, { x: 41, y: 10 }))
    input.segments.push(seg({ x: -1, y: 9 }, { x: 1, y: 11 }))
    input.segments.push(seg({ x: 39, y: 9 }, { x: 41, y: 11 }))
    input.texts.push(text('400', { x: 20, y: 12 }))
    const [dim] = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dim.ticks).toBe(true)
    expect(dim.measured).toBeCloseTo(40, 9)
  })

  it('recognizes radius and diameter dimensions', () => {
    const input = empty()
    input.curves.push({ center: { x: 0, y: 0 }, radius: 10 })
    input.polygons.push(arrow({ x: 10, y: 0 }, { x: 1, y: 0 }))
    input.segments.push(seg({ x: 0, y: 0 }, { x: 10, y: 0 }))
    input.texts.push(text('R10', { x: 4, y: 2 }))
    input.curves.push({ center: { x: 100, y: 0 }, radius: 5 })
    input.polygons.push(arrow({ x: 100, y: 5 }, { x: 0, y: -1 }))
    input.texts.push(text('Ø10', { x: 100, y: 12 }))
    const dims = recognizePdfDimensions(input) as PdfRadialDimension<string>[]
    expect(dims.map(d => d.kind).sort()).toEqual(['diameter', 'radius'])
    const r = dims.find(d => d.kind === 'radius')!
    expect(r.chordPoint).toEqual({ x: 10, y: 0 })
    expect(r.measured).toBe(10)
    expect(dims.find(d => d.kind === 'diameter')!.measured).toBe(10)
  })

  it('recognizes angular dimensions on a dimension arc', () => {
    const input = empty()
    const a = Math.PI / 4
    input.arcs = [
      {
        id: 'arc',
        center: { x: 0, y: 0 },
        radius: 20,
        startAngle: 0,
        endAngle: a
      }
    ]
    // Arrows at both ends pointing along the arc (outward from its middle).
    input.polygons.push(arrow({ x: 20, y: 0 }, { x: 0, y: -1 }))
    input.polygons.push(
      arrow(
        { x: 20 * Math.cos(a), y: 20 * Math.sin(a) },
        { x: -Math.sin(a), y: Math.cos(a) }
      )
    )
    // Radial extension lines from the object (r = 5) past the arc.
    input.segments.push(seg({ x: 5, y: 0 }, { x: 22, y: 0 }))
    input.segments.push(
      seg(
        { x: 5 * Math.cos(a), y: 5 * Math.sin(a) },
        { x: 22 * Math.cos(a), y: 22 * Math.sin(a) }
      )
    )
    input.texts.push(
      text('45°', { x: 21 * Math.cos(a / 2), y: 21 * Math.sin(a / 2) })
    )
    const [dim] = recognizePdfDimensions(input)
    expect(dim.kind).toBe('angular')
    if (dim.kind !== 'angular') return
    expect(dim.measured).toBeCloseTo(45, 6)
    expect(dim.xLine1).toEqual({ x: 5, y: 0 })
    expect(dim.consumed).toContain('arc')
    // Arc, 2 arrows, text, 2 extension lines.
    expect(dim.consumed).toHaveLength(6)
    // Angles never vote for the drawing scale.
    expect(suggestPdfDimensionScale([dim])).toBeUndefined()
  })

  it('ignores arrow pairs without a value text', () => {
    const input = empty()
    addHorizontal(input, 0, 50, '50')
    input.texts = []
    expect(recognizePdfDimensions(input)).toHaveLength(0)
  })

  it('suggests the drawing scale from text values', () => {
    const input = empty()
    addHorizontal(input, 0, 30, '3000')
    addHorizontal(input, 30, 80, '5000')
    addHorizontal(input, 0, 80, '8001', 20)
    expect(suggestPdfDimensionScale(recognizePdfDimensions(input))).toBeCloseTo(
      100,
      6
    )
  })
})
