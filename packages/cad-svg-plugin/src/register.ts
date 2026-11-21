import {
  type AcApPluginManager,
  AcApUiRegistry,
  ICON_EXPORT_SVG
} from '@mlightcad/cad-simple-viewer'

import { svgUiMessages } from './i18n/chrome.js'

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
  AcApUiRegistry.register({
    plugin: SVG_PLUGIN_NAME,
    messages: svgUiMessages(),
    menuItems: [
      {
        id: 'ExportSvg',
        parentId: 'file.export',
        labelKey: 'main.mainMenu.exportSvg',
        command: 'csvg',
        iconSvg: ICON_EXPORT_SVG,
        order: 30
      }
    ]
  })

  pluginManager.registerLazyPlugin({
    name: SVG_PLUGIN_NAME,
    triggers: [...SVG_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createSvgPlugin } = await import('@mlightcad/cad-svg-plugin')
      return createSvgPlugin()
    }
  })
}
