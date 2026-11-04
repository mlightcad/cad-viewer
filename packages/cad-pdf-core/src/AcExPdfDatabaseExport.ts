import type { AcDbDatabase, AcGiFontMapping } from '@mlightcad/data-model'
import {
  type AcPdfExportOptions,
  type AcPdfGlyphProvider,
  type AcPdfTextFontResolver,
  exportDatabaseToPdf
} from '@mlightcad/pdf-renderer'

import {
  type AcExPdfExportOptions,
  acexPdfResolveExportOptions
} from './AcExPdfExportOptions'
import { acexPdfCreateGlyphProvider } from './AcExPdfGlyphProvider'

/** Axis-aligned WCS box used to frame a model-space page. */
export interface AcExPdfFitBox {
  min: { x: number; y: number }
  max: { x: number; y: number }
}

/**
 * Inputs for {@link acexPdfExportDatabase}: the user options plus the
 * host-provided services that differ between the browser and Node.
 */
export interface AcExPdfDatabaseExportOptions extends AcExPdfExportOptions {
  /** PDF document title. */
  title?: string
  /** Font name substitutions passed to the glyph engine. */
  fontMapping?: AcGiFontMapping
  /**
   * Visible WCS box for {@link AcExPdfExportOptions.modelSpaceFit} `'display'`.
   * Ignored for `'extents'`. When omitted, `'display'` behaves like
   * `'extents'` (headless hosts have no live view).
   */
  displayBox?: AcExPdfFitBox
  /**
   * MTEXT/SHAPE glyph engine. Defaults to {@link acexPdfCreateGlyphProvider},
   * which requires an initialized `AcTrMTextRenderer`.
   */
  glyphProvider?: AcPdfGlyphProvider
  /**
   * Resolves embeddable font programs for {@link AcExPdfExportOptions.textMode}
   * `'text'`. Without it, every text paints as vector glyphs.
   */
  textFontResolver?: AcPdfTextFontResolver
}

/**
 * Builds the low-level `pdf-renderer` options for a drawing.
 *
 * Stroke widths follow the drawing `LWDISPLAY` flag: on uses object
 * lineweights, off emits true PDF hairlines. Linetype scales come from the
 * database.
 *
 * @param db - Drawing to export
 * @param options - User options and host services
 * @returns Options for `exportDatabaseToPdf`
 */
export function acexPdfBuildRendererOptions(
  db: AcDbDatabase,
  options: AcExPdfDatabaseExportOptions = {}
): AcPdfExportOptions {
  const resolved = acexPdfResolveExportOptions(options)
  const pdfOptions: AcPdfExportOptions = {
    title: options.title,
    ltscale: db.ltscale,
    celtscale: db.celtscale,
    showLineWeight: !!db.lwdisplay,
    fontMapping: options.fontMapping,
    background: 'none',
    fit: resolved.modelSpaceFit === 'display' ? 'current' : 'extents',
    layouts: resolved.exportLayouts ? 'all' : 'current',
    glyphProvider: options.glyphProvider ?? acexPdfCreateGlyphProvider(),
    textMode: resolved.textMode,
    colorMode: resolved.colorMode
  }
  if (resolved.textMode === 'text' && options.textFontResolver) {
    pdfOptions.textFontResolver = options.textFontResolver
  }

  if (resolved.modelSpaceFit === 'display' && options.displayBox) {
    // Display framing must use coordinates from the space being framed.
    // When exporting all layouts from paper space, the active camera is in
    // paper WCS — applying that box to the model-space page would be wrong.
    // In that case omit fitBox so the model page falls back to extents;
    // paper pages already ignore model-space fitBox in exportAllLayouts.
    const inModelSpace =
      db.currentSpaceId === db.tables.blockTable.modelSpace.objectId
    if (inModelSpace || !resolved.exportLayouts) {
      pdfOptions.fitBox = options.displayBox
    }
  }
  return pdfOptions
}

/**
 * Renders a drawing database to vector PDF bytes.
 *
 * Shared by the browser plugin (`cpdf` / `-cpdf`) and the headless
 * `cad-pdf-exporter`. Framing matches HTML export: `'extents'` fits drawable
 * geometry; `'display'` uses {@link AcExPdfDatabaseExportOptions.displayBox}.
 * Paper-space pages ignore model-space fit and use their own extents.
 *
 * @param db - Drawing to export
 * @param options - User options and host services
 * @returns PDF file bytes
 */
export async function acexPdfExportDatabase(
  db: AcDbDatabase,
  options: AcExPdfDatabaseExportOptions = {}
): Promise<Uint8Array> {
  return exportDatabaseToPdf(db, acexPdfBuildRendererOptions(db, options))
}
