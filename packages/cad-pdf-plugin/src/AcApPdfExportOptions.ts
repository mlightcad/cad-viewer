import {
  type AcPdColorMode,
  type AcPdExportOptions,
  type AcPdModelSpaceFit,
  acPdResolveExportOptions,
  type AcPdTextMode
} from '@mlightcad/cad-pdf-core'

/**
 * Model-space page framing for PDF export.
 *
 * Alias of {@link AcPdModelSpaceFit} from `@mlightcad/cad-pdf-core`.
 */
export type AcApPdfModelSpaceFit = AcPdModelSpaceFit

/**
 * How MTEXT/TEXT are painted. Alias of {@link AcPdTextMode}.
 */
export type AcApPdfTextMode = AcPdTextMode

/**
 * Colour treatment of the exported PDF (`'color'` or black-on-white
 * `'monochrome'`). Alias of {@link AcPdColorMode}.
 */
export type AcApPdfColorMode = AcPdColorMode

/**
 * User-configurable options for PDF export (`cpdf` dialog, `-cpdf`, and API).
 *
 * Alias of {@link AcPdExportOptions} from `@mlightcad/cad-pdf-core`, shared
 * with the headless `@mlightcad/cad-pdf-exporter`.
 */
export type AcApPdfExportOptions = AcPdExportOptions

/**
 * Resolves PDF export options with package defaults.
 *
 * @param options - Partial options
 * @returns Fully populated options
 */
export function resolveAcApPdfExportOptions(
  options: AcApPdfExportOptions = {}
): Required<AcApPdfExportOptions> {
  return acPdResolveExportOptions(options)
}
