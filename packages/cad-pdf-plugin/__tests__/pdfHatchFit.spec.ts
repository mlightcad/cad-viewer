import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { AcDbPredefinedAcadIsoPat } from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import {
  acapPdfHatchPatternLabel,
  acapPdfRecoverHatches
} from '../src/pdfHatchRecover'
import type { PdfImportShapeItem } from '../src/pdfImportShapes'
import type { PdfRecognizedShape } from '../src/recognition/pdfCurveRecognition'
import {
  acapPdfBoundaryAt,
  acapPdfFitHatch,
  acapPdfMatchHatch
} from '../src/recognition/pdfHatchRecognition'

type Point = { x: number; y: number }

const DEG = Math.PI / 180
const TOL = 0.05

/** World definition lines of a library pattern at `scale`, angle 0. */
function patternLines(name: string, scale: number) {
  const pattern = AcDbPredefinedAcadIsoPat.patterns.find(p => p.name === name)!
  return pattern.lines.map(line => {
    const angle = line.angle * DEG
    const dx = line.deltaX * scale
    const dy = line.deltaY * scale
    return {
      angle,
      base: { x: line.originX * scale, y: line.originY * scale },
      offset: {
        x: Math.cos(angle) * dx - Math.sin(angle) * dy,
        y: Math.sin(angle) * dx + Math.cos(angle) * dy
      },
      dashLengths: line.dashes.map(d => d * scale)
    }
  })
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ]
}

function lineItem(a: Point, b: Point, layerName = 'HATCH'): PdfImportShapeItem {
  return { shape: { kind: 'line', start: a, end: b }, layerName }
}

/** Walls (on their own layer) around strokes of `pattern` at `scale`. */
function room(outline: Point[], pattern: string, scale: number) {
  const items: PdfImportShapeItem[] = outline.map((p, i) =>
    lineItem(p, outline[(i + 1) % outline.length], 'WALL')
  )
  const strokes = tessellateHatchPattern(
    [outline],
    patternLines(pattern, scale),
    0
  )
  const first = items.length
  for (const [a, b] of strokes) items.push(lineItem(a, b))
  const strokeIndices = strokes.map((_, i) => first + i)
  return { items, strokeIndices }
}

function boundaryOf(outline: Point[]): PdfRecognizedShape[] {
  return [
    {
      kind: 'polyline',
      vertices: outline.map(p => ({ ...p, bulge: 0 })),
      closed: true
    }
  ]
}

describe('acapPdfFitHatch', () => {
  const outline = rect(0, 0, 80, 50)
  const { items, strokeIndices } = room(outline, 'ANSI37', 2)
  const boundary = boundaryOf(outline)

  test('measures the scale of the requested pattern', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'predefined', name: 'ANSI37' },
      { tolerance: TOL }
    )!

    expect(fit.fitted).toBe(true)
    expect(fit.hatch.pattern).toMatchObject({
      type: 'predefined',
      name: 'ANSI37'
    })
    expect(
      fit.hatch.pattern.type === 'predefined' && fit.hatch.pattern.scale
    ).toBeCloseTo(2, 3)
    expect(fit.match.precision).toBeGreaterThan(0.95)
    expect(fit.match.recall).toBeGreaterThan(0.95)
    expect(fit.match.items).toEqual(strokeIndices)
    expect(fit.hatch.items).toEqual(fit.match.items)
  })

  test('a pattern that explains only half the strokes scores low recall', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'predefined', name: 'ANSI31' },
      { tolerance: TOL }
    )!

    expect(fit.match.recall).toBeLessThan(0.7)
    // It still only replaces strokes it re-draws.
    expect(fit.match.items.every(i => strokeIndices.includes(i))).toBe(true)
    expect(fit.match.items.length).toBeLessThan(strokeIndices.length)
  })

  test('places a given scale and angle as they are', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'predefined', name: 'ANSI37', scale: 1, angle: 0 },
      { tolerance: TOL }
    )!

    expect(fit.hatch.pattern).toMatchObject({ scale: 1, angle: 0 })
    expect(fit.match.precision).toBeLessThan(0.7)
  })

  test('without a pattern, picks the library pattern', () => {
    const fit = acapPdfFitHatch(items, boundary, undefined, {
      tolerance: TOL
    })!

    expect(fit.hatch.pattern).toMatchObject({
      type: 'predefined',
      name: 'ANSI37'
    })
    expect(fit.match.items).toEqual(strokeIndices)
  })

  test('fits user-defined crossed lines', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'userDefined', double: true },
      { tolerance: TOL }
    )!

    expect(fit.hatch.pattern).toMatchObject({
      type: 'userDefined',
      double: true
    })
    expect(fit.match.recall).toBeGreaterThan(0.95)
  })

  test('returns undefined for an unknown pattern name', () => {
    expect(
      acapPdfFitHatch(
        items,
        boundary,
        { type: 'predefined', name: 'NO_SUCH' },
        { tolerance: TOL }
      )
    ).toBeUndefined()
  })

  test('acapPdfMatchHatch scores a hatch the same way', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'predefined', name: 'ANSI37' },
      { tolerance: TOL }
    )!

    expect(acapPdfMatchHatch(items, fit.hatch, TOL)).toEqual(fit.match)
  })

  test('refuses to draw a far too small scale', () => {
    const fit = acapPdfFitHatch(
      items,
      boundary,
      { type: 'predefined', name: 'ANSI37', scale: 1e-4, angle: 0 },
      { tolerance: TOL }
    )!

    expect(fit.match).toEqual({ precision: 0, recall: 0, items: [] })
  })
})

