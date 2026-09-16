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
  /**
   * How MTEXT/TEXT are painted.
   *
   * - `'text'` (default): laid-out text is painted as real PDF text through
   *   fonts resolved from the viewer font catalog — text stays
   *   selectable/searchable and the file shrinks dramatically. Texts whose
   *   font is SHX or cannot be embedded fall back to vector glyphs.
   * - `'vector'`: glyphs are tessellated into line/fill geometry
   *   (self-contained, but dense text dominates the file size).
   */
  textMode?: 'vector' | 'text'
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
    exportLayouts: options.exportLayouts !== false,
    textMode: options.textMode === 'vector' ? 'vector' : 'text'
  }
}
