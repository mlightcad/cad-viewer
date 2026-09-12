import type { AcGiFontMapping } from '@mlightcad/data-model'

import type { AcPdfGlyphProvider } from './text/AcPdfGlyphProvider'

/**
 * Options for {@link exportDatabaseToPdf}.
 *
 * Viewer-specific types such as `AcApContext` are intentionally absent so this
 * package can run without `@mlightcad/cad-simple-viewer`.
 */
export interface AcPdfExportOptions {
  /**
   * Block table record name to export. Defaults to model space.
   */
  blockName?: string
  /**
   * Page size. `'extents'` fits the drawing bounding box (default).
   */
  paper?: 'extents' | { widthMm: number; heightMm: number }
  /** Margin around extents, in millimetres. Defaults to 0 (2% padding is still applied). */
  marginMm?: number
  /**
   * Page background. `'none'` leaves white paper (default). A 24-bit RGB
   * paints a full-page rectangle first.
   */
  background?: 'none' | number
  /** Mirrors LWDISPLAY. Defaults to the database `lwdisplay` flag when omitted. */
  showLineWeight?: boolean
  /** Global linetype scale. Defaults to the database `ltscale`. */
  ltscale?: number
  /** Entity linetype scale. Defaults to the database `celtscale`. */
  celtscale?: number
  /** Font name substitutions passed to the glyph provider. */
  fontMapping?: AcGiFontMapping
  /**
   * When true, frozen/off layers are still walked if the database policy
   * allows it. Defaults to false.
   */
  includeHiddenLayers?: boolean
  /** Wrap exploded text with PDF `/ActualText`. Defaults to true. */
  embedTextActualText?: boolean
  /** Overlay invisible PDF text for search. Defaults to false. */
  embedInvisibleText?: boolean
  /** Embed a CAD JSON sidecar. Defaults to false. */
  embedCadJson?: boolean
  /** PDF document title. */
  title?: string
  /**
   * Optional WCS box used to size and frame the page. When omitted, the
   * exporter unions the primary drawable cluster (HTML export “Extents”).
   * Pass the live camera box for HTML export “Current”.
   */
  fitBox?: {
    min: { x: number; y: number }
    max: { x: number; y: number }
  }
  /**
   * Page framing. `'extents'` fits drawable geometry (default, HTML “范围”).
   * `'current'` keeps the on-screen view (HTML “当前”).
   */
  fit?: 'extents' | 'current'
  /**
   * When `'all'`, every layout (model + paper space) is exported as its
   * own PDF page. Defaults to the current space only.
   */
  layouts?: 'current' | 'all'
  /**
   * Optional glyph engine for MTEXT / SHAPE. When omitted, text entities
   * produce no visible geometry (ActualText may still be reserved later).
   */
  glyphProvider?: AcPdfGlyphProvider
  /**
   * Block table record object id to export. Overrides {@link blockName}
   * and the current space when set.
   */
  blockId?: string
}
