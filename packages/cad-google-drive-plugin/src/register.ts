import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import type { AcApGoogleDrivePluginOptions } from './AcApGoogleDrivePlugin'

/** Eager plugin name for Google Drive data source. */
export const GOOGLE_DRIVE_PLUGIN_NAME = 'GoogleDrivePlugin'

/**
 * Registers and eagerly loads the Google Drive data-source plugin.
 *
 * Eager load is required so Open menus list Google Drive immediately. GIS / gapi
 * scripts are still loaded lazily inside sign-in / pick.
 *
 * Import from `@mlightcad/cad-google-drive-plugin/register` when you only need
 * registration from the app entry.
 *
 * @param pluginManager - Plugin manager that receives the plugin
 * @param options - Google client configuration (`clientId`, `apiKey`, `appId`)
 */
export async function registerGoogleDrivePlugin(
  pluginManager: AcApPluginManager,
  options: AcApGoogleDrivePluginOptions
): Promise<void> {
  if (!options.clientId) {
    throw new Error('registerGoogleDrivePlugin requires options.clientId')
  }
  if (!options.apiKey) {
    throw new Error('registerGoogleDrivePlugin requires options.apiKey')
  }
  if (!options.appId) {
    throw new Error(
      'registerGoogleDrivePlugin requires options.appId (numeric project number)'
    )
  }
  const { createGoogleDrivePlugin } = await import(
    '@mlightcad/cad-google-drive-plugin'
  )
  const plugin = await createGoogleDrivePlugin(options)
  await pluginManager.loadPlugin(plugin)
}
