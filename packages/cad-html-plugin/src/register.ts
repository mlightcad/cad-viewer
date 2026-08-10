import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions'

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
 * Options captured at registration time and passed into {@link createHtmlPlugin}
 * when the lazy loader runs. Kept in this module so the `/register` entry does
 * not statically import the main plugin bundle.
 */
let registeredOptions: AcApHtmlPluginOptions = {}

/**
 * Registers the HTML export plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-html-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 * @param options - Plugin options (e.g. `viewerRuntimeUrl` for HTML export).
 *   Opening DXF/DWG does not require this package or these options.
 */
export function registerLazyHtmlPlugin(
  pluginManager: AcApPluginManager,
  options?: AcApHtmlPluginOptions
): void {
  if (options) {
    registeredOptions = { ...registeredOptions, ...options }
  }

  const optionsForLoader = { ...registeredOptions }

  pluginManager.registerLazyPlugin({
    name: HTML_PLUGIN_NAME,
    triggers: [...HTML_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createHtmlPlugin } = await import('@mlightcad/cad-html-plugin')
      return createHtmlPlugin(optionsForLoader)
    }
  })
}

export type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions'
