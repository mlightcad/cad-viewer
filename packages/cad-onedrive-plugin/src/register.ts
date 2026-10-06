import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import type { AcApOneDrivePluginOptions } from './AcApOneDrivePlugin'

/** Eager plugin name for OneDrive data source. */
export const ONEDRIVE_PLUGIN_NAME = 'OneDrivePlugin'

/**
 * Registers and eagerly loads the OneDrive data-source plugin.
 *
 * Eager load is required so Open menus list OneDrive immediately. MSAL is still
 * loaded lazily inside sign-in / pick.
 *
 * Import from `@mlightcad/cad-onedrive-plugin/register` when you only need
 * registration from the app entry.
 *
 * @param pluginManager - Plugin manager that receives the plugin
 * @param options - Azure SPA client configuration (`clientId` required)
 */
export async function registerOneDrivePlugin(
  pluginManager: AcApPluginManager,
  options: AcApOneDrivePluginOptions
): Promise<void> {
  if (!options.clientId) {
    throw new Error('registerOneDrivePlugin requires options.clientId')
  }
  const { createOneDrivePlugin } = await import('@mlightcad/cad-onedrive-plugin')
  const plugin = await createOneDrivePlugin(options)
  await pluginManager.loadPlugin(plugin)
}
