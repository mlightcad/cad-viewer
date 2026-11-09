import { FontManager } from '@mlightcad/mtext-renderer'

/**
 * The parts of the shared font manager that text layout reads. Lets
 * {@link acapMeasureTextWidth} run against a fake in tests.
 */
export interface AcApTextMeasureFontSource {
  findAndReplaceFont(fontName: string): string
  getFontScaleFactor(fontName: string): number
  getFontType(fontName: string): string | undefined
  getCharShape(
    char: string,
    fontName: string,
    size: number
  ): { width: number } | undefined
  getCharShapeFromDefaults(
    char: string,
    size: number
  ): { width: number } | undefined
}

/**
 * Measures the advance width of single-line text as the TEXT renderer lays
 * it out with width factor 1: the style font (or its replacement when not
 * loaded), then the style big font and the default fonts for characters it
 * lacks, at
 * `height × font scale factor`.
 *
 * Only the fonts already loaded in the shared font manager are used; load
 * them first (see `AcApFontUtil.measureTextWidth`).
 *
 * @param text - Plain text (no MTEXT codes).
 * @param fontName - Text style font.
 * @param height - Text height in drawing units.
 * @param options - Style big font (tried before the default fonts) and the
 * font manager (defaults to the shared instance).
 * @returns The width, or `undefined` when a glyph has no loaded shape.
 */
export function acapMeasureTextWidth(
  text: string,
  fontName: string,
  height: number,
  options: { bigFont?: string; source?: AcApTextMeasureFontSource } = {}
): number | undefined {
  const source = options.source ?? FontManager.instance
  const bigFont = options.bigFont?.trim()
  const font = source.findAndReplaceFont(fontName).toLowerCase()
  const size = height * (source.getFontScaleFactor(font) || 1)
  let width = 0
  for (const char of text) {
    const shape =
      source.getCharShape(char, font, size) ??
      (bigFont ? source.getCharShape(char, bigFont, size) : undefined) ??
      source.getCharShapeFromDefaults(char, size)
    if (shape && shape.width > 0) {
      width += shape.width
    } else if (char === ' ') {
      // Same fallback as the renderer when the font has no space glyph.
      width += source.getFontType(font) === 'shx' ? size * 0.5 : size * 0.3
    } else {
      return undefined
    }
  }
  return width
}
