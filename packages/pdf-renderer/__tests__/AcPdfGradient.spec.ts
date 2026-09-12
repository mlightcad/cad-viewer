import { gradientFactor, shadingFromGradient } from '../src/hatch/AcPdfGradient'

describe('shadingFromGradient', () => {
  const loops = [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ]
  ]

  it('uses Type 2 axial shading for LINEAR and CURVED', () => {
    const linear = shadingFromGradient(
      { name: 'LINEAR', startColor: 0x0000ff, endColor: 0xffff00 },
      loops,
      0
    )
    expect(linear.shadingType).toBe(2)
    expect(linear.coords).toHaveLength(4)
    expect(linear.strips).toBeUndefined()
    expect(linear.c0).toEqual({ r: 0, g: 0, b: 1 })
    expect(linear.c1).toEqual({ r: 1, g: 1, b: 0 })
  })

  it('swaps colors for SPHERICAL so the center is the end color', () => {
    const radial = shadingFromGradient(
      { name: 'SPHERICAL', startColor: 0x0000ff, endColor: 0xffff00 },
      loops,
      0
    )
    expect(radial.shadingType).toBe(3)
    expect(radial.strips).toBeUndefined()
    // Center (r=0) uses c0 → yellow end color.
    expect(radial.c0).toEqual({ r: 1, g: 1, b: 0 })
    expect(radial.c1).toEqual({ r: 0, g: 0, b: 1 })
  })

  it('tessellates CYLINDER into solid strips with a center peak', () => {
    const cyl = shadingFromGradient(
      { name: 'CYLINDER', startColor: 0x0000ff, endColor: 0xffff00 },
      loops,
      0
    )
    expect(cyl.strips?.length).toBeGreaterThan(10)
    const mid = cyl.strips![Math.floor(cyl.strips!.length / 2)]
    expect(mid.rgb.r).toBeGreaterThan(0.8)
    expect(mid.rgb.b).toBeLessThan(0.2)
    const edge = cyl.strips![0]
    expect(edge.rgb.b).toBeGreaterThan(0.8)
  })

  it('inverts INVCURVED color order', () => {
    const inv = shadingFromGradient(
      { name: 'INVCURVED', startColor: 0x0000ff, endColor: 0xffff00 },
      loops,
      0
    )
    expect(inv.shadingType).toBe(2)
    expect(inv.c0).toEqual({ r: 1, g: 1, b: 0 })
    expect(inv.c1).toEqual({ r: 0, g: 0, b: 1 })
  })
})

describe('gradientFactor', () => {
  it('matches viewer linear / cylinder / spherical endpoints', () => {
    expect(gradientFactor('LINEAR', -1, 0)).toBeCloseTo(0)
    expect(gradientFactor('LINEAR', 1, 0)).toBeCloseTo(1)
    expect(gradientFactor('CYLINDER', 0, 0)).toBeCloseTo(1)
    expect(gradientFactor('CYLINDER', 1, 0)).toBeCloseTo(0)
    expect(gradientFactor('SPHERICAL', 0, 0)).toBeCloseTo(1)
    expect(gradientFactor('SPHERICAL', 1, 0)).toBeCloseTo(0)
    expect(gradientFactor('INVSPHERICAL', 0, 0)).toBeCloseTo(0)
    expect(gradientFactor('INVCURVED', -1, 0)).toBeCloseTo(1)
  })
})
