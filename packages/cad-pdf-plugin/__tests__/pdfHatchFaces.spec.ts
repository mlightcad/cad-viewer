import {
  acapPdfFaceArrangement,
  acapPdfFaceBoundary,
  acapPdfFaceBoundaryIn,
  acapPdfShapePolyline
} from '../src/recognition/pdfHatchFaces'

type Point = { x: number; y: number }

const line = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y1 }
]

function area(points: Point[]): number {
  let sum = 0
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  })
  return sum / 2
}

describe('acapPdfFaceBoundary', () => {
  test('closes a face from lines that cross and run past the corners', () => {
    const edges = [
      line(-5, 0, 25, 0),
      line(-5, 10, 25, 10),
      line(0, -5, 0, 15),
      line(20, -5, 20, 15)
    ]
    const loops = acapPdfFaceBoundary(edges, [{ x: 10, y: 5 }], {
      tolerance: 0.01
    })
    expect(loops).toHaveLength(1)
    expect(Math.abs(area(loops![0]))).toBeCloseTo(200, 6)
  })

  test('merges the faces a line through the hatch splits, and ignores stubs', () => {
    const edges = [
      line(0, 0, 20, 0),
      line(20, 0, 20, 10),
      line(20, 10, 0, 10),
      line(0, 10, 0, 0),
      // Splits the rectangle in two; both halves hold strokes.
      line(10, 0, 10, 10),
      // A dangling tick inside.
      line(3, 3, 6, 6)
    ]
    const loops = acapPdfFaceBoundary(
      edges,
      [
        { x: 5, y: 5 },
        { x: 15, y: 5 }
      ],
      { tolerance: 0.01 }
    )
    expect(loops).toHaveLength(1)
    expect(Math.abs(area(loops![0]))).toBeCloseTo(200, 6)
  })

  test('returns an island without strokes as a hole', () => {
    const square = (x0: number, y0: number, x1: number, y1: number) => [
      line(x0, y0, x1, y0),
      line(x1, y0, x1, y1),
      line(x1, y1, x0, y1),
      line(x0, y1, x0, y0)
    ]
    const edges = [...square(0, 0, 30, 30), ...square(10, 10, 20, 20)]
    const loops = acapPdfFaceBoundary(
      edges,
      [
        { x: 5, y: 5 },
        { x: 25, y: 25 },
        { x: 5, y: 25 }
      ],
      { tolerance: 0.01 }
    )
    expect(loops).toHaveLength(2)
    const areas = loops!.map(area).sort((p, q) => p - q)
    expect(areas[0]).toBeCloseTo(-100, 6)
    expect(areas[1]).toBeCloseTo(900, 6)
  })

  test('refuses when the strokes are not enclosed', () => {
    const edges = [line(0, 0, 10, 0), line(10, 0, 10, 10)]
    expect(
      acapPdfFaceBoundary(edges, [{ x: 5, y: 5 }], { tolerance: 0.01 })
    ).toBeUndefined()
  })
})

describe('acapPdfShapePolyline', () => {
  test('samples an arc within the chord tolerance', () => {
    const points = acapPdfShapePolyline(
      {
        kind: 'arc',
        center: { x: 0, y: 0 },
        radius: 10,
        startAngle: 0,
        endAngle: Math.PI / 2
      },
      0.01
    )
    expect(points[0].x).toBeCloseTo(10, 9)
    expect(points[points.length - 1].y).toBeCloseTo(10, 9)
    for (let i = 0; i + 1 < points.length; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2
      const my = (points[i].y + points[i + 1].y) / 2
      expect(10 - Math.hypot(mx, my)).toBeLessThanOrEqual(0.01 + 1e-9)
    }
  })

  test('reuses one arrangement for several hit sets', () => {
    // Two rooms side by side sharing a wall.
    const edges = [
      line(-1, 0, 41, 0),
      line(-1, 10, 41, 10),
      line(0, -1, 0, 11),
      line(20, -1, 20, 11),
      line(40, -1, 40, 11)
    ]
    const arrangement = acapPdfFaceArrangement(edges, { tolerance: 0.01 })
    expect(arrangement).toBeDefined()
    const left = acapPdfFaceBoundaryIn(arrangement!, [{ x: 5, y: 5 }])
    const right = acapPdfFaceBoundaryIn(arrangement!, [{ x: 35, y: 5 }])
    const both = acapPdfFaceBoundaryIn(arrangement!, [
      { x: 5, y: 5 },
      { x: 35, y: 5 }
    ])
    expect(Math.abs(area(left![0]))).toBeCloseTo(200, 6)
    expect(Math.min(...right![0].map(p => p.x))).toBeCloseTo(20, 6)
    expect(Math.abs(area(both![0]))).toBeCloseTo(400, 6)
    expect(acapPdfFaceBoundaryIn(arrangement!, [{ x: 50, y: 5 }])).toBe(
      undefined
    )
  })

  test('splits dense short edges next to long ones', () => {
    // A fine grid of short edges in one corner of a long frame: cells sized
    // by the frame alone would put all of them in one cell.
    const edges = [
      line(0, 0, 1000, 0),
      line(1000, 0, 1000, 1000),
      line(1000, 1000, 0, 1000),
      line(0, 1000, 0, 0)
    ]
    for (let i = 0; i <= 40; i++) {
      edges.push(line(i * 0.5, 0, i * 0.5, 20))
      edges.push(line(0, i * 0.5, 20, i * 0.5))
    }
    const loops = acapPdfFaceBoundary(edges, [{ x: 0.25, y: 0.25 }], {
      tolerance: 0.01
    })
    expect(loops).toHaveLength(1)
    expect(Math.abs(area(loops![0]))).toBeCloseTo(0.25, 6)
  })
})
