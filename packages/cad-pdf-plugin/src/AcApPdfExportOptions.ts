/**
 * Model-space page framing for PDF export.
 *
 * - `display` — fit the live viewport (on-screen view).
 * - `extents` — fit drawable geometry in the current space.
 */
export type AcApPdfModelSpaceFit = 'display' | 'extents'

/**
 * User-configurable options for PDF export (`cpdf` dialog, `-cpdf`, and API).
 */
export interface AcApPdfExportOptions {
  /**
   * How to frame model-space pages. Defaults to `'extents'`.
   * Paper-space pages always use their own drawable extents / paper size.
   */
  modelSpaceFit?: AcApPdfModelSpaceFit
  /**
   * When `true`, every layout (model + paper space) becomes a PDF page.
   * When `false`, only the current space is exported. Defaults to `true`.
   */
  exportLayouts?: boolean
}

/**
 * Resolves PDF export options with package defaults.
 */
export function resolveAcApPdfExportOptions(
  options: AcApPdfExportOptions = {}
): Required<AcApPdfExportOptions> {
  return {
    modelSpaceFit:
      options.modelSpaceFit === 'display' ? 'display' : 'extents',
    exportLayouts: options.exportLayouts !== false
  }
}
