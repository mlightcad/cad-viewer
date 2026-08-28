import {
  ACAP_READING_MODE_BACKGROUND,
  ACAP_READING_MODE_COLOR
} from '../src/view/AcApReadingMode'
import { AcTrView2d } from '../src/view/AcTrView2d'

type ReadingModeViewStub = {
  _readingModeEnabled: boolean
  _readingModeSavedBackground: number | null
  _isDirty?: boolean
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

  it('restores saved background before clearing compare display on disable', () => {
    let backgroundColor = ACAP_READING_MODE_BACKGROUND
    const setCompareDisplay = jest.fn()
    const view: ReadingModeViewStub = {
      _readingModeEnabled: true,
      _readingModeSavedBackground: 0x000000,
      _isDirty: false,
      get backgroundColor() {
        return backgroundColor
      },
      set backgroundColor(value: number) {
        backgroundColor = value
      },
      setCompareDisplay
    }

    const setReadingMode = (
      AcTrView2d.prototype as unknown as {
        setReadingMode: (enabled: boolean) => void
      }
    ).setReadingMode
    setReadingMode.call(view, false)

    expect(view._readingModeEnabled).toBe(false)
    expect(view._readingModeSavedBackground).toBeNull()
    expect(backgroundColor).toBe(0x000000)
    expect(setCompareDisplay).toHaveBeenCalledTimes(1)
    expect(setCompareDisplay).toHaveBeenCalledWith({
      enabled: false,
      overrides: []
    })
    expect(view._isDirty).toBe(true)
  })
})
