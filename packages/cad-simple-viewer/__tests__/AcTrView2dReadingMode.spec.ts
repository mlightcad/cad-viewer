import {
  ACAP_READING_MODE_BACKGROUND,
  ACAP_READING_MODE_COLOR,
  AcApReadingModeState
} from '../src/view/AcApReadingMode'

describe('AcApReadingModeState', () => {
  function createHost() {
    return {
      getCurrentBackgroundColor: jest.fn(() => 0xffffff),
      applyViewClearColor: jest.fn(),
      setCompareDisplay: jest.fn(),
      markDirty: jest.fn()
    }
  }

  it('refreshes saved background when re-applied after document reload', () => {
    const host = createHost()
    host.getCurrentBackgroundColor.mockReturnValue(0xffffff)
    const state = new AcApReadingModeState(host)
    state.setEnabled(true)
    host.getCurrentBackgroundColor.mockReturnValue(0x112233)
    host.applyViewClearColor.mockClear()
    host.setCompareDisplay.mockClear()

    state.reapplyIfEnabled()

    expect(host.applyViewClearColor).toHaveBeenCalledWith(
      ACAP_READING_MODE_BACKGROUND
    )
    expect(host.setCompareDisplay).toHaveBeenCalledWith({
      enabled: true,
      baseColor: ACAP_READING_MODE_COLOR
    })

    state.setEnabled(false)
    expect(host.applyViewClearColor).toHaveBeenCalledWith(0x112233)
  })

  it('restores clear color without mutating style manager materials on disable', () => {
    const host = createHost()
    host.getCurrentBackgroundColor.mockReturnValue(0x000000)
    const state = new AcApReadingModeState(host)
    state.setEnabled(true)
    host.applyViewClearColor.mockClear()
    host.setCompareDisplay.mockClear()
    host.markDirty.mockClear()

    state.setEnabled(false)

    expect(state.isEnabled).toBe(false)
    expect(host.setCompareDisplay).toHaveBeenCalledWith({
      enabled: false,
      overrides: []
    })
    expect(host.applyViewClearColor).toHaveBeenCalledWith(0x000000)
    expect(host.markDirty).toHaveBeenCalledTimes(1)
  })

  it('updates saved background via noteLayoutBackground while enabled', () => {
    const host = createHost()
    host.getCurrentBackgroundColor.mockReturnValue(0x000000)
    const state = new AcApReadingModeState(host)
    state.setEnabled(true)
    state.noteLayoutBackground(0xabcdef)
    host.applyViewClearColor.mockClear()

    state.setEnabled(false)

    expect(host.applyViewClearColor).toHaveBeenCalledWith(0xabcdef)
  })
})
