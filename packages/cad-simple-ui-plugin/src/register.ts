import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import type { AcUiSimpleUiPluginOptions } from './config/types'

/**
 * Loads the simple UI plugin on the given plugin manager.
 *
 * Import from `@mlightcad/cad-simple-ui-plugin/register` so the main plugin
 * bundle is not pulled into the application entry chunk.
 *
 * @param pluginManager - Target plugin manager instance.
 * @param options - Passed through to {@link acuiCreateSimpleUiPlugin}.
 */
export async function acuiRegisterSimpleUiPlugin(
  pluginManager: AcApPluginManager,
  options: AcUiSimpleUiPluginOptions = {}
): Promise<void> {
  const { acuiCreateSimpleUiPlugin } =
    await import('@mlightcad/cad-simple-ui-plugin')
  await pluginManager.loadPlugin(acuiCreateSimpleUiPlugin(options))
}
