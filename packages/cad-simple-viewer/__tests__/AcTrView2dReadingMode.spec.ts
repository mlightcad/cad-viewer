import {
  ACAP_READING_MODE_BACKGROUND,
  ACAP_READING_MODE_COLOR
} from '../src/view/AcApReadingMode'
import { AcTrView2d } from '../src/view/AcTrView2d'

type ReadingModeViewStub = {
  _readingModeEnabled: boolean
  _readingModeSavedBackground: number | null
  _isDirty?: boolean
  _renderer?: { currentBackgroundColor: number }
  applyViewClearColor: jest.Mock
  setCompareDisplay: jest.Mock
}

describe('AcTrView2d reading mode', () => {
  it('refreshes saved background when re-applied after document reload', () => {
    const applyViewClearColor = jest.fn()
    const view: ReadingModeViewStub = {
      _readingModeEnabled: true,
      _readingModeSavedBackground: 0x000000,
      _renderer: { currentBackgroundColor: 0xffffff },
      applyViewClearColor,
      setCompareDisplay: jest.fn()
    }

    const reapply = (
      AcTrView2d.prototype as unknown as {
        reapplyReadingModeIfEnabled: () => void
      }
    ).reapplyReadingModeIfEnabled
    reapply.call(view)

    expect(view._readingModeSavedBackground).toBe(0xffffff)
    expect(applyViewClearColor).toHaveBeenCalledWith(
      ACAP_READING_MODE_BACKGROUND
    )
    expect(view.setCompareDisplay).toHaveBeenCalledWith({
      enabled: true,
      baseColor: ACAP_READING_MODE_COLOR
    })
  })

  it('restores clear color without mutating style manager materials on disable', () => {
    const applyViewClearColor = jest.fn()
    const setCompareDisplay = jest.fn()
    const view: ReadingModeViewStub = {
      _readingModeEnabled: true,
      _readingModeSavedBackground: 0x000000,
      _isDirty: false,
      applyViewClearColor,
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
    expect(setCompareDisplay).toHaveBeenCalledWith({
      enabled: false,
      overrides: []
    })
    expect(applyViewClearColor).toHaveBeenCalledWith(0x000000)
    expect(view._isDirty).toBe(true)
  })
})
