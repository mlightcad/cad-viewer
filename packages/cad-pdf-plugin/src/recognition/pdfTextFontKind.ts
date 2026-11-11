import type { PdfTextLineCandidate } from './pdfGlyphClustering'

/**
 * Font engine an exploded text line was drawn with:
 * - `shx`: SHX line text, glyphs are open centre-line strokes.
 * - `mesh`: TrueType / outline text, glyphs are closed contours.
 */
export type PdfTextFontKind = 'shx' | 'mesh'

/** Share of closed strokes from which a line counts as outline text. */
const MESH_CLOSED_RATIO = 0.6

/** Gap between a stroke's ends still treated as closed, × line height. */
const CLOSED_TOLERANCE = 0.02

/**
 * Tells SHX line text from outline (mesh) text by its strokes.
 *
 * Outline glyphs are made of closed contours only, while SHX glyphs are
 * mostly open strokes (only a few shapes such as `O` or `0` may close), so
 * a line whose strokes are mostly closed is outline text.
 */
export function classifyPdfTextLineFont(
  line: Pick<PdfTextLineCandidate, 'strokes' | 'height'>
): PdfTextFontKind {
  const tolerance = line.height * CLOSED_TOLERANCE
  let closed = 0
  let counted = 0
  for (const { points } of line.strokes) {
    if (points.length < 2) continue
    counted++
    const first = points[0]
    const last = points[points.length - 1]
    if (
      points.length > 2 &&
      Math.hypot(first.x - last.x, first.y - last.y) <= tolerance
    ) {
      closed++
    }
  }
  return counted > 0 && closed / counted >= MESH_CLOSED_RATIO ? 'mesh' : 'shx'
}