describe('acapPdfBoundaryAt', () => {
  test('finds the walls around a point, ignoring the strokes', () => {
    const { items } = room(rect(0, 0, 80, 50), 'ANSI31', 1)

    const shapes = acapPdfBoundaryAt(items, { x: 41.3, y: 22.7 }, TOL)!

    expect(shapes).toHaveLength(1)
    const shape = shapes[0]
    expect(shape.kind).toBe('polyline')
    if (shape.kind !== 'polyline') return
    const xs = shape.vertices.map(v => v.x)
    const ys = shape.vertices.map(v => v.y)
    expect(Math.min(...xs)).toBeCloseTo(0, 3)
    expect(Math.max(...xs)).toBeCloseTo(80, 3)
    expect(Math.min(...ys)).toBeCloseTo(0, 3)
    expect(Math.max(...ys)).toBeCloseTo(50, 3)
  })

  test('keeps walls drawn on the layer of the strokes', () => {
    const { items } = room(rect(0, 0, 60, 40), 'ANSI31', 1)
    for (const item of items) item.layerName = '0'

    const shapes = acapPdfBoundaryAt(items, { x: 30.2, y: 20.3 }, 0.32)

    expect(shapes).toHaveLength(1)
  })

  test('returns undefined outside every closed area', () => {
    const { items } = room(rect(0, 0, 80, 50), 'ANSI31', 1)

    expect(acapPdfBoundaryAt(items, { x: 200, y: 200 }, TOL)).toBeUndefined()
  })
})

describe('acapPdfBoundaryAt on imported PDF strokes', () => {
  function polygonArea(points: readonly Point[]): number {
    let sum = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      sum += (points[j].x + points[i].x) * (points[j].y - points[i].y)
    }
    return Math.abs(sum / 2)
  }

  function insidePolygon(p: Point, polygon: readonly Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]
      const b = polygon[j]
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      ) {
        inside = !inside
      }
    }
    return inside
  }

  // Walls with tiny outline steps (ANSI32), axis lines across the hatch
  // (ANSI36) and touching hatches of one pattern; once as imported, once
  // with every entity in one style (a drawing where all is on layer 0).
  const FIXTURES = [
    'cathedral-ansi36',
    'cathedral-ansi32-wall',
    'cathedral-ansi32-arch',
    'cathedral-ansi35',
    'cathedral-ansi36-touching'
  ]
  test.each(
    FIXTURES.flatMap(name => [
      [name, false],
      [name, true]
    ])
  )(
    'a point inside each hatch of %s (one style: %s) finds its area and pattern',
    (name, oneStyle) => {
      const loaded = JSON.parse(
        readFileSync(join(__dirname, 'fixtures', `${name}.json`), 'utf8')
      ) as PdfImportShapeItem[]
      const items = oneStyle
        ? loaded.map(item => ({ shape: item.shape, layerName: '0' }))
        : loaded
      const { tolerance, hatches } = acapPdfRecoverHatches({
        items,
        owners: items.map((_, i) => i)
      })
      expect(hatches.length).toBeGreaterThan(0)
      for (const { hatch } of hatches) {
        const outline = hatch.boundary[0]
        if (outline.kind !== 'polyline') throw new Error('polyline expected')
        const polygon = outline.vertices
        const xs = polygon.map(v => v.x)
        const ys = polygon.map(v => v.y)
        let tried = 0
        for (let fx = 0.1; fx < 1; fx += 0.2) {
          for (let fy = 0.1; fy < 1; fy += 0.2) {
            const p = {
              x: Math.min(...xs) + fx * (Math.max(...xs) - Math.min(...xs)),
              y: Math.min(...ys) + fy * (Math.max(...ys) - Math.min(...ys))
            }
            if (!insidePolygon(p, polygon)) continue
            tried++
            const found = acapPdfBoundaryAt(items, p, tolerance)!
            expect(found).toBeDefined()
            const loop = found[0]
            if (loop.kind !== 'polyline') throw new Error('polyline expected')
            expect(polygonArea(loop.vertices)).toBeCloseTo(
              polygonArea(polygon),
              -Math.log10(polygonArea(polygon) * 0.02)
            )
            const fit = acapPdfFitHatch(items, found, undefined, { tolerance })!
            expect(acapPdfHatchPatternLabel(fit.hatch)).toBe(
              acapPdfHatchPatternLabel(hatch)
            )
          }
        }
        expect(tried).toBeGreaterThan(0)
      }
    }
  )
})
