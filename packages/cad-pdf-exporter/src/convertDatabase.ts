import {
  acPdExportDatabase,
  acPdResolveExportOptions
} from '@mlightcad/cad-pdf-core'
import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcPdfExporterOptions } from './exportOptions'
import {
  createNodeTextFontResolver,
  preloadDrawingFonts,
  setupExportTextRendering
} from './nodeFontLoader'
import { withWorkingDatabase } from './withWorkingDatabase'

/**
 * Converts an open database into PDF bytes without a browser or
 * `cad-simple-viewer`.
 *
 * Sets up main-thread text rendering with a Node font loader, preloads the
 * drawing's text-style fonts, then renders through `@mlightcad/cad-pdf-core`.
 *
 * @param database - Drawing to export
 * @param options - Export options
 * @returns PDF file bytes
 */
export async function convertDatabaseToPdf(
  database: AcDbDatabase,
  options: AcPdfExporterOptions = {}
): Promise<Uint8Array> {
  return withWorkingDatabase(database, async () => {
    const resolved = acPdResolveExportOptions({
      exportLayouts: options.exportLayouts,
      textMode: options.textMode,
      colorMode: options.colorMode
    })

    const tFonts = performance.now()
    const library = await setupExportTextRendering({
      fontsDir: options.fontsDir,
      fontsUrl: options.fontsUrl
    })
    await preloadDrawingFonts(database)
    const fontsMs = performance.now() - tFonts

    const tRender = performance.now()
    const bytes = await acPdExportDatabase(database, {
      ...resolved,
      // No live view headless: frame model space by drawable extents.
      modelSpaceFit: 'extents',
      title: options.title,
      fontMapping: options.fontMapping,
      textFontResolver:
        resolved.textMode === 'text'
          ? createNodeTextFontResolver(library)
          : undefined
    })
    const renderMs = performance.now() - tRender

    console.info(
      `[cad-pdf-exporter] convert timings: fonts=${fontsMs.toFixed(0)}ms render=${renderMs.toFixed(0)}ms (textMode=${resolved.textMode}, colorMode=${resolved.colorMode})`
    )
    return bytes
  })
}
