/**
 * Converts measured glyph ink / PDF em size into AutoCAD TrueType text height.
 *
 * Mesh fonts size CAD height to capital-A (`getFontScaleFactor`). CJK
 * ideographs fill most of the em, so an ink-box or PDF em used as height
 * draws about that factor too tall.
 */

/** CJK Unified Ideographs and compatibility ideographs. */
const CJK_CHAR = /[\u3400-\u9fff\uf900-\ufaff]/

/**
 * PDF `fontSize` is the em square. CAD TrueType height is capital-A, so
 * divide by the face's scale factor.
 */
export function acapPdfEmHeightToTextHeight(
  emHeight: number,
  fontScaleFactor: number
): number {
  if (!(emHeight > 0)) return emHeight
  const scale = fontScaleFactor > 0 ? fontScaleFactor : 1
  return emHeight / scale
}

/**
 * Outline-font ink height → CAD text height. Latin ink ≈ capital-A (keep);
 * CJK ink ≈ em (divide by the face scale).
 */
export function acapPdfMeshInkHeightToTextHeight(
  inkHeight: number,
  text: string,
  fontScaleFactor: number
): number {
  if (!(inkHeight > 0)) return inkHeight
  if (!(fontScaleFactor > 1) || !CJK_CHAR.test(text)) return inkHeight
  return inkHeight / fontScaleFactor
}
