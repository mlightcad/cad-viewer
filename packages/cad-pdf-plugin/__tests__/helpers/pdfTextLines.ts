import type { PdfTextLineCandidate } from '../../src/recognition/pdfGlyphClustering'

/**
 * A text line of `count` glyphs (0.6 × 1 boxes, 0.2 apart) starting at
 * (x, y), as the clustering would report it. `rotation` lets a test give a
 * single glyph the wrong direction the clustering often guesses for it.
 */
export function textLine(
  id: string,
  x: number,
  y: number,
  count = 1,
  rotation = 0
): PdfTextLineCandidate<string> {
  const glyphs = Array.from({ length: count }, (_, i) => {
    const left = x + i * 0.8
    const stroke = {
      id: `${id}${i}`,
      points: [
        { x: left, y },
        { x: left, y: y + 1 },
        { x: left + 0.6, y: y + 1 },
        { x: left + 0.6, y }
      ]
    }
    return {
      strokes: [stroke],
      minU: left,
      maxU: left + 0.6,
      minV: y,
      maxV: y + 1
    }
  })
  return {
    strokes: glyphs.flatMap(glyph => glyph.strokes),
    glyphs,
    rotation,
    position: { x, y },
    height: 1,
    width: count * 0.8 - 0.2
  }
}
