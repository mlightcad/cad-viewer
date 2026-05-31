import {
  sumMeasureQuantities,
  type AcExMeasureQuantityEntry
} from '../src/AcExMeasureTotals'

describe('sumMeasureQuantities', () => {
  it('sums length and area entries separately', () => {
    const entries: AcExMeasureQuantityEntry[] = [
      { quantity: 'length', value: 10 },
      { quantity: 'length', value: 2.5 },
      { quantity: 'area', value: 100 },
      { quantity: 'area', value: 50 }
    ]
    expect(sumMeasureQuantities(entries)).toEqual({ length: 12.5, area: 150 })
  })

  it('returns zero totals for an empty list', () => {
    expect(sumMeasureQuantities([])).toEqual({ length: 0, area: 0 })
  })
})
