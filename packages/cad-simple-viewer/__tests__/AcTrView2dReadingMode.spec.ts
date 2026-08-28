import {
  ACAP_READING_MODE_BACKGROUND,
  ACAP_READING_MODE_COLOR
} from '../src/view/AcApReadingMode'
import { AcTrView2d } from '../src/view/AcTrView2d'

type ReadingModeViewStub = {
  _readingModeEnabled: boolean
  _readingModeSavedBackground: number | null
  backgroundColor: number
  setCompareDisplay: jest.Mock
}

describe('AcTrView2d reading mode', () => {
  it('refreshes saved background when re-applied after document reload', () => {
    const view: ReadingModeViewStub = {
      _readingModeEnabled: true,
      _readingModeSavedBackground: 0x000000,
      backgroundColor: 0xffffff,
      setCompareDisplay: jest.fn()
    }

    const reapply = (
      AcTrView2d.prototype as unknown as {
        reapplyReadingModeIfEnabled: () => void
      }
    ).reapplyReadingModeIfEnabled
    reapply.call(view)

    expect(view._readingModeSavedBackground).toBe(0xffffff)
    expect(view.backgroundColor).toBe(ACAP_READING_MODE_BACKGROUND)
    expect(view.setCompareDisplay).toHaveBeenCalledWith({
      enabled: true,
      baseColor: ACAP_READING_MODE_COLOR
    })
  })
})
