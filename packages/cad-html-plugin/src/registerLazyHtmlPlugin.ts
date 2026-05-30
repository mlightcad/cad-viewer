import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

/** Lazy plugin name for HTML export. */
export const HTML_PLUGIN_NAME = 'HtmlPlugin'

/**
 * Trigger command handled by {@link HTML_PLUGIN_NAME}.
 *
 * - `chtml` — export drawing to standalone offline HTML
 */
export const HTML_PLUGIN_TRIGGERS = ['chtml'] as const

/**
 * Creates an HTML export plugin instance after loading the plugin module chunk.
 *
 * @returns A loaded {@link AcApHtmlPlugin} instance
 */
export async function createHtmlPlugin() {
  const { AcApHtmlPlugin } = await import('./AcApHtmlPlugin')
  return new AcApHtmlPlugin()
}

/**
 * Registers the HTML export plugin for lazy loading.
 *
 * The plugin bundle is not fetched until the `chtml` command runs.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazyHtmlPlugin(pluginManager: AcApPluginManager): void {
  pluginManager.registerLazyPlugin({
    name: HTML_PLUGIN_NAME,
    triggers: [...HTML_PLUGIN_TRIGGERS],
    loader: createHtmlPlugin
  })
}
