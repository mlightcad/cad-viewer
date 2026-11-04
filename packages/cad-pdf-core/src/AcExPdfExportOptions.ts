import type { AcPdfColorMode } from '@mlightcad/pdf-renderer'

/**
 * Model-space page framing for PDF export.
 *
 * - `display` — fit the live viewport (on-screen view). Needs a host view;
 *   headless exporters fall back to `extents`.
 * - `extents` — fit drawable geometry in the current space.
 */
export type AcExPdfModelSpaceFit = 'display' | 'extents'

/**
 * How MTEXT/TEXT are painted in the PDF.
 *
 * - `'text'`: real PDF text through embedded (subset) fonts — selectable,
 *   searchable and small. SHX or non-embeddable fonts fall back to vectors.
 * - `'vector'`: glyphs tessellated into line/fill geometry.
 */
export type AcExPdfTextMode = 'vector' | 'text'

/**
 * Colour treatment of the exported PDF.
 *
 * - `'color'`: keep entity colours (current behaviour).
 * - `'monochrome'`: white paper; linework and text in black, solid fill
 *   areas in grey by luminance.
 */
export type AcExPdfColorMode = AcPdfColorMode

/**
 * User-configurable PDF export options shared by the `cpdf` dialog, the
 * `-cpdf` command, the headless exporter and the API.
 */
export interface AcExPdfExportOptions {
  /**
   * How to frame model-space pages. Defaults to `'extents'`.
   * Paper-space pages always use their own drawable extents / paper size.
   */
  modelSpaceFit?: AcExPdfModelSpaceFit
  /**
   * When `true`, every layout (model + paper space) becomes a PDF page.
   * When `false`, only the current space is exported. Defaults to `true`.
   */
  exportLayouts?: boolean
  /** How MTEXT/TEXT are painted. Defaults to `'text'`. */
  textMode?: AcExPdfTextMode
  /**
   * Colour treatment. `'color'` (default) keeps entity colours;
   * `'monochrome'` exports black linework and text (grey fills) on white
   * paper.
   */
  colorMode?: AcExPdfColorMode
}

/** Default PDF export options. */
export const ACEXPDF_DEFAULT_EXPORT_OPTIONS: Readonly<
  Required<AcExPdfExportOptions>
> = Object.freeze({
  modelSpaceFit: 'extents',
  exportLayouts: true,
  textMode: 'text',
  colorMode: 'color'
})

/**
 * Resolves PDF export options with package defaults. Unknown values fall back
 * to the defaults so callers can pass loosely typed input (CLI flags, JSON).
 *
 * @param options - Partial options
 * @returns Fully populated options
 */
export function acexPdfResolveExportOptions(
  options: AcExPdfExportOptions = {}
): Required<AcExPdfExportOptions> {
  return {
    modelSpaceFit: options.modelSpaceFit === 'display' ? 'display' : 'extents',
    exportLayouts: options.exportLayouts !== false,
    textMode: options.textMode === 'vector' ? 'vector' : 'text',
    colorMode: options.colorMode === 'monochrome' ? 'monochrome' : 'color'
  }
}
