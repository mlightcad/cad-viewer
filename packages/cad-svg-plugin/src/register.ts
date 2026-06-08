import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

/** Lazy plugin name for SVG export. */
export const SVG_PLUGIN_NAME = 'SvgPlugin'

/**
 * Trigger command handled by {@link SVG_PLUGIN_NAME}.
 *
 * - `csvg` — export drawing to SVG
 */
export const SVG_PLUGIN_TRIGGERS = ['csvg'] as const

/**
 * Registers the SVG export plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-svg-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 */
export function registerLazySvgPlugin(pluginManager: AcApPluginManager): void {
  pluginManager.registerLazyPlugin({
    name: SVG_PLUGIN_NAME,
    triggers: [...SVG_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createSvgPlugin } = await import('@mlightcad/cad-svg-plugin')
      return createSvgPlugin()
    }
  })
}
