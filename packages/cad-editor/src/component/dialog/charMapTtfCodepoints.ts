/**
 * Inclusive Unicode ranges used to build the TTF/mesh character-map grid.
 *
 * @remarks
 * Each tuple is `[startCodePoint, endCodePoint]` (both inclusive). The dialog
 * does not walk the font’s `cmap` in JS; instead it shows this fixed superset
 * of useful blocks (Latin-1 supplement, Latin Extended-A/B, Greek, Cyrillic,
 * General Punctuation, superscripts, currency, letterlike symbols, arrows,
 * mathematical operators, misc technical, box drawing, geometric shapes,
 * dingbats, CJK punctuation/symbols). Glyphs missing from the chosen face
 * typically render as tofu or blank per the browser’s font fallback rules.
 */
export const MTEXT_CHARACTER_MAP_TTF_RANGES: readonly [number, number][] = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x0100, 0x017f],
  [0x0180, 0x024f],
  [0x0370, 0x03ff],
  [0x0400, 0x04ff],
  [0x2000, 0x206f],
  [0x2070, 0x209f],
  [0x20a0, 0x20cf],
  [0x2100, 0x214f],
  [0x2190, 0x21ff],
  [0x2200, 0x22ff],
  [0x2300, 0x23ff],
  [0x2500, 0x257f],
  [0x25a0, 0x25ff],
  [0x2600, 0x26ff],
  [0x3000, 0x303f]
]

/**
 * Flattens {@link MTEXT_CHARACTER_MAP_TTF_RANGES} into one ascending code-point array.
 *
 * @remarks
 * Surrogate code units U+D800–U+DFFF are skipped so every value is safe for
 * {@link String.fromCodePoint}. The result is computed once at module load in
 * the character map dialog for stable keys and iteration order.
 *
 * @returns All code points from the configured ranges, in ascending order.
 */
export function expandTtfCharacterMapCodepoints(): number[] {
  const out: number[] = []
  for (const [from, to] of MTEXT_CHARACTER_MAP_TTF_RANGES) {
    for (let cp = from; cp <= to; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue
      out.push(cp)
    }
  }
  return out
}
