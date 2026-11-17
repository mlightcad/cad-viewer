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
    expect(options.recognizeHatches).toBe(true)
    expect(options.recognizeDimensions).toBe(true)
    expect(options.recognizeExplodedText).toBe('local')
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
    expect(options.recognizeHatches).toBe(false)
    expect(options.recognizeDimensions).toBe(false)
    expect(options.recognizeExplodedText).toBe(false)
    expect(options.fitTextWidth).toBe(true)
  })

  test('explicit fields override the mode defaults', () => {
    const options = resolveAcApPdfImportOptions({
      mode: 'visual',
      recognizeCurves: true,
      lineWeights: false,
      recognizeExplodedText: { ocr: 'paddleocr' }
    })
    expect(options.recognizeCurves).toBe(true)
    expect(options.lineWeights).toBe(false)
    expect(options.formBlocks).toBe(false)
    expect(options.recognizeExplodedText).toEqual({ ocr: 'paddleocr' })
  })

  test('legacy recognizeExplodedText ocr becomes an empty provider id', () => {
    expect(
      resolveAcApPdfImportOptions({
        // @ts-expect-error legacy string still accepted at resolve time
        recognizeExplodedText: 'ocr'
      }).recognizeExplodedText
    ).toEqual({ ocr: '' })
  })

  test('fill hatches can still be turned off', () => {
    expect(
      resolveAcApPdfImportOptions({ fillHatches: false }).fillHatches
    ).toBe(false)
  })

  test('exploded text recognition can be turned off in recover mode', () => {
    expect(
      resolveAcApPdfImportOptions({ recognizeExplodedText: false })
        .recognizeExplodedText
    ).toBe(false)
  })
})
