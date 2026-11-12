import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { AcDbPredefinedAcadIsoPat } from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import type { PdfImportShapeItem } from '../src/pdfImportShapes'
import {
  acapPdfRecognizeHatches,
  type PdfHatchDefinitionLine,
  type PdfRecognizedHatch
} from '../src/recognition/pdfHatchRecognition'

type Point = { x: number; y: number }

const DEG = Math.PI / 180

/** World definition lines of a library pattern (DXF convention). */
function patternLines(
  name: string,
  scale: number,
  angleDeg: number,
  origin: Point = { x: 0, y: 0 }
): PdfHatchDefinitionLine[] {
  const pattern = AcDbPredefinedAcadIsoPat.patterns.find(p => p.name === name)
  if (!pattern) throw new Error(`no pattern ${name}`)
  const r = angleDeg * DEG
  return pattern.lines.map(line => {
    const angle = line.angle * DEG + r
    const ox = line.originX * scale
    const oy = line.originY * scale
    const dx = line.deltaX * scale
    const dy = line.deltaY * scale
    return {
      angle,
      base: {
        x: Math.cos(r) * ox - Math.sin(r) * oy + origin.x,
        y: Math.sin(r) * ox + Math.cos(r) * oy + origin.y
      },
      offset: {
        x: Math.cos(angle) * dx - Math.sin(angle) * dy,
        y: Math.sin(angle) * dx + Math.cos(angle) * dy
      },
      dashLengths: line.dashes.map(d => d * scale)
    }
  })
}

/** Rounds like a PDF writer (0.01 pt is about 0.0035 mm). */
function round(p: Point): Point {
  const q = 0.0035
  return { x: Math.round(p.x / q) * q, y: Math.round(p.y / q) * q }
}

/** The strokes a PDF producer writes for a pattern hatch. */
function strokes(
  loops: Point[][],
  lines: PdfHatchDefinitionLine[]
): PdfImportShapeItem[] {
  return tessellateHatchPattern(loops, lines, 0).map(([a, b]) => ({
    shape: { kind: 'line', start: round(a), end: round(b) },
    color: '#000000',
    lineWidth: 0.18
  }))
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ]
}

function outlineItem(points: Point[]): PdfImportShapeItem {
  return {
    shape: {
      kind: 'polyline',
      vertices: points.map(p => ({ ...p, bulge: 0 })),
      closed: true
    },
    color: '#000000',
    lineWidth: 0.35
  }
}

function only(hatches: PdfRecognizedHatch[]): PdfRecognizedHatch {
  expect(hatches).toHaveLength(1)
  return hatches[0]
}

function expectPredefined(
  hatch: PdfRecognizedHatch,
  name: string,
  scale: number,
  angleDeg: number
) {
  expect(hatch.pattern.type).toBe('predefined')
  if (hatch.pattern.type !== 'predefined') return
  expect(hatch.pattern.name).toBe(name)
  expect(hatch.pattern.scale).toBeCloseTo(scale, 3)
  expect(hatch.pattern.angle / DEG).toBeCloseTo(angleDeg, 2)
}

