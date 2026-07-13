import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

/** Lazy plugin name for PDF export/import. */
export const PDF_PLUGIN_NAME = 'PdfPlugin'

/**
 * Trigger commands handled by {@link PDF_PLUGIN_NAME}.
 *
 * - `cpdf` — export drawing to PDF
 * - `ipdf` — import vector geometry from PDF
 */
export const PDF_PLUGIN_TRIGGERS = ['cpdf', 'ipdf'] as const

/**
 * Registers the PDF plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-pdf-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazyPdfPlugin(pluginManager: AcApPluginManager): void {
  pluginManager.registerLazyPlugin({
    name: PDF_PLUGIN_NAME,
    triggers: [...PDF_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createPdfPlugin } = await import('@mlightcad/cad-pdf-plugin')
      return createPdfPlugin()
    }
  })
}
