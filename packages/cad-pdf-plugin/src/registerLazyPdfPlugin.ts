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
 * Creates a PDF plugin instance after loading the plugin module chunk.
 *
 * @returns A loaded {@link AcApPdfPlugin} instance
 */
export async function createPdfPlugin() {
  const { AcApPdfPlugin } = await import('./AcApPdfPlugin')
  return new AcApPdfPlugin()
}

/**
 * Registers the PDF plugin for lazy loading.
 *
 * The plugin bundle is not fetched until one of its trigger commands runs.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazyPdfPlugin(pluginManager: AcApPluginManager): void {
  pluginManager.registerLazyPlugin({
    name: PDF_PLUGIN_NAME,
    triggers: [...PDF_PLUGIN_TRIGGERS],
    loader: createPdfPlugin
  })
}
