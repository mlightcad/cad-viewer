import {
  type AcApPluginManager,
  AcApUiRegistry
} from '@mlightcad/cad-simple-viewer'

import { agentLocaleMessages, registerAgentI18n } from './i18n'
import { AGENT_ICON } from './ui/icons'

/** Registered name of the CAD Agent plugin in the plugin manager. */
export const AGENT_PLUGIN_NAME = 'AgentPlugin'

/** Trigger commands handled by {@link AGENT_PLUGIN_NAME}. */
export const AGENT_PLUGIN_TRIGGERS = ['agent'] as const

/**
 * Registers the CAD Agent plugin for lazy loading.
 *
 * The agent reads its model from the shared AI model settings, so hosts also
 * call `registerLazyLlmPlugin` from `@mlightcad/cad-llm-plugin/register`,
 * which provides the settings dialog (`llmsettings`) and the LLM text
 * recognizer.
 *
 * Import from `@mlightcad/cad-agent-plugin/register` so the main bundle
 * is not pulled into the application entry chunk.
 */
/**
 * Mounts the chat panel into a host palette tab.
 *
 * @param container - Element the host provides for this tab.
 * @returns A function that unmounts the panel.
 */
async function mountAgentPalette(container: HTMLElement) {
  await import('@mlightcad/cad-agent-plugin/style.css')
  const [{ createApp }, { AgentChatPanel }] = await Promise.all([
    import('vue'),
    import('@mlightcad/cad-agent-plugin')
  ])
  const app = createApp(AgentChatPanel, { embedded: true })
  app.mount(container)
  return () => {
    app.unmount()
  }
}

export function registerLazyAgentPlugin(
  pluginManager: AcApPluginManager
): void {
  registerAgentI18n()

  AcApUiRegistry.register({
    plugin: AGENT_PLUGIN_NAME,
    messages: agentLocaleMessages(),
    ribbonGroups: [
      {
        id: 'ai-agent',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.agent',
        placement: 'start',
        order: 0,
        items: [
          {
            id: 'cmd-agent',
            command: 'agent',
            labelKey: 'main.ribbon.command.agent',
            tooltipKey: 'main.ribbon.tooltip.agent',
            iconSvg: AGENT_ICON,
            size: 'large',
            toolbar: { after: 'layout' }
          }
        ]
      }
    ],
    palettes: [
      {
        id: 'agent',
        titleKey: 'main.toolPalette.agent.tab',
        headerTitleKey: 'main.toolPalette.agent.title',
        mount: mountAgentPalette
      }
    ]
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
