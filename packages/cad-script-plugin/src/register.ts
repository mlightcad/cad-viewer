import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import { registerScriptI18n } from './i18n'

/** Registered name of the CAD script plugin in the plugin manager. */
export const CAD_SCRIPT_PLUGIN_NAME = 'CadScriptPlugin'

/** Trigger commands handled by {@link CAD_SCRIPT_PLUGIN_NAME}. */
export const CAD_SCRIPT_PLUGIN_TRIGGERS = ['cadscript'] as const

/**
 * Registers the CAD script plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-script-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
export function registerLazyCadScriptPlugin(
  pluginManager: AcApPluginManager
): void {
  registerScriptI18n()

  pluginManager.registerLazyPlugin({
    name: CAD_SCRIPT_PLUGIN_NAME,
    triggers: [...CAD_SCRIPT_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createCadScriptPlugin } = await import(
        '@mlightcad/cad-script-plugin'
      )
      return createCadScriptPlugin()
    }
  })
}

export {
  mergeScriptI18nIntoVueI18n,
  registerScriptI18n,
  scriptT
} from './i18n'
export {
  openCadScriptPalette,
  setCadScriptPaletteOpener
} from './palette/scriptPaletteIntegration'
export type { CadScriptPaletteOpener } from './palette/scriptPaletteIntegration'
