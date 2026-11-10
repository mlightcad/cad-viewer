import { tessellateHatchPattern } from '../src/hatch/AcPdfHatchTessellator'

const square = [
  [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ]
]

describe('tessellateHatchPattern', () => {
  it('emits clipped ANSI31-style 45-degree dashes inside a square', () => {
    const segments = tessellateHatchPattern(
      square,
      [
        {
          angle: Math.PI / 4,
          base: { x: 0, y: 0 },
          offset: { x: 0, y: 3.175 },
          dashLengths: []
        }
      ],
      0
    )
    expect(segments.length).toBeGreaterThan(2)
    for (const segment of segments) {
      expect(segment).toHaveLength(2)
      for (const p of segment) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-6)
        expect(p.x).toBeLessThanOrEqual(10 + 1e-6)
        expect(p.y).toBeGreaterThanOrEqual(-1e-6)
        expect(p.y).toBeLessThanOrEqual(10 + 1e-6)
      }
    }
  })
})

describe('tessellateHatchPattern dash phase', () => {
  // Boundary deliberately does not start on a dash boundary so dashes must be
  // anchored to the pattern base, not to where the line enters the boundary.
  const box = [
    [
      { x: 0.5, y: -0.5 },
      { x: 10.5, y: -0.5 },
      { x: 10.5, y: 2.5 },
      { x: 0.5, y: 2.5 }
    ]
  ]

  const dashesOnRow = (segments: { x: number; y: number }[][], y: number) =>
    segments
      .filter(s => Math.abs(s[0].y - y) < 1e-6)
      .map(s => [s[0].x, s[1].x])
      .sort((p, q) => p[0] - q[0])

  it('anchors dashes to the base point and shifts each row by offset.x', () => {
    const segments = tessellateHatchPattern(
      box,
      [
        {
          angle: 0,
          base: { x: 0, y: 0 },
          offset: { x: 0.5, y: 2 },
          dashLengths: [1, -1]
        }
      ],
      0
    )
    const row0 = dashesOnRow(segments, 0)
    expect(row0[0][0]).toBeCloseTo(0.5)
    expect(row0[0][1]).toBeCloseTo(1)
    expect(row0[1][0]).toBeCloseTo(2)
    expect(row0[1][1]).toBeCloseTo(3)

    const row1 = dashesOnRow(segments, 2)
    expect(row1[0][0]).toBeCloseTo(0.5)
    expect(row1[0][1]).toBeCloseTo(1.5)
    expect(row1[1][0]).toBeCloseTo(2.5)
    expect(row1[1][1]).toBeCloseTo(3.5)
  })

  it('treats zero-length dashes as dots that do not stretch the period', () => {
    const segments = tessellateHatchPattern(
      box,
      [
        {
          angle: 0,
          base: { x: 0, y: 0 },
          offset: { x: 0, y: 2 },
          dashLengths: [0, -1]
        }
      ],
      0
    )
    const starts = dashesOnRow(segments, 0).map(s => s[0])
    expect(starts).toHaveLength(10)
    starts.forEach((x, i) => expect(x).toBeCloseTo(i + 1))
  })
})
