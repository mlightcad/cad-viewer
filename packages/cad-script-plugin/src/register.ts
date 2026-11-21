import {
  type AcApPluginManager,
  AcApUiRegistry
} from '@mlightcad/cad-simple-viewer'

import { registerScriptI18n, scriptLocaleMessages } from './i18n'
import { SCRIPT_ICON } from './ui/icons'

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
/**
 * Mounts the script console into a host palette tab.
 *
 * @param container - Element the host provides for this tab.
 * @returns A function that destroys the console.
 */
async function mountScriptPalette(container: HTMLElement) {
  await import('@mlightcad/cad-script-plugin/style.css')
  const { CadScriptPanel } = await import('@mlightcad/cad-script-plugin')
  const panel = new CadScriptPanel()
  container.append(panel.element)
  return () => {
    panel.destroy()
  }
}

export function registerLazyCadScriptPlugin(
  pluginManager: AcApPluginManager
): void {
  registerScriptI18n()

  AcApUiRegistry.register({
    plugin: CAD_SCRIPT_PLUGIN_NAME,
    messages: scriptLocaleMessages(),
    ribbonGroups: [
      {
        id: 'home-utilities',
        tabId: 'home',
        merge: true,
        items: [
          {
            id: 'cmd-cadscript',
            command: 'cadscript',
            labelKey: 'main.ribbon.command.script',
            tooltipKey: 'main.ribbon.tooltip.script',
            iconSvg: SCRIPT_ICON,
            size: 'large',
            toolbar: { after: 'layout' }
          }
        ]
      }
    ],
    palettes: [
      {
        id: 'cadScript',
        titleKey: 'main.toolPalette.script.scriptTab',
        headerTitleKey: 'main.toolPalette.script.scriptTitle',
        mount: mountScriptPalette
      }
    ]
  })

  pluginManager.registerLazyPlugin({
    name: CAD_SCRIPT_PLUGIN_NAME,
    triggers: [...CAD_SCRIPT_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createCadScriptPlugin } =
        await import('@mlightcad/cad-script-plugin')
      return createCadScriptPlugin()
    }
  })
}

export { mergeScriptI18nIntoVueI18n, registerScriptI18n, scriptT } from './i18n'
export {
  openCadScriptPalette,
  setCadScriptPaletteOpener
} from './palette/scriptPaletteIntegration'
export type { CadScriptPaletteOpener } from './palette/scriptPaletteIntegration'
