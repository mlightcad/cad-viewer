import {
  acapMeasureTextWidth,
  type AcApTextMeasureFontSource
} from '../src/util/AcApTextMeasure'

/** Fake font chain: `latin` has A-Z and space; defaults cover CJK. */
function fakeSource(): AcApTextMeasureFontSource {
  return {
    findAndReplaceFont: name => (name === 'missing' ? 'latin' : name),
    getFontScaleFactor: name => (name === 'latin' ? 2 : 1),
    getFontType: () => 'mesh',
    getCharShape: (char, font, size) =>
      font === 'latin' && /[A-Z ]/.test(char)
        ? { width: (char === ' ' ? 0.25 : 0.5) * size }
        : undefined,
    getCharShapeFromDefaults: (char, size) =>
      /[一-鿿]/.test(char) ? { width: size } : undefined
  }
}

describe('acapMeasureTextWidth', () => {
  test('sums glyph advances at height × font scale factor', () => {
    // size = 10 × 2 = 20; A,B = 10 each, space = 5
    expect(
      acapMeasureTextWidth('A B', 'latin', 10, { source: fakeSource() })
    ).toBe(25)
  })

  test('resolves a missing style font like the renderer', () => {
    expect(
      acapMeasureTextWidth('AB', 'missing', 10, { source: fakeSource() })
    ).toBe(20)
  })

  test('falls back to default fonts per character', () => {
    // 中 comes from the defaults at the primary font's size (20)
    expect(
      acapMeasureTextWidth('A中', 'latin', 10, { source: fakeSource() })
    ).toBe(30)
  })

  test('uses the renderer blank width when a font has no space glyph', () => {
    const source = fakeSource()
    source.getCharShape = (char, font, size) =>
      char === 'A' ? { width: 0.5 * size } : undefined
    // mesh fallback blank = 0.3 × size = 6
    expect(acapMeasureTextWidth('A A', 'latin', 10, { source })).toBe(26)
  })

  test('tries the style big font before the default fonts', () => {
    const source = fakeSource()
    const inner = source.getCharShape
    source.getCharShape = (char, font, size) =>
      font === 'big' && char === '中'
        ? { width: 0.5 * size }
        : inner(char, font, size)
    expect(
      acapMeasureTextWidth('中', 'latin', 10, { bigFont: 'big', source })
    ).toBe(10)
  })

  test('returns undefined when a glyph cannot be resolved', () => {
    expect(
      acapMeasureTextWidth('A?', 'latin', 10, { source: fakeSource() })
    ).toBe(undefined)
  })
})
