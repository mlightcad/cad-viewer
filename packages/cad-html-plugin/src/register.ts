import {
  type AcApPluginManager,
  AcApUiRegistry,
  ICON_EXPORT_HTML
} from '@mlightcad/cad-simple-viewer'

import type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions.js'
import { htmlUiMessages } from './i18n/chrome.js'
import { registerHtmlExportDialogCommand } from './ui/AcUiHtmlExportDialog.js'

/** Lazy plugin name for HTML export. */
export const HTML_PLUGIN_NAME = 'HtmlPlugin'

/**
 * Trigger command handled by {@link HTML_PLUGIN_NAME}.
 *
 * - `-chtml` — export drawing to standalone offline HTML (command-line)
 * - `chtml` — export dialog in the browser (registered here when a DOM exists);
 *   loads this plugin on confirm via `-chtml`. Node hosts keep the prompt command
 */
export const HTML_PLUGIN_TRIGGERS = ['-chtml', 'chtml'] as const

/**
 * Options captured at registration time and passed into {@link createHtmlPlugin}
 * when the lazy loader runs. Kept in this module so the `/register` entry does
 * not statically import the main plugin bundle.
 */
let registeredOptions: AcApHtmlPluginOptions = {}

/**
 * Options for {@link registerLazyHtmlPlugin}.
 *
 * `dialog` is registration-only and is not forwarded to the convertor.
 */
export interface AcApHtmlRegisterOptions extends AcApHtmlPluginOptions {
  /**
   * Register the `chtml` dialog when a DOM exists.
   *
   * Defaults to true. Headless hosts pass `false` so `chtml` stays a prompt.
   */
  dialog?: boolean
}

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
  options?: AcApHtmlRegisterOptions
): void {
  const { dialog, ...pluginOptions } = options ?? {}
  if (Object.keys(pluginOptions).length > 0) {
    registeredOptions = { ...registeredOptions, ...pluginOptions }
  }

  const optionsForLoader = { ...registeredOptions }

  AcApUiRegistry.register({
    plugin: HTML_PLUGIN_NAME,
    messages: htmlUiMessages(),
    menuItems: [
      {
        id: 'ExportHtml',
        parentId: 'file.export',
        labelKey: 'main.mainMenu.exportHtml',
        command: 'chtml',
        iconSvg: ICON_EXPORT_HTML,
        order: 10
      }
    ]
  })

  if (dialog !== false) registerHtmlExportDialogCommand()

  pluginManager.registerLazyPlugin({
    name: HTML_PLUGIN_NAME,
    triggers: [...HTML_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createHtmlPlugin } = await import('@mlightcad/cad-html-plugin')
      return createHtmlPlugin(optionsForLoader)
    }
  })
}

export type { AcApHtmlPluginOptions } from './AcApHtmlPluginOptions.js'
