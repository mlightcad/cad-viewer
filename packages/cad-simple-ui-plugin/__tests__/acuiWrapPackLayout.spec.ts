import { acuiComputeWrapPackSlot } from '../src/ui/acuiWrapPackLayout'

describe('acuiComputeWrapPackSlot', () => {
  it('fills a full row evenly so no empty space remains on the right', () => {
    // preferredMax = 40 → floor(300/40) = 7 slots → each 300/7
    const result = acuiComputeWrapPackSlot(300, 44, 7)
    expect(result.preferredMaxWidth).toBe(40)
    expect(result.perRow).toBe(7)
    expect(result.slotWidth).toBeCloseTo(300 / 7)
  })

  it('reuses the full-row slot width for a short last row', () => {
    const { perRow, slotWidth } = acuiComputeWrapPackSlot(300, 44, 10)
    const buttonCount = 10
    const fullRowCount = Math.floor(buttonCount / perRow) * perRow
    const lastRowCount = buttonCount - fullRowCount
    expect(fullRowCount).toBe(7)
    expect(lastRowCount).toBe(3)
    expect(slotWidth).toBeCloseTo(300 / 7)
    // Last-row buttons keep the same width; leftover space stays on the right.
    expect(lastRowCount * slotWidth).toBeLessThan(300)
  })

  it('stretches a single incomplete row across the full strip', () => {
    // Only 3 buttons, but 7 would fit — divide 300 by 3, not by 7.
    const result = acuiComputeWrapPackSlot(300, 44, 3)
    expect(result.perRow).toBe(7)
    expect(result.slotWidth).toBeCloseTo(100)
    expect(3 * result.slotWidth).toBeCloseTo(300)
  })
})
