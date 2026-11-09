import { resolveAcApPdfImportOptions } from '../src/AcApPdfImportOptions'

describe('resolveAcApPdfImportOptions', () => {
  test('defaults to recover mode with every reconstruction step on', () => {
    const options = resolveAcApPdfImportOptions()
    expect(options.mode).toBe('recover')
    expect(options.recognizeCurves).toBe(true)
    expect(options.removeDuplicates).toBe(true)
    expect(options.mergeTextRuns).toBe(true)
    expect(options.formBlocks).toBe(true)
    expect(options.textStyles).toBe(true)
    // A filled PDF area must stay filled, not collapse to its outline.
    expect(options.fillHatches).toBe(true)
  })

  test('visual mode keeps PDF paths and text runs as painted', () => {
    const options = resolveAcApPdfImportOptions({ mode: 'visual' })
    expect(options.mode).toBe('visual')
    expect(options.recognizeCurves).toBe(false)
    expect(options.removeDuplicates).toBe(false)
    expect(options.mergeTextRuns).toBe(false)
    expect(options.formBlocks).toBe(false)
    expect(options.textStyles).toBe(false)
    // Stroke widths and dashes are how the page looks, so they stay.
    expect(options.lineWeights).toBe(true)
    expect(options.dashLinetypes).toBe(true)
    expect(options.fillHatches).toBe(true)
    expect(options.fitTextWidth).toBe(true)
  })

  test('explicit fields override the mode defaults', () => {
    const options = resolveAcApPdfImportOptions({
      mode: 'visual',
      recognizeCurves: true,
      lineWeights: false
    })
    expect(options.recognizeCurves).toBe(true)
    expect(options.lineWeights).toBe(false)
    expect(options.formBlocks).toBe(false)
  })

  test('fill hatches can still be turned off', () => {
    expect(
      resolveAcApPdfImportOptions({ fillHatches: false }).fillHatches
    ).toBe(false)
  })
})
