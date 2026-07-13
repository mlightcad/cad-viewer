import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

/** Lazy plugin name for HTML export. */
export const HTML_PLUGIN_NAME = 'HtmlPlugin'

/**
 * Trigger command handled by {@link HTML_PLUGIN_NAME}.
 *
 * - `-chtml` — export drawing to standalone offline HTML (command-line)
 * - `chtml` — same as `-chtml` when no UI command is registered (e.g. without cad-viewer)
 */
export const HTML_PLUGIN_TRIGGERS = ['-chtml', 'chtml'] as const

/**
 * Registers the HTML export plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-html-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazyHtmlPlugin(pluginManager: AcApPluginManager): void {
  pluginManager.registerLazyPlugin({
    name: HTML_PLUGIN_NAME,
    triggers: [...HTML_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createHtmlPlugin } = await import('@mlightcad/cad-html-plugin')
      return createHtmlPlugin()
    }
  })
}
