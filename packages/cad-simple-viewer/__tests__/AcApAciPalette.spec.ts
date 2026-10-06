import {
  ACI_GRAY_PALETTE_INDICES,
  ACI_LARGE_PALETTE_INDICES,
  ACI_SMALL_PALETTE_INDICES
} from '../src/util/AcApAciPalette'

describe('AcApAciPalette', () => {
  it('orders large palette like AutoCAD (ones 8→0 then 1→9, decades 10→240)', () => {
    const indices = ACI_LARGE_PALETTE_INDICES

    expect(indices).toHaveLength(240)
    expect(new Set(indices).size).toBe(240)
    expect(Math.min(...indices)).toBe(10)
    expect(Math.max(...indices)).toBe(249)

    // First row (ones=8), first few columns
    expect(indices.slice(0, 5)).toEqual([18, 28, 38, 48, 58])
    expect(indices[23]).toBe(248)

    // Middle even row (ones=0)
    expect(indices.slice(96, 101)).toEqual([10, 20, 30, 40, 50])
    expect(indices[119]).toBe(240)

    // First odd row (ones=1)
    expect(indices.slice(120, 125)).toEqual([11, 21, 31, 41, 51])

    // Last row (ones=9)
    expect(indices.slice(216, 221)).toEqual([19, 29, 39, 49, 59])
    expect(indices[239]).toBe(249)
  })

  it('exposes standard small and gray ramps', () => {
    expect(ACI_SMALL_PALETTE_INDICES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(ACI_GRAY_PALETTE_INDICES).toEqual([250, 251, 252, 253, 254, 255])
  })
})
