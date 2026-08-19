import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import { registerAgentI18n } from './i18n'

/** Registered name of the CAD Agent plugin in the plugin manager. */
export const AGENT_PLUGIN_NAME = 'AgentPlugin'

/** Trigger commands handled by {@link AGENT_PLUGIN_NAME}. */
export const AGENT_PLUGIN_TRIGGERS = ['agent'] as const

/**
 * Registers the CAD Agent plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-agent-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
export function registerLazyAgentPlugin(
  pluginManager: AcApPluginManager
): void {
  registerAgentI18n()

  pluginManager.registerLazyPlugin({
    name: AGENT_PLUGIN_NAME,
    triggers: [...AGENT_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createAgentPlugin } = await import('@mlightcad/cad-agent-plugin')
      return createAgentPlugin()
    }
  })
}

export { mergeAgentI18nIntoVueI18n, registerAgentI18n } from './i18n'
export {
  openAgentPalette,
  setAgentPaletteOpener
} from './palette/agentPaletteIntegration'
export type { AgentPaletteOpener } from './palette/agentPaletteIntegration'