describe('acapPdfRecognizeHatches', () => {
  test('rebuilds ANSI31 bounded by a drawn rectangle', () => {
    const outline = rect(0, 0, 100, 60)
    const hatchItems = strokes([outline], patternLines('ANSI31', 1, 0))
    const items = [outlineItem(outline), ...hatchItems]

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    const hatch = only(hatches)
    expectPredefined(hatch, 'ANSI31', 1, 0)
    expect(consumed.size).toBe(hatchItems.length)
    // The drawn outline stays an entity and bounds the hatch.
    expect(consumed.has(0)).toBe(false)
    expect(hatch.boundary).toHaveLength(1)
    expect(hatch.items[0]).toBe(1)
    expect(hatch.color).toBe('#000000')
    expect(hatch.lineWidth).toBe(0.18)
  })

  test('recovers scale, angle and origin without a drawn boundary', () => {
    const outline = rect(10, 20, 130, 95)
    const items = strokes(
      [outline],
      patternLines('ANSI31', 2, 30, { x: 1.3, y: 0.7 })
    )

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expectPredefined(only(hatches), 'ANSI31', 2, 30)
    expect(consumed.size).toBe(items.length)
  })

  test('rebuilds a cross-hatch (ANSI37)', () => {
    const outline = rect(0, 0, 80, 50)
    const hatchItems = strokes([outline], patternLines('ANSI37', 1.5, 0))
    const items = [outlineItem(outline), ...hatchItems]

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expectPredefined(only(hatches), 'ANSI37', 1.5, 0)
    expect(consumed.size).toBe(hatchItems.length)
  })

  test('rebuilds dashed bricks (AR-B816) with their joint offset', () => {
    const outline = rect(0, 0, 2000, 1200)
    const hatchItems = strokes(
      [outline],
      patternLines('AR-B816', 1, 0, { x: 57, y: 31 })
    )
    const items = [outlineItem(outline), ...hatchItems]

    const { hatches, consumed } = acapPdfRecognizeHatches(items, {
      tolerance: 0.5
    })

    expectPredefined(only(hatches), 'AR-B816', 1, 0)
    expect(consumed.size).toBe(hatchItems.length)
  })

  test('keeps a hole bounded by an inner outline', () => {
    const outer = rect(0, 0, 100, 80)
    const inner = rect(30, 25, 60, 50)
    const hatchItems = strokes([outer, inner], patternLines('ANSI31', 1, 0))
    const items = [outlineItem(outer), outlineItem(inner), ...hatchItems]

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    const hatch = only(hatches)
    expectPredefined(hatch, 'ANSI31', 1, 0)
    expect(hatch.boundary).toHaveLength(2)
    expect(consumed.size).toBe(hatchItems.length)
  })

  test('uses a drawn circle as the boundary', () => {
    const circle: Point[] = []
    for (let i = 0; i < 360; i++) {
      const a = (i / 360) * Math.PI * 2
      circle.push({ x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a) })
    }
    const hatchItems = strokes([circle], patternLines('ANSI31', 1, 0))
    const items: PdfImportShapeItem[] = [
      {
        shape: { kind: 'circle', center: { x: 50, y: 50 }, radius: 40 },
        color: '#000000'
      },
      ...hatchItems
    ]

    const { hatches } = acapPdfRecognizeHatches(items)

    expect(only(hatches).boundary[0].kind).toBe('circle')
  })

  test('uses the clip path of a concave hatch', () => {
    const lShape: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 90 },
      { x: 0, y: 90 }
    ]
    const items = strokes([lShape], patternLines('ANSI31', 1, 0)).map(item => ({
      ...item,
      clipPath: 0
    }))

    const { hatches, consumed } = acapPdfRecognizeHatches(items, undefined, [
      [lShape]
    ])

    expectPredefined(only(hatches), 'ANSI31', 1, 0)
    expect(consumed.size).toBe(items.length)
  })

  test('rebuilds evenly spaced lines at any angle and spacing', () => {
    const outline = rect(0, 0, 90, 70)
    const lines: PdfHatchDefinitionLine[] = [
      {
        angle: 20 * DEG,
        base: { x: 0.4, y: 0.2 },
        offset: { x: -Math.sin(20 * DEG) * 7.3, y: Math.cos(20 * DEG) * 7.3 },
        dashLengths: []
      }
    ]
    const items = strokes([outline], lines)

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    const hatch = only(hatches)
    expect(hatch.definitionLines).toHaveLength(1)
    expect(hatch.definitionLines[0].angle / DEG).toBeCloseTo(20, 1)
    // Library LINE turned 20 degrees, not ANSI31 turned -25 degrees.
    expectPredefined(hatch, 'LINE', 7.3 / 3.175, 20)
    // Corner stubs shorter than a few tolerances may stay as lines.
    expect(consumed.size).toBeGreaterThanOrEqual(items.length - 1)
  })

  test('keeps hatches with different colours apart', () => {
    const red = strokes([rect(0, 0, 50, 50)], patternLines('ANSI31', 1, 0)).map(
      item => ({ ...item, color: '#ff0000' })
    )
    const blue = strokes(
      [rect(100, 0, 150, 50)],
      patternLines('ANSI37', 1, 0)
    ).map(item => ({ ...item, color: '#0000ff' }))

    const { hatches } = acapPdfRecognizeHatches([...red, ...blue])

    expect(hatches.map(h => h.color).sort()).toEqual(['#0000ff', '#ff0000'])
  })

  test('stays exact over a large hatch', () => {
    const outline = rect(0, 0, 2000, 1500)
    const items = strokes(
      [outline],
      patternLines('ANSI31', 0.37, 12, { x: 0.9, y: 2.1 })
    )
    expect(items.length).toBeGreaterThan(1000)

    const started = Date.now()
    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expectPredefined(only(hatches), 'ANSI31', 0.37, 12)
    expect(consumed.size).toBeGreaterThanOrEqual(items.length - 2)
    expect(Date.now() - started).toBeLessThan(2000)
  })

  test('separates same-colour hatches whose lines interleave', () => {
    // Side by side along the 45° lines: sorted by offset, the lines of the
    // two hatches alternate, and they meet at the shared edge x = 60.
    const left = strokes([rect(0, 0, 60, 60)], patternLines('ANSI31', 1, 0))
    const right = strokes(
      [rect(60, 0, 120, 60)],
      patternLines('ANSI31', 1.6, 0, { x: 0.5, y: 0 })
    )

    const { hatches, consumed } = acapPdfRecognizeHatches([...left, ...right])

    expect(hatches).toHaveLength(2)
    const scales = hatches
      .map(h => (h.pattern.type === 'predefined' ? h.pattern.scale : 0))
      .sort()
    expect(scales[0]).toBeCloseTo(1, 3)
    expect(scales[1]).toBeCloseTo(1.6, 3)
    expect(consumed.size).toBeGreaterThanOrEqual(left.length + right.length - 2)
  })

  test('leaves irregularly spaced parallel lines alone', () => {
    const offsets = [0, 3, 4, 9, 17, 18.5, 26, 40, 41, 55]
    const items: PdfImportShapeItem[] = offsets.map(y => ({
      shape: { kind: 'line', start: { x: 0, y }, end: { x: 60, y } },
      color: '#000000'
    }))

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expect(hatches).toHaveLength(0)
    expect(consumed.size).toBe(0)
  })

  test('leaves unrelated linework alone', () => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const items: PdfImportShapeItem[] = []
    for (let i = 0; i < 60; i++) {
      const start = { x: random() * 200, y: random() * 200 }
      const a = random() * Math.PI
      const len = 5 + random() * 40
      items.push({
        shape: {
          kind: 'line',
          start,
          end: {
            x: start.x + len * Math.cos(a),
            y: start.y + len * Math.sin(a)
          }
        },
        color: '#000000'
      })
    }

    expect(acapPdfRecognizeHatches(items).hatches).toHaveLength(0)
  })

  test('ignores dashed strokes', () => {
    const items = strokes(
      [rect(0, 0, 60, 40)],
      patternLines('ANSI31', 1, 0)
    ).map(item => ({ ...item, dashPattern: [1, 1] }))

    expect(acapPdfRecognizeHatches(items).hatches).toHaveLength(0)
  })

  test('rebuilds AR-CONC, whose dot-only lines leave no strokes', () => {
    // Like cathedral.dwg handle 6C7C2: AR-CONC at scale 7, plotted at about
    // 1:170 (so a pattern scale of about 0.04 on paper).
    const outline = rect(0, 0, 60, 40)
    const hatchItems = strokes(
      [outline],
      patternLines('AR-CONC', 0.04, 0)
    ).filter(item => {
      const shape = item.shape
      if (shape.kind !== 'line') return true
      return (
        Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y) >
        0.01
      )
    })
    const items = [outlineItem(outline), ...hatchItems]

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expectPredefined(only(hatches), 'AR-CONC', 0.04, 0)
    expect(consumed.size).toBe(hatchItems.length)
  })

  test('rebuilds one pattern spread over separate rooms', () => {
    // AR-CONC strokes of several rooms: every room comes back, whether as
    // one hatch with a loop per room or one hatch per room.
    const rooms = [
      rect(0, 0, 60, 40),
      rect(80, 0, 140, 40),
      rect(0, 60, 140, 100)
    ]
    const dashed = (outline: Point[]) =>
      strokes([outline], patternLines('AR-CONC', 0.04, 0)).filter(item => {
        const shape = item.shape
        if (shape.kind !== 'line') return true
        return (
          Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y) >
          0.01
        )
      })
    const items = rooms.flatMap(room => [outlineItem(room), ...dashed(room)])

    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    expect(hatches.length).toBeGreaterThan(0)
    for (const hatch of hatches) expectPredefined(hatch, 'AR-CONC', 0.04, 0)
    expect(hatches.flatMap(hatch => hatch.boundary)).toHaveLength(3)
    expect(consumed.size).toBe(items.length - rooms.length)
  })

  test('rebuilds ANSI36 when the PDF dropped its dots', () => {
    const outline = rect(0, 0, 90, 60)
    const hatchItems = strokes([outline], patternLines('ANSI36', 1, 0)).filter(
      item => {
        const shape = item.shape
        if (shape.kind !== 'line') return true
        return (
          Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y) >
          0.01
        )
      }
    )
    const items = [outlineItem(outline), ...hatchItems]

    const { hatches } = acapPdfRecognizeHatches(items)

    expectPredefined(only(hatches), 'ANSI36', 1, 0)
  })

  test('finds a boundary drawn as separate lines that run past it', () => {
    // A cross-shaped room: its walls are single lines that cross each other
    // and continue past the corners (T- and X-junctions), as a plan drawn
    // with LINE and exported to PDF looks.
    const room = [
      { x: 20, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 60 },
      { x: 60, y: 60 },
      { x: 60, y: 80 },
      { x: 20, y: 80 },
      { x: 20, y: 60 },
      { x: 0, y: 60 },
      { x: 0, y: 20 },
      { x: 20, y: 20 }
    ]
    const wall = (x0: number, y0: number, x1: number, y1: number) =>
      ({
        shape: { kind: 'line', start: { x: x0, y: y0 }, end: { x: x1, y: y1 } },
        color: '#000000',
        lineWidth: 0.35
      }) as PdfImportShapeItem
    const walls = [
      wall(-10, 20, 90, 20),
      wall(-10, 60, 90, 60),
      wall(20, -10, 20, 90),
      wall(60, -10, 60, 90),
      wall(20, 0, 60, 0),
      wall(20, 80, 60, 80),
      wall(0, 20, 0, 60),
      wall(80, 20, 80, 60),
      // A dimension tick ending inside the room.
      wall(30, 40, 45, 40)
    ]
    const hatchItems = strokes([room], patternLines('ANSI31', 1, 0))
    const items = [...walls, ...hatchItems]

    // Only the faces of the line work bound this hatch.
    expect(
      acapPdfRecognizeHatches(items, { faceBoundaries: false }).hatches
    ).toHaveLength(0)
    const { hatches, consumed } = acapPdfRecognizeHatches(items)

    const hatch = only(hatches)
    expectPredefined(hatch, 'ANSI31', 1, 0)
    expect(hatch.boundary).toHaveLength(1)
    for (let i = 0; i < walls.length; i++) expect(consumed.has(i)).toBe(false)
    expect(consumed.size).toBe(hatchItems.length)
  })

  test('keeps an island drawn inside the boundary as a hole', () => {
    const outline = rect(0, 0, 100, 60)
    const island = rect(30, 20, 60, 40)
    const hatchItems = strokes([outline, island], patternLines('ANSI31', 1, 0))
    const sides = (loop: Point[]) =>
      loop.map(
        (p, i) =>
          ({
            shape: { kind: 'line', start: p, end: loop[(i + 1) % loop.length] },
            color: '#000000',
            lineWidth: 0.35
          }) as PdfImportShapeItem
      )
    const items = [...sides(outline), ...sides(island), ...hatchItems]

    const { hatches } = acapPdfRecognizeHatches(items, { faceBoundaries: true })

    const hatch = only(hatches)
    expectPredefined(hatch, 'ANSI31', 1, 0)
    expect(hatch.boundary).toHaveLength(2)
  })

  test('uses boundaries the caller passes in', () => {
    const outline = rect(0, 0, 70, 40)
    const items = strokes([outline], patternLines('ANSI32', 1, 0))

    const { hatches } = acapPdfRecognizeHatches(items, {
      boundaries: [outline]
    })

    const hatch = only(hatches)
    expectPredefined(hatch, 'ANSI32', 1, 0)
    expect(hatch.boundary).toEqual([
      {
        kind: 'polyline',
        vertices: outline.map(p => ({ ...p, bulge: 0 })),
        closed: true
      }
    ])
  })

  test('measures a custom dashed pattern no library entry explains', () => {
    const outline = rect(0, 0, 80, 50)
    const angle = 30 * DEG
    const custom: PdfHatchDefinitionLine[] = [
      {
        angle,
        base: { x: 0.4, y: 0.3 },
        // Spacing 2.5, staggered by 1.1 along the line.
        offset: {
          x: Math.cos(angle) * 1.1 - Math.sin(angle) * 2.5,
          y: Math.sin(angle) * 1.1 + Math.cos(angle) * 2.5
        },
        dashLengths: [4, -1, 1.5, -1]
      }
    ]
    const items = [outlineItem(outline), ...strokes([outline], custom)]

    expect(
      acapPdfRecognizeHatches(items, { patterns: [] }).hatches
    ).toHaveLength(0)
    const { hatches, consumed } = acapPdfRecognizeHatches(items, {
      patterns: [],
      customPatterns: true
    })

    const hatch = only(hatches)
    expect(hatch.pattern).toEqual({ type: 'custom', name: 'PDF_HATCH' })
    expect(hatch.definitionLines).toHaveLength(1)
    const line = hatch.definitionLines[0]
    expect(line.angle / DEG).toBeCloseTo(30, 1)
    expect(
      line.dashLengths.reduce((sum, d) => sum + Math.abs(d), 0)
    ).toBeCloseTo(7.5, 1)
    expect(consumed.size).toBe(items.length - 1)
  })

  describe('cathedral.pdf hatches (AutoCAD plot, imported at scale 1)', () => {
    // Drawing units -> PDF millimetres of this plot.
    const plotScale = 0.0059157
    const fixture = (name: string): PdfImportShapeItem[] =>
      JSON.parse(
        readFileSync(join(__dirname, 'fixtures', `${name}.json`), 'utf8')
      ) as PdfImportShapeItem[]
    const recognize = (name: string, extra = {}) =>
      acapPdfRecognizeHatches(fixture(name), {
        tolerance: 0.05,
        faceBoundaries: true,
        ...extra
      }).hatches

    test.each([
      ['cathedral-ansi36', 'ANSI36', 30],
      ['cathedral-ansi32-wall', 'ANSI32', 10],
      ['cathedral-ansi32-arch', 'ANSI32', 10]
    ])('%s is rebuilt as %s at scale %d', (name, pattern, scale) => {
      const hatch = only(recognize(name))
      expect(hatch.pattern.type).toBe('predefined')
      if (hatch.pattern.type !== 'predefined') return
      expect(hatch.pattern.name).toBe(pattern)
      expect(hatch.pattern.scale / (scale * plotScale)).toBeCloseTo(1, 2)
      expect(hatch.pattern.angle).toBeCloseTo(0, 6)
      expect(hatch.items.length).toBeGreaterThan(100)
    })

    test.each([
      'cathedral-ansi36',
      'cathedral-ansi32-wall',
      'cathedral-ansi32-arch'
    ])('%s becomes a custom pattern without the library', name => {
      const hatch = only(
        recognize(name, { patterns: [], customPatterns: true })
      )
      expect(hatch.pattern.type).toBe('custom')
    })

    test('keeps touching hatches of one pattern apart', () => {
      // A T-shaped ANSI36 hatch whose notches hold a U-shaped one and two
      // corner squares: their strokes stop on the shared edges.
      const hatches = recognize('cathedral-ansi36-touching')
      expect(hatches.length).toBe(4)
      const sizes = hatches
        .map(hatch => hatch.items.length)
        .sort((p, q) => q - p)
      expect(sizes[0]).toBeGreaterThan(180)
      expect(sizes[0]).toBeLessThan(230)
      expect(sizes[1]).toBeGreaterThan(70)
    })
  })
})
