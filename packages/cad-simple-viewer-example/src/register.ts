import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'

let isLazyPluginRegistered = false

/**
 * Registers export plugins used by this example app.
 *
 * Import from each plugin's `/register` subpath so only the registration stub is in the
 * initial bundle; plugin code loads when a trigger command runs.
 * Safe to call multiple times; registration runs once per application lifetime.
 */
export const registerLazyPlugins = () => {
  if (isLazyPluginRegistered) {
    return
  }

  const pluginManager = AcApDocManager.instance.pluginManager
  registerLazyHtmlPlugin(pluginManager)
  registerLazyPdfPlugin(pluginManager)
  registerLazySvgPlugin(pluginManager)

  isLazyPluginRegistered = true
}
