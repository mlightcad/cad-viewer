import type {
  AcExPdfColorMode,
  AcExPdfExportOptions,
  AcExPdfTextMode
} from '@mlightcad/cad-pdf-core'
import type { AcGiFontMapping } from '@mlightcad/data-model'

import type { AcExDwgParser } from './registerDwg'

/**
 * Options shared by {@link convertDatabaseToPdf} and {@link exportFileToPdf}.
 *
 * Model-space framing is always `'extents'`: a headless export has no live
 * view to frame.
 */
export interface AcPdfExporterOptions extends Omit<
  AcExPdfExportOptions,
  'modelSpaceFit'
> {
  /**
   * When `true` (default), every layout (model + paper space) becomes a PDF
   * page. When `false`, only the drawing's current space is exported.
   */
  exportLayouts?: boolean
  /**
   * How MTEXT/TEXT are painted. `'text'` (default) embeds fonts from the
   * font library as real PDF text; `'vector'` tessellates glyph outlines.
   */
  textMode?: AcExPdfTextMode
  /**
   * Colour treatment. `'color'` (default) keeps entity colours;
   * `'monochrome'` exports black drawing content on white paper.
   */
  colorMode?: AcExPdfColorMode
  /**
   * PDF document title. Defaults to the input file stem when exporting
   * from a path.
   */
  title?: string
  /**
   * Local font library. Faces are read from disk instead of the CDN.
   * Accepts a folder of SHX/TTF/WOFF files, that folder when it contains
   * `fonts.json`, or a cad-data checkout (`…/cad-data`, faces in `fonts/`).
   * Takes precedence over {@link AcPdfExporterOptions.fontsUrl}.
   */
  fontsDir?: string
  /**
   * Override the remote font library base URL (`fonts.json` + face files).
   * Used when {@link AcPdfExporterOptions.fontsDir} is omitted. Defaults to
   * the public cad-data fonts folder on jsDelivr.
   */
  fontsUrl?: string
  /** Font name substitutions passed to the glyph engine. */
  fontMapping?: AcGiFontMapping
  /**
   * DWG parser used by {@link exportFileToPdf}. Defaults to `'libredwg'`.
   * `'dwg'` needs a separately installed `@mlightcad/dwg-converter` (and a
   * license or active trial). Ignored for DXF inputs.
   */
  dwgParser?: AcExDwgParser
  /**
   * License key for `@mlightcad/dwg-converter` when
   * {@link AcPdfExporterOptions.dwgParser} is `'dwg'`.
   */
  dwgLicenseKey?: string
  /**
   * Whether entities on non-plottable ("no-plot") layers are drawn.
   *
   * Defaults to `false` so headless PDF matches `cad-editor` / AutoCAD plot
   * (Defpoints, `不打印`, markup-only layers, etc. are omitted). Pass `true`
   * to keep those layers visible, matching desktop AutoCAD editor display.
   */
  drawNoPlotLayers?: boolean
}

/** Result of {@link exportFileToPdf}. */
export interface AcPdfExportResult {
  /** PDF file bytes (also written to the output path). */
  bytes: Uint8Array
  /** Suggested file name (`<title>.pdf`). */
  fileName: string
}
