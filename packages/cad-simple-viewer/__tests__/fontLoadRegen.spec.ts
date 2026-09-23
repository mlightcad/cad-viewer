import {
  POST_OPEN_FONT_REGEN_QUIET_MS,
  shouldRegenDatabaseAfterFontLoad
} from '../src/view/fontLoadRegen'

describe('shouldRegenDatabaseAfterFontLoad', () => {
  it('skips regen while entities or glyph jobs are still running', () => {
    expect(shouldRegenDatabaseAfterFontLoad(true, 0, 5_000)).toBe(false)
  })

  it('skips regen when live glyph shells can be redrawn in place', () => {
    expect(shouldRegenDatabaseAfterFontLoad(false, 2, 5_000)).toBe(false)
  })

  it('skips regen in the quiet window after open-time text jobs go idle', () => {
    expect(
      shouldRegenDatabaseAfterFontLoad(
        false,
        0,
        POST_OPEN_FONT_REGEN_QUIET_MS - 1
      )
    ).toBe(false)
  })

  it('regens when a non-default font arrives after the open has settled', () => {
    expect(
      shouldRegenDatabaseAfterFontLoad(false, 0, POST_OPEN_FONT_REGEN_QUIET_MS)
    ).toBe(true)
    expect(shouldRegenDatabaseAfterFontLoad(false, 0, null)).toBe(true)
  })
})
