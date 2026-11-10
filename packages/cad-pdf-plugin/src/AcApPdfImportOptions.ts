import type { PdfCurveRecognitionOptions } from './recognition/pdfCurveRecognition'
import type { PdfHatchRecognitionOptions } from './recognition/pdfHatchRecognition'

/**
 * How `ipdf` turns a PDF page into CAD entities.
 *
 * - `recover` — try to rebuild the source drawing: recover circles, arcs,
 *   ellipses and splines from Bezier paths, drop duplicate outlines, merge
 *   text runs into lines, turn repeated forms into blocks and map fonts to
 *   text styles.
 * - `visual` — keep the page as painted: every PDF path becomes a line or a
 *   flattened polyline and every text run its own text, as `ipdf` did before
 *   curve recovery was added. Use it when recovery changes how a page looks.
 */
export type AcApPdfImportMode = 'recover' | 'visual'

/**
 * Options for {@link AcApPdfImportConvertor.convert}.
 *
 * Every field is optional. Omitted fields fall back to the defaults of the
 * chosen {@link AcApPdfImportOptions.mode}; the defaults below are those of
 * `recover` mode.
 */
export interface AcApPdfImportOptions {
  /**
   * Import mode; it sets the defaults of the reconstruction fields below
   * (`visual` turns off `recognizeCurves`, `removeDuplicates`,
   * `mergeTextRuns`, `formBlocks` and `textStyles`). Explicit fields still
   * win. Default `'recover'`.
   */
  mode?: AcApPdfImportMode
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
  /**
   * Turn Form XObjects painted two or more times with identical content into
   * block definitions and references. Default `true`.
   */
  formBlocks?: boolean
  /**
   * Give dashed PDF strokes a matching `PDF_DASH_*` linetype. Default `true`.
   */
  dashLinetypes?: boolean
  /**
   * Turn filled PDF areas into solid hatches in the fill colour (a pure fill
   * becomes only a hatch; fill + stroke also keeps the outline). When
   * `false`, fills import as outlines only. Default `true`.
   */
  fillHatches?: boolean
  /**
   * Rebuild pattern hatches (ANSI31, brick, cross-hatch, ...) from the short
   * strokes PDF producers write for them. A hatch is kept only when drawing
   * it reproduces the source strokes; anything else stays as lines. Default
   * `true` in `recover` mode, `false` in `visual` mode.
   */
  recognizeHatches?: boolean
  /** Tuning for pattern hatch recognition. */
  hatchRecognition?: PdfHatchRecognitionOptions
  /**
   * Give imported text a `PDF_<font family>` text style using the PDF font's
   * family. Default `true`.
   */
  textStyles?: boolean
  /**
   * Set each text's width factor so it spans the width it had in the PDF,
   * measured in the font the viewer draws it with. The viewer rarely has
   * the PDF's own font, and substitutes often run wider. Default `true`.
   */
  fitTextWidth?: boolean
  /**
   * Import raster images (photos, logos, QR codes) as `AcDbRasterImage`
   * entities named `PDF_IMAGE_<n>.png`. Their pixels live in the drawing
   * session only; DWG/DXF reference images as external files. Default
   * `true`.
   */
  images?: boolean
}

/** Fully populated {@link AcApPdfImportOptions}. */
export type AcApResolvedPdfImportOptions = Required<
  Omit<AcApPdfImportOptions, 'curveRecognition' | 'hatchRecognition'>
> &
  Pick<AcApPdfImportOptions, 'curveRecognition' | 'hatchRecognition'>

/**
 * Fills defaults for {@link AcApPdfImportOptions}.
 *
 * @param options - Partial options; may be omitted.
 */
export function resolveAcApPdfImportOptions(
  options?: AcApPdfImportOptions
): AcApResolvedPdfImportOptions {
  const scale = options?.scale
  const mode = options?.mode === 'visual' ? 'visual' : 'recover'
  const recover = mode === 'recover'
  return {
    mode,
    pageNumber: Math.max(1, Math.floor(options?.pageNumber ?? 1)),
    insertionPoint: options?.insertionPoint ?? { x: 0, y: 0 },
    scale:
      scale !== undefined && scale > 0 && Number.isFinite(scale) ? scale : 1,
    recognizeCurves: options?.recognizeCurves ?? recover,
    curveRecognition: options?.curveRecognition,
    lineWeights: options?.lineWeights ?? true,
    removeDuplicates: options?.removeDuplicates ?? recover,
    mergeTextRuns: options?.mergeTextRuns ?? recover,
    formBlocks: options?.formBlocks ?? recover,
    dashLinetypes: options?.dashLinetypes ?? true,
    fillHatches: options?.fillHatches ?? true,
    recognizeHatches: options?.recognizeHatches ?? recover,
    hatchRecognition: options?.hatchRecognition,
    textStyles: options?.textStyles ?? recover,
    fitTextWidth: options?.fitTextWidth ?? true,
    images: options?.images ?? true
  }
}
