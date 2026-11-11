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
 * lacks.
 *
 * Like the renderer (`@mlightcad/mtext-renderer` 0.13.9), each glyph is
 * sized with the scale factor of the font that supplies it
 * (`height × scale`): a big font such as `gbcbig.shx` has its own scale, so
 * a CJK cell of `txt.shx` + `gbcbig.shx` is one text height wide, not the
 * 4/3 of `txt.shx`. Default fonts use the style font's size. A space
 * advances by the style font's space glyph at the plain text height.
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
  const sizeFor = (name: string) =>
    height * (source.getFontScaleFactor(name) || 1)
  const size = sizeFor(font)
  const bigSize = bigFont ? sizeFor(bigFont) : size
  let blank: number | undefined
  let width = 0
  for (const char of text) {
    if (char === ' ') {
      if (blank === undefined) {
        const space = source.getCharShape(' ', font, height)
        // Same fallback as the renderer when the font has no space glyph.
        blank =
          space && space.width > 0
            ? space.width
            : source.getFontType(font) === 'shx'
              ? height * 0.5
              : height * 0.3
      }
      width += blank
      continue
    }
    const shape =
      source.getCharShape(char, font, size) ??
      (bigFont ? source.getCharShape(char, bigFont, bigSize) : undefined) ??
      source.getCharShapeFromDefaults(char, size)
    if (!shape || !(shape.width > 0)) return undefined
    width += shape.width
  }
  return width
}
