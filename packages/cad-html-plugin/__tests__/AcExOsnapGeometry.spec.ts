import { collectPrimitiveSnapCandidates } from '../src/AcExOsnapGeometry'

describe('collectPrimitiveSnapCandidates', () => {
  const modes = new Set([
    'endpoint',
    'midpoint',
    'center',
    'quadrant',
    'nearest'
  ] as const)

  it('snaps to circle center and quadrants', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'circle',
        layer: '0',
        cx: 5,
        cy: 5,
        r: 2,
        normalSign: 1
      },
      5.1,
      5.1,
      modes
    )
    expect(
      candidates.some(c => c.mode === 'center' && c.x === 5 && c.y === 5)
    ).toBe(true)
    expect(
      candidates.some(c => c.mode === 'quadrant' && c.x === 7 && c.y === 5)
    ).toBe(true)
  })

  it('snaps to arc endpoints and center', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'arc',
        layer: '0',
        cx: 0,
        cy: 0,
        r: 10,
        startAngle: 0,
        endAngle: Math.PI / 2,
        normalSign: 1
      },
      0.2,
      0.2,
      modes
    )
    expect(
      candidates.some(c => c.mode === 'endpoint' && c.x === 10 && c.y === 0)
    ).toBe(true)
    expect(candidates.some(c => c.mode === 'center')).toBe(true)
  })

  it('finds nearest point on a line segment', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'line',
        layer: '0',
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 0
      },
      4,
      1,
      new Set(['nearest'])
    )
    const near = candidates.find(c => c.mode === 'nearest')
    expect(near).toEqual({ x: 4, y: 0, mode: 'nearest' })
  })
})
