import type { PdfImportSegment } from '../src/pdfVectorImport'
import { recognizePdfCurves } from '../src/recognition/pdfCurveRecognition'

const KAPPA = 0.5522847498

type P = { x: number; y: number }

/** Bezier segments approximating a circular arc, one cubic per <= 90°. */
function arcCubics(
  center: P,
  radius: number,
  start: number,
  sweep: number,
  transform: (p: P) => P = p => p
): PdfImportSegment[] {
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9))
  const step = sweep / count
  const k = (4 / 3) * Math.tan(step / 4)
  const out: PdfImportSegment[] = []
  for (let i = 0; i < count; i++) {
    const a0 = start + step * i
    const a1 = a0 + step
    const p0 = { x: Math.cos(a0), y: Math.sin(a0) }
    const p3 = { x: Math.cos(a1), y: Math.sin(a1) }
    const p1 = { x: p0.x - k * p0.y, y: p0.y + k * p0.x }
    const p2 = { x: p3.x + k * p3.y, y: p3.y - k * p3.x }
    const map = (p: P) =>
      transform({ x: center.x + radius * p.x, y: center.y + radius * p.y })
    out.push({
      kind: 'cubic',
      p0: map(p0),
      p1: map(p1),
      p2: map(p2),
      p3: map(p3)
    })
  }
  // Share exact end points like the importer does.
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1] as Extract<PdfImportSegment, { kind: 'cubic' }>
    ;(out[i] as Extract<PdfImportSegment, { kind: 'cubic' }>).p0 = prev.p3
  }
  return out
}

function lines(points: P[]): PdfImportSegment[] {
  const out: PdfImportSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    out.push({ kind: 'line', p0: points[i], p1: points[i + 1] })
  }
  return out
}

function polygon(center: P, radius: number, n: number, sweep = 2 * Math.PI) {
  const pts: P[] = []
  const full = Math.abs(Math.abs(sweep) - 2 * Math.PI) < 1e-12
  for (let i = 0; i <= n; i++) {
    const a = (sweep * i) / n
    pts.push({
      x: center.x + radius * Math.cos(a),
      y: center.y + radius * Math.sin(a)
    })
  }
  if (full) pts[n] = pts[0]
  return pts
}

