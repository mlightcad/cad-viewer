import type { PdfCurveRecognitionOptions } from './recognition/pdfCurveRecognition'

/**
 * Options for {@link AcApPdfImportConvertor.convert}.
 *
 * Every field is optional; omitted fields fall back to the defaults below.
 */
export interface AcApPdfImportOptions {
  /** 1-based page number. Default `1`. */
  pageNumber?: number
  /**
   * Model-space point the PDF page origin (lower-left corner) maps to.
   * Default `(0, 0)`.
   */
  insertionPoint?: { x: number; y: number }
  /**
   * Uniform scale applied after the 1 pt = 25.4/72 mm conversion.
   * Default `1`.
   */
  scale?: number
  /**
   * Recover circles, arcs, ellipses, bulged polylines and splines from PDF
   * Bezier paths. When `false`, curves are flattened into polylines as in
   * earlier releases. Default `true`.
   */
  recognizeCurves?: boolean
  /** Tuning for curve recognition. */
  curveRecognition?: PdfCurveRecognitionOptions
  /** Map PDF stroke widths to entity line weights. Default `true`. */
  lineWeights?: boolean
  /**
   * Drop exact duplicate shapes (same geometry, layer and colour). PDF
   * producers often paint the same outline twice. Default `true`.
   */
  removeDuplicates?: boolean
  /**
   * Join consecutive text runs that continue the same line into one
   * `AcDbText`. Default `true`.
   */
  mergeTextRuns?: boolean
}

/** Fully populated {@link AcApPdfImportOptions}. */
export type AcApResolvedPdfImportOptions = Required<
  Omit<AcApPdfImportOptions, 'curveRecognition'>
> &
  Pick<AcApPdfImportOptions, 'curveRecognition'>

/**
 * Fills defaults for {@link AcApPdfImportOptions}.
 *
 * @param options - Partial options; may be omitted.
 */
export function resolveAcApPdfImportOptions(
  options?: AcApPdfImportOptions
): AcApResolvedPdfImportOptions {
  const scale = options?.scale
  return {
    pageNumber: Math.max(1, Math.floor(options?.pageNumber ?? 1)),
    insertionPoint: options?.insertionPoint ?? { x: 0, y: 0 },
    scale:
      scale !== undefined && scale > 0 && Number.isFinite(scale) ? scale : 1,
    recognizeCurves: options?.recognizeCurves ?? true,
    curveRecognition: options?.curveRecognition,
    lineWeights: options?.lineWeights ?? true,
    removeDuplicates: options?.removeDuplicates ?? true,
    mergeTextRuns: options?.mergeTextRuns ?? true
  }
}
