import { effectiveLayer } from '../src/util/AcTrEffectiveLayer'

describe('effectiveLayer', () => {
  it('inherits the INSERT layer for entities authored on layer 0', () => {
    expect(effectiveLayer('0', 'Wall')).toBe('Wall')
    expect(effectiveLayer('0', 'DIM')).toBe('DIM')
  })

  it('keeps non-zero authored layers unchanged', () => {
    expect(effectiveLayer('DIM', 'Wall')).toBe('DIM')
    expect(effectiveLayer('L3', 'Wall')).toBe('L3')
  })

  it('chains through nested INSERTs when the parent is also layer 0', () => {
    const nestedInsertLayer = effectiveLayer('0', 'Wall')
    expect(effectiveLayer('0', nestedInsertLayer)).toBe('Wall')
  })
})
