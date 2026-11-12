import type { AcUiSimpleUiPluginOptions } from './config/types'
import { SIMPLE_UI_PLUGIN_NAME } from './config/types'
import {
  type AcApSimpleUiPlugin,
  acuiCreateSimpleUiPlugin
} from './createSimpleUiPlugin'
import { AcApDocManager, type AcApPluginManager } from './deps'

/**
 * Loads the built-in simple UI chrome into a plugin manager.
 *
 * Prefer {@link AcApDocManagerOptions.simpleUi} for new embeds; this helper
 * remains for hosts that manage plugins explicitly.
 */
export async function acuiRegisterSimpleUiPlugin(
  pluginManager: AcApPluginManager,
  options: AcUiSimpleUiPluginOptions = {}
): Promise<AcApSimpleUiPlugin> {
  const existing = pluginManager.getPlugin(SIMPLE_UI_PLUGIN_NAME) as
    | AcApSimpleUiPlugin
    | undefined
  if (existing) {
    AcApDocManager.tryGetInstance()?.bindSimpleUiPlugin(existing)
    return existing
  }

  const plugin = acuiCreateSimpleUiPlugin(options)
  await pluginManager.loadPlugin(plugin)
  AcApDocManager.tryGetInstance()?.bindSimpleUiPlugin(plugin)
  return plugin
}

/** @deprecated Use {@link acuiRegisterSimpleUiPlugin}. */
export const registerSimpleUiPlugin = acuiRegisterSimpleUiPlugin
