import {
  acExComputeLeaderTipOnShape
} from '../src/AcExMarkupGeometry'

describe('acExComputeLeaderTipOnShape', () => {
  it('places tip on circle perimeter toward the cursor', () => {
    const tip = acExComputeLeaderTipOnShape(
      { kind: 'circle', center: { x: 0, y: 0 }, radius: 10 },
      { x: 100, y: 0 }
    )
    expect(tip.x).toBeCloseTo(10)
    expect(tip.y).toBeCloseTo(0)
  })

  it('places tip on AABB edge for rect/cloud', () => {
    const tip = acExComputeLeaderTipOnShape(
      {
        kind: 'rect',
        corner1: { x: -5, y: -2 },
        corner2: { x: 5, y: 2 }
      },
      { x: 50, y: 0 }
    )
    expect(tip.x).toBeCloseTo(5)
    expect(tip.y).toBeCloseTo(0)
  })
})
