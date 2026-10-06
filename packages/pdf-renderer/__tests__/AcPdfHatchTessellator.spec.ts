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
