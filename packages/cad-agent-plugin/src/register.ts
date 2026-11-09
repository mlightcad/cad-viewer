import {
  type AcApPluginManager,
  AcApTextRecognitionService
} from '@mlightcad/cad-simple-viewer'

import { registerAgentI18n } from './i18n'

/** Registered name of the CAD Agent plugin in the plugin manager. */
export const AGENT_PLUGIN_NAME = 'AgentPlugin'

/** Trigger commands handled by {@link AGENT_PLUGIN_NAME}. */
export const AGENT_PLUGIN_TRIGGERS = ['agent'] as const

/**
 * Registers the CAD Agent plugin for lazy loading, and its LLM-backed text
 * recognizer in `AcApTextRecognitionService`.
 *
 * Import from `@mlightcad/cad-agent-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
export function registerLazyAgentPlugin(
  pluginManager: AcApPluginManager
): void {
  registerAgentI18n()

  // OCR for features such as `pdftext`. The recognizer chunk loads on first
  // use and answers `undefined` until a vision-capable model is configured.
  AcApTextRecognitionService.register({
    id: 'cad-agent',
    recognize: async request => {
      const { acapAgentRecognizeText } = await import(
        '@mlightcad/cad-agent-plugin'
      )
      return acapAgentRecognizeText(request)
    }
  })

  pluginManager.registerLazyPlugin({
    name: AGENT_PLUGIN_NAME,
    triggers: [...AGENT_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createAgentPlugin } = await import('@mlightcad/cad-agent-plugin')
      return createAgentPlugin()
    }
  })
}

export { agentT, mergeAgentI18nIntoVueI18n, registerAgentI18n } from './i18n'
export {
  openAgentPalette,
  setAgentPaletteOpener
} from './palette/agentPaletteIntegration'
export type { AgentPaletteOpener } from './palette/agentPaletteIntegration'
