/**
 * "Teach once, recognize everywhere" dictionary for exploded text.
 *
 * Within one drawing, an SHX or outlined font draws the same character with
 * the same strokes every time. Once the user types the text of one line,
 * each glyph's normalized geometry is stored with its character; later lines
 * whose glyphs are all known are recognized without asking.
 */

import type { PdfTextGlyph, PdfTextLineCandidate } from './pdfGlyphClustering'

/** Grid used to quantize normalized glyph coordinates (1/GRID of height). */
const GRID = 16

/** Gap between glyphs (fraction of height) that reads as a space. */
const SPACE_GAP = 0.5

/**
 * Computes a translation-, scale- and rotation-invariant signature of one
 * glyph: its stroke segments in line-local coordinates, relative to the
 * glyph's left edge and the line baseline, divided by the text height and
 * quantized.
 */
export function pdfGlyphSignature(
  glyph: PdfTextGlyph,
  line: Pick<PdfTextLineCandidate, 'rotation' | 'position' | 'height'>
): string {
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const baseV = -line.position.x * s + line.position.y * c
  const q = (value: number) => Math.round(value * GRID)
  const keys = new Set<string>()
  for (const stroke of glyph.strokes) {
    const pts = stroke.points.map(p => {
      const u = p.x * c + p.y * s
      const v = -p.x * s + p.y * c
      return `${q((u - glyph.minU) / line.height)},${q((v - baseV) / line.height)}`
    })
    if (pts.length === 1) keys.add(pts[0])
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i] === pts[i + 1]) continue
      // Direction-free segment key: strokes may be drawn either way.
      keys.add(
        pts[i] < pts[i + 1]
          ? `${pts[i]}|${pts[i + 1]}`
          : `${pts[i + 1]}|${pts[i]}`
      )
    }
  }
  return [...keys].sort().join(';')
}

/** Learns glyph signatures from confirmed lines and recognizes new lines. */
export class PdfGlyphDictionary {
  private readonly glyphs = new Map<string, string>()

  /** Number of distinct glyph shapes learned. */
  get size(): number {
    return this.glyphs.size
  }

  /**
   * Records the characters of a confirmed line.
   *
   * Learning only happens when the typed text (spaces removed) has exactly
   * one character per glyph box; otherwise the pairing is ambiguous.
   *
   * @returns Number of glyph shapes added or confirmed.
   */
  learn(line: PdfTextLineCandidate, text: string): number {
    const chars = [...text.replace(/\s+/g, '')]
    if (chars.length === 0 || chars.length !== line.glyphs.length) return 0
    line.glyphs.forEach((glyph, i) => {
      this.glyphs.set(pdfGlyphSignature(glyph, line), chars[i])
    })
    return chars.length
  }

  /**
   * Returns the line text when every glyph is known, inserting a space where
   * two glyphs are further apart than half the text height.
   */
  lookup(line: PdfTextLineCandidate): string | undefined {
    let text = ''
    for (let i = 0; i < line.glyphs.length; i++) {
      const glyph = line.glyphs[i]
      const char = this.glyphs.get(pdfGlyphSignature(glyph, line))
      if (char === undefined) return undefined
      if (
        i > 0 &&
        glyph.minU - line.glyphs[i - 1].maxU > SPACE_GAP * line.height
      ) {
        text += ' '
      }
      text += char
    }
    return text.length > 0 ? text : undefined
  }
}
