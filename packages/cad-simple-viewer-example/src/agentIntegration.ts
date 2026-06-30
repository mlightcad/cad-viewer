import { setAgentPaletteOpener } from '@mlightcad/cad-agent-plugin/register'
import type { AcApSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'
import { createApp } from 'vue'

export const AGENT_DOCK_TAB_ID = 'agent'

/**
 * Wires the agent palette opener to a lazy-loaded dock tab in simple-ui.
 */
export function setupAgentIntegration(plugin: AcApSimpleUiPlugin): void {
  let agentMountEl: HTMLElement | null = null
  let mountPromise: Promise<HTMLElement> | null = null

  const ensureAgentMount = (): Promise<HTMLElement> => {
    if (agentMountEl) {
      return Promise.resolve(agentMountEl)
    }

    if (!mountPromise) {
      mountPromise = (async () => {
        await import('@mlightcad/cad-agent-plugin/style.css')

        const mountEl = document.createElement('div')
        mountEl.className = 'cad-agent-dock-mount'
        mountEl.style.height = '100%'
        mountEl.style.minHeight = '0'
        mountEl.style.display = 'flex'
        mountEl.style.flexDirection = 'column'

        const { AgentChatPanel } = await import('@mlightcad/cad-agent-plugin')
        createApp(AgentChatPanel, { embedded: true }).mount(mountEl)
        agentMountEl = mountEl
        return mountEl
      })()
    }

    return mountPromise
  }

  setAgentPaletteOpener(() => {
    void ensureAgentMount().then(mountEl => toggleAgentDock(plugin, mountEl))
  })
}

function toggleAgentDock(
  plugin: AcApSimpleUiPlugin,
  agentMountEl: HTMLElement
) {
  if (plugin.hasDockPanelTab(AGENT_DOCK_TAB_ID)) {
    plugin.toggleDockPanelTab(AGENT_DOCK_TAB_ID)
    return
  }

  plugin.addDockPanelTab({
    id: AGENT_DOCK_TAB_ID,
    label: 'Agent',
    content: agentMountEl
  })
}
