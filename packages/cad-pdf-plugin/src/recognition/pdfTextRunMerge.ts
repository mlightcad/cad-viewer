/**
 * Joins consecutive PDF text runs that continue the same line.
 *
 * PDF producers often emit one line as several `showText` runs (kerning,
 * font switches, per-word positioning). Importing each run as its own
 * `AcDbText` leaves a line broken into fragments that are hard to edit.
 */

import type { PdfImportedText } from '../pdfVectorImport'

/** Tuning for {@link mergePdfTextRuns}. */
export interface PdfTextRunMergeOptions {
  /** Largest gap between runs, as a fraction of text height. Default 0.6. */
  maxGap?: number
  /** Gap that becomes a space, as a fraction of text height. Default 0.2. */
  spaceGap?: number
}

/**
 * Merges each run into the previous one when both sit on the same baseline
 * with the same style and the gap between them is small. Only consecutive
 * runs are joined, so content-stream order (normally reading order) decides.
 *
 * Runs without a known advance width are never merged into.
 *
 * @param runs - Text runs in content-stream order.
 * @param options - Gap thresholds.
 * @returns New runs; inputs are not modified.
 */
export function mergePdfTextRuns(
  runs: readonly PdfImportedText[],
  options: PdfTextRunMergeOptions = {}
): PdfImportedText[] {
  const maxGap = options.maxGap ?? 0.6
  const spaceGap = options.spaceGap ?? 0.2
  const out: PdfImportedText[] = []
  for (const run of runs) {
    const prev = out[out.length - 1]
    if (prev && prev.width !== undefined && canJoin(prev, run)) {
      const dirX = Math.cos(prev.rotation)
      const dirY = Math.sin(prev.rotation)
      const dx = run.position.x - prev.position.x
      const dy = run.position.y - prev.position.y
      const along = dx * dirX + dy * dirY
      const across = Math.abs(-dx * dirY + dy * dirX)
      const gap = along - prev.width
      const h = prev.height
      if (across <= h * 0.1 && gap >= -h * 0.2 && gap <= h * maxGap) {
        const needsSpace =
          gap > h * spaceGap && !/\s$/.test(prev.text) && !/^\s/.test(run.text)
        out[out.length - 1] = {
          ...prev,
          text: prev.text + (needsSpace ? ' ' : '') + run.text,
          width:
            run.width !== undefined
              ? Math.max(prev.width, along + run.width)
              : undefined
        }
        continue
      }
    }
    out.push({ ...run })
  }
  return out
}

function canJoin(a: PdfImportedText, b: PdfImportedText) {
  const rotationDiff = Math.abs(
    Math.atan2(
      Math.sin(a.rotation - b.rotation),
      Math.cos(a.rotation - b.rotation)
    )
  )
  return (
    a.layerName === b.layerName &&
    a.color === b.color &&
    Math.abs(a.height - b.height) <= Math.max(a.height, b.height) * 0.01 &&
    Math.abs(a.widthFactor - b.widthFactor) <= 0.01 &&
    rotationDiff <= (0.5 * Math.PI) / 180
  )
}
