import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

/** Lazy plugin name for PDF export/import. */
export const PDF_PLUGIN_NAME = 'PdfPlugin'

/**
 * Trigger commands handled by {@link PDF_PLUGIN_NAME}.
 *
 * - `-cpdf` — export drawing to PDF via command-line prompts
 * - `cpdf` — same as `-cpdf` when no UI dialog is registered; in cad-viewer,
 *   `cpdf` opens the export dialog and loads this plugin on confirm via `-cpdf`
 * - `ipdf` — import vector geometry from PDF
 * - `pdfscale` — calibrate imported PDF geometry from a known distance
 * - `pdftext` — convert exploded PDF text strokes back into text
 * - `pdfblock` — turn repeated PDF geometry back into a block
 */
export const PDF_PLUGIN_TRIGGERS = [
  '-cpdf',
  'cpdf',
  'ipdf',
  'pdfscale',
  'pdftext',
  'pdfblock'
] as const

/** Triggers that remain when export is disabled. */
const PDF_IMPORT_TRIGGERS = [
  'ipdf',
  'pdfscale',
  'pdftext',
  'pdfblock'
] as const

/**
 * Registers the PDF plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-pdf-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazyPdfPlugin(
  pluginManager: AcApPluginManager,
  options: { disableExport?: boolean } = {}
): void {
  const disableExport = options.disableExport === true
  const triggers = disableExport
    ? [...PDF_IMPORT_TRIGGERS]
    : [...PDF_PLUGIN_TRIGGERS]

  pluginManager.registerLazyPlugin({
    name: PDF_PLUGIN_NAME,
    triggers: [...triggers],
    loader: async () => {
      const { createPdfPlugin } = await import('@mlightcad/cad-pdf-plugin')
      return createPdfPlugin({ disableExport })
    }
  })
}