describe('recognizePdfCurves', () => {
  it('turns a four-cubic Bezier circle into a circle', () => {
    const segments = arcCubics({ x: 10, y: 20 }, 5, 0, 2 * Math.PI)
    // Close exactly on the first point, as PDF content usually does.
    const last = segments[3] as Extract<PdfImportSegment, { kind: 'cubic' }>
    last.p3 = (segments[0] as typeof last).p0
    const shapes = recognizePdfCurves(segments)
    expect(shapes).toHaveLength(1)
    const shape = shapes[0]
    expect(shape.kind).toBe('circle')
    if (shape.kind !== 'circle') return
    expect(shape.center.x).toBeCloseTo(10, 3)
    expect(shape.center.y).toBeCloseTo(20, 3)
    expect(shape.radius).toBeCloseTo(5, 3)
    expect(KAPPA).toBeCloseTo((4 / 3) * Math.tan(Math.PI / 8), 6)
  })

  it('turns a counterclockwise Bezier arc into an arc', () => {
    const shapes = recognizePdfCurves(
      arcCubics({ x: 0, y: 0 }, 10, 0, Math.PI * 0.75)
    )
    expect(shapes).toHaveLength(1)
    const shape = shapes[0]
    expect(shape.kind).toBe('arc')
    if (shape.kind !== 'arc') return
    expect(shape.radius).toBeCloseTo(10, 3)
    expect(shape.startAngle).toBeCloseTo(0, 4)
    expect(shape.endAngle).toBeCloseTo(Math.PI * 0.75, 4)
  })

  it('swaps the ends of a clockwise arc so the CAD arc stays CCW', () => {
    const shapes = recognizePdfCurves(
      arcCubics({ x: 0, y: 0 }, 10, Math.PI / 2, -Math.PI / 2)
    )
    const shape = shapes[0]
    expect(shape.kind).toBe('arc')
    if (shape.kind !== 'arc') return
    expect(shape.startAngle).toBeCloseTo(0, 4)
    expect(shape.endAngle).toBeCloseTo(Math.PI / 2, 4)
  })

  it('recovers an ellipse from a non-uniformly scaled circle', () => {
    const scaleX = (p: P) => ({ x: p.x * 2, y: p.y })
    const segments = arcCubics({ x: 0, y: 0 }, 5, 0, 2 * Math.PI, scaleX)
    const last = segments[3] as Extract<PdfImportSegment, { kind: 'cubic' }>
    last.p3 = (segments[0] as typeof last).p0
    const shapes = recognizePdfCurves(segments)
    expect(shapes).toHaveLength(1)
    const shape = shapes[0]
    expect(shape.kind).toBe('ellipse')
    if (shape.kind !== 'ellipse') return
    expect(Math.hypot(shape.majorAxis.x, shape.majorAxis.y)).toBeCloseTo(10, 2)
    expect(Math.abs(shape.majorAxis.x)).toBeCloseTo(10, 2)
    expect(shape.radiusRatio).toBeCloseTo(0.5, 2)
    expect(shape.endAngle - shape.startAngle).toBeCloseTo(2 * Math.PI, 6)
  })

  it('recovers an axis-aligned ellipse far from the origin (Float32 input)', () => {
    // pdf.js packs path coordinates into a Float32Array; the near-zero
    // off-diagonal conic term must not pick a noisy major axis.
    const f32 = (p: P) => ({ x: Math.fround(p.x * 2), y: Math.fround(p.y) })
    const segments = arcCubics({ x: 200, y: 550 }, 30, 0, 2 * Math.PI, f32)
    const last = segments[3] as Extract<PdfImportSegment, { kind: 'cubic' }>
    last.p3 = (segments[0] as typeof last).p0
    const shape = recognizePdfCurves(segments)[0]
    expect(shape.kind).toBe('ellipse')
    if (shape.kind !== 'ellipse') return
    expect(Math.abs(shape.majorAxis.x)).toBeCloseTo(60, 1)
    expect(shape.majorAxis.y).toBeCloseTo(0, 2)
    expect(shape.center.x).toBeCloseTo(400, 2)
    expect(shape.radiusRatio).toBeCloseTo(0.5, 3)
  })

  it('rebuilds a circle from a finely flattened polygon', () => {
    const shapes = recognizePdfCurves(lines(polygon({ x: 3, y: 4 }, 20, 64)))
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('circle')
    if (shapes[0].kind !== 'circle') return
    expect(shapes[0].radius).toBeCloseTo(20, 1)
  })

  it('keeps regular polygons such as octagons as polylines', () => {
    const shapes = recognizePdfCurves(lines(polygon({ x: 0, y: 0 }, 20, 8)))
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('polyline')
  })

  it('keeps a rectangle as a closed straight polyline', () => {
    const shapes = recognizePdfCurves(
      lines([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
        { x: 0, y: 0 }
      ])
    )
    const shape = shapes[0]
    expect(shape.kind).toBe('polyline')
    if (shape.kind !== 'polyline') return
    expect(shape.closed).toBe(true)
    expect(shape.vertices).toHaveLength(4)
    expect(shape.vertices.every(v => v.bulge === 0)).toBe(true)
  })

  it('builds a bulged polyline for a slot (lines + semicircles)', () => {
    const right = arcCubics({ x: 10, y: 0 }, 2, -Math.PI / 2, Math.PI)
    const left = arcCubics({ x: 0, y: 0 }, 2, Math.PI / 2, Math.PI)
    const segments: PdfImportSegment[] = [
      { kind: 'line', p0: { x: 0, y: -2 }, p1: { x: 10, y: -2 } },
      ...right,
      { kind: 'line', p0: { x: 10, y: 2 }, p1: { x: 0, y: 2 } },
      ...left
    ]
    const shapes = recognizePdfCurves(segments)
    const shape = shapes[0]
    expect(shape.kind).toBe('polyline')
    if (shape.kind !== 'polyline') return
    expect(shape.closed).toBe(true)
    expect(shape.vertices).toHaveLength(4)
    const bulges = shape.vertices.map(v => v.bulge)
    expect(bulges[0]).toBe(0)
    expect(bulges[1]).toBeCloseTo(1, 4)
    expect(bulges[2]).toBe(0)
    expect(bulges[3]).toBeCloseTo(1, 4)
  })

  it('turns a straight cubic into a line', () => {
    const shapes = recognizePdfCurves([
      {
        kind: 'cubic',
        p0: { x: 0, y: 0 },
        p1: { x: 3, y: 0 },
        p2: { x: 7, y: 0 },
        p3: { x: 10, y: 0 }
      }
    ])
    expect(shapes).toEqual([
      { kind: 'line', start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
    ])
  })

  it('emits free-form Bezier chains as an exact spline', () => {
    const shapes = recognizePdfCurves([
      {
        kind: 'cubic',
        p0: { x: 0, y: 0 },
        p1: { x: 2, y: 8 },
        p2: { x: 5, y: -6 },
        p3: { x: 9, y: 1 }
      },
      {
        kind: 'cubic',
        p0: { x: 9, y: 1 },
        p1: { x: 13, y: 8 },
        p2: { x: 14, y: 9 },
        p3: { x: 20, y: 0 }
      }
    ])
    const shape = shapes[0]
    expect(shape.kind).toBe('spline')
    if (shape.kind !== 'spline') return
    expect(shape.controlPoints).toHaveLength(7)
    expect(shape.knots).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2])
  })

  it('flattens free-form curves into a polyline when splines are disabled', () => {
    const shapes = recognizePdfCurves(
      [
        {
          kind: 'cubic',
          p0: { x: 0, y: 0 },
          p1: { x: 2, y: 8 },
          p2: { x: 5, y: -6 },
          p3: { x: 9, y: 1 }
        }
      ],
      { splines: false }
    )
    expect(shapes[0].kind).toBe('polyline')
  })

  it('ignores degenerate zero-length segments', () => {
    expect(
      recognizePdfCurves([
        { kind: 'line', p0: { x: 1, y: 1 }, p1: { x: 1, y: 1 } }
      ])
    ).toEqual([])
  })
})
