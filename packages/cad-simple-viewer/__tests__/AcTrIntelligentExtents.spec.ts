import { computeIntelligentExtents } from '../src/view/AcTrIntelligentExtents'

describe('computeIntelligentExtents', () => {
  it('drops outlier-scale AABBs so they cannot dominate the fit', () => {
    const site = Array.from({ length: 10 }, (_, i) => ({
      minX: 490000 + i * 100,
      minY: 3420000,
      maxX: 490050 + i * 100,
      maxY: 3420100
    }))
    const poison = {
      minX: 495000,
      minY: 3422000,
      maxX: 1.5e75,
      maxY: 5e63
    }
    const smart = computeIntelligentExtents([...site, poison])
    expect(smart).toBeDefined()
    if (!smart) return
    expect(smart.max.x).toBeLessThan(1e10)
    expect(smart.min.x).toBeGreaterThan(489000)
  })

  it('peels far-center outliers when only a few boxes remain', () => {
    const smart = computeIntelligentExtents([
      { minX: 490000, minY: 3420000, maxX: 491000, maxY: 3421000 },
      { minX: 492000, minY: 3420000, maxX: 493000, maxY: 3421000 },
      { minX: 1e75, minY: 1e63, maxX: 1e75 + 1, maxY: 1e63 + 1 }
    ])
    expect(smart).toBeDefined()
    if (!smart) return
    expect(smart.max.x).toBeLessThan(1e10)
  })

  it('returns undefined for an empty input', () => {
    expect(computeIntelligentExtents([])).toBeUndefined()
  })
})
