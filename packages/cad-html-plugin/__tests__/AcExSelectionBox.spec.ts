import {
  acExExtentsMatchBox,
  acExSelectionModeFromDrag
} from '../src/AcExSelectionBox'

describe('acExSelectionModeFromDrag', () => {
  it('uses window for left-to-right and crossing for right-to-left', () => {
    expect(acExSelectionModeFromDrag(10, 40)).toBe('window')
    expect(acExSelectionModeFromDrag(40, 10)).toBe('crossing')
    expect(acExSelectionModeFromDrag(10, 10)).toBe('window')
  })
})

describe('acExExtentsMatchBox', () => {
  const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 }

  it('requires full containment for window selection', () => {
    expect(
      acExExtentsMatchBox({ minX: 1, minY: 1, maxX: 9, maxY: 9 }, box, 'window')
    ).toBe(true)
    expect(
      acExExtentsMatchBox(
        { minX: -1, minY: 1, maxX: 9, maxY: 9 },
        box,
        'window'
      )
    ).toBe(false)
  })

  it('requires intersection for crossing selection', () => {
    expect(
      acExExtentsMatchBox(
        { minX: 8, minY: 8, maxX: 12, maxY: 12 },
        box,
        'crossing'
      )
    ).toBe(true)
    expect(
      acExExtentsMatchBox(
        { minX: 20, minY: 20, maxX: 30, maxY: 30 },
        box,
        'crossing'
      )
    ).toBe(false)
  })
})
