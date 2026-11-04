import {
  type AcExPdfColorMode,
  type AcExPdfExportOptions,
  type AcExPdfModelSpaceFit,
  acexPdfResolveExportOptions,
  type AcExPdfTextMode
} from '@mlightcad/cad-pdf-core'

/**
 * Model-space page framing for PDF export.
 *
 * Alias of {@link AcExPdfModelSpaceFit} from `@mlightcad/cad-pdf-core`.
 */
export type AcApPdfModelSpaceFit = AcExPdfModelSpaceFit

/**
 * How MTEXT/TEXT are painted. Alias of {@link AcExPdfTextMode}.
 */
export type AcApPdfTextMode = AcExPdfTextMode

/**
 * Colour treatment of the exported PDF (`'color'` or black-on-white
 * `'monochrome'`). Alias of {@link AcExPdfColorMode}.
 */
export type AcApPdfColorMode = AcExPdfColorMode

/**
 * User-configurable options for PDF export (`cpdf` dialog, `-cpdf`, and API).
 *
 * Alias of {@link AcExPdfExportOptions} from `@mlightcad/cad-pdf-core`, shared
 * with the headless `@mlightcad/cad-pdf-exporter`.
 */
export type AcApPdfExportOptions = AcExPdfExportOptions

/**
 * Resolves PDF export options with package defaults.
 *
 * @param options - Partial options
 * @returns Fully populated options
 */
export function resolveAcApPdfExportOptions(
  options: AcApPdfExportOptions = {}
): Required<AcApPdfExportOptions> {
  return acexPdfResolveExportOptions(options)
}
