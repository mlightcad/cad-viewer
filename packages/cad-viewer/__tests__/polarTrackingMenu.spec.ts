import {
  formatPolarIncrementMenuLabel,
  isSamePolarIncrement
} from '../src/component/statusBar/polarTrackingMenu'

describe('polarTrackingMenu', () => {
  it('formats increment preview labels like AutoCAD', () => {
    expect(formatPolarIncrementMenuLabel(90)).toBe('90, 180, 270, 360...')
    expect(formatPolarIncrementMenuLabel(45)).toBe('45, 90, 135, 180...')
    expect(formatPolarIncrementMenuLabel(22.5)).toBe('23, 45, 68, 90...')
  })

  it('compares polar increments with tolerance', () => {
    expect(isSamePolarIncrement(22.5, 22.5)).toBe(true)
    expect(isSamePolarIncrement(45, 22.5)).toBe(false)
  })
})
