import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'
import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'
import { log } from '@mlightcad/data-model'

import { registerOneDriveFromEnv } from './onedriveEnv'

let isLazyPluginRegistered = false

/**
 * Registers export plugins and optional OneDrive data source used by this example.
 *
 * Import from each plugin's `/register` subpath so only the registration stub is in the
 * initial bundle; plugin code loads when a trigger command runs.
 * Safe to call multiple times; registration runs once per application lifetime.
 */
export const registerLazyPlugins = async () => {
  if (isLazyPluginRegistered) {
    return
  }
  isLazyPluginRegistered = true

  const pluginManager = AcApDocManager.instance.pluginManager
  registerLazyHtmlPlugin(pluginManager, {
    viewerRuntimeUrl: './viewer-runtime.iife.js'
  })
  registerLazyPdfPlugin(pluginManager)
  registerLazySvgPlugin(pluginManager)
  registerLazyAgentPlugin(pluginManager)

  try {
    const registered = await registerOneDriveFromEnv(pluginManager)
    if (registered) {
      log.info('[example] OneDrive data source registered')
    }
  } catch (error) {
    log.warn('OneDrive plugin not available:', error)
  }
}
