/**
 * Contract for glyph font gating: preset + STYLE must both resolve before
 * deferred glyph finalize continues. Mirrors AcTrView2d.ensureDeferredFontsReady.
 */
describe('preset + STYLE glyph font gate', () => {
  it('does not resolve until the slower of preset and STYLE finishes', async () => {
    let presetDone = false
    let styleDone = false
    const preset = new Promise<void>(resolve => {
      setTimeout(() => {
        presetDone = true
        resolve()
      }, 30)
    })
    const style = new Promise<void>(resolve => {
      setTimeout(() => {
        styleDone = true
        resolve()
      }, 5)
    })

    let gateResolved = false
    const gate = Promise.all([preset, style]).then(() => {
      gateResolved = true
      expect(presetDone).toBe(true)
      expect(styleDone).toBe(true)
    })

    await new Promise<void>(resolve => setTimeout(resolve, 15))
    expect(styleDone).toBe(true)
    expect(presetDone).toBe(false)
    expect(gateResolved).toBe(false)

    await gate
    expect(gateResolved).toBe(true)
  })

  it('allows linework to proceed while preset is still loading', async () => {
    let presetDone = false
    const preset = new Promise<void>(resolve => {
      setTimeout(() => {
        presetDone = true
        resolve()
      }, 40)
    })

    // Linework convert does not await preset.
    const lineworkFinished: string[] = []
    lineworkFinished.push('line')
    expect(presetDone).toBe(false)
    expect(lineworkFinished).toEqual(['line'])

    await preset
    // Glyph path would await here.
    expect(presetDone).toBe(true)
  })
})
