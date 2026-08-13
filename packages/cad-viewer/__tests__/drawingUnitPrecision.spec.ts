import {
  drawingUnitPrecisionLabel,
  drawingUnitPrecisionOptions
} from '../src/util/drawingUnitPrecision'

describe('drawingUnitPrecision', () => {
  it('labels integer precision as 0, 0.1, 0.01, …', () => {
    expect(drawingUnitPrecisionLabel(0)).toBe('0')
    expect(drawingUnitPrecisionLabel(1)).toBe('0.1')
    expect(drawingUnitPrecisionLabel(2)).toBe('0.01')
    expect(drawingUnitPrecisionLabel(3)).toBe('0.001')
    expect(drawingUnitPrecisionLabel(4)).toBe('0.0001')
    expect(drawingUnitPrecisionLabel(6)).toBe('0.000001')
  })

  it('always includes the six canonical options', () => {
    expect(drawingUnitPrecisionOptions().map(opt => opt.value)).toEqual([
      0, 1, 2, 3, 4, 6
    ])
  })

  it('keeps a drawing value outside the canonical set so the UI can match it', () => {
    const options = drawingUnitPrecisionOptions(8)
    expect(options.map(opt => opt.value)).toEqual([0, 1, 2, 3, 4, 6, 8])
    expect(options[options.length - 1]?.label).toBe('0.00000001')
  })
})
