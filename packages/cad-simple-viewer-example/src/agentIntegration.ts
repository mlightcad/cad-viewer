import {
  agentT,
  setAgentPaletteOpener,
  setCadScriptPaletteOpener
} from '@mlightcad/cad-agent-plugin/register'
import type { AcApSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'
import { createApp } from 'vue'

export const AGENT_DOCK_TAB_ID = 'agent'
export const SCRIPT_DOCK_TAB_ID = 'cad-script'

/**
 * Wires the agent chat and the manual script console to dock tabs.
 */
export function setupAgentIntegration(plugin: AcApSimpleUiPlugin): void {
  const ensureAgentMount = createLazyMount(async mountEl => {
    await import('@mlightcad/cad-agent-plugin/style.css')
    const { AgentChatPanel } = await import('@mlightcad/cad-agent-plugin')
    createApp(AgentChatPanel, { embedded: true }).mount(mountEl)
  })
  const ensureScriptMount = createLazyMount(async mountEl => {
    await import('@mlightcad/cad-agent-plugin/style.css')
    const { CadScriptPanel } = await import('@mlightcad/cad-agent-plugin')
    createApp(CadScriptPanel).mount(mountEl)
  })

  setAgentPaletteOpener(() => {
    void ensureAgentMount().then(mountEl =>
      toggleDockTab(plugin, AGENT_DOCK_TAB_ID, 'Agent', mountEl)
    )
  })
  setCadScriptPaletteOpener(() => {
    void ensureScriptMount().then(mountEl =>
      toggleDockTab(plugin, SCRIPT_DOCK_TAB_ID, agentT('scriptTab'), mountEl)
    )
  })
}

/**
 * Creates the dock mount element the first time the opener runs.
 *
 * @param mountApp - Mounts a Vue app into the new element.
 * @returns A function that resolves to the mounted element.
 */
function createLazyMount(
  mountApp: (mountEl: HTMLElement) => Promise<void>
): () => Promise<HTMLElement> {
  let mountEl: HTMLElement | null = null
  let mountPromise: Promise<HTMLElement> | null = null

  return () => {
    if (mountEl) return Promise.resolve(mountEl)
    if (!mountPromise) {
      mountPromise = (async () => {
        const el = document.createElement('div')
        el.className = 'cad-agent-dock-mount'
        el.style.height = '100%'
        el.style.minHeight = '0'
        el.style.display = 'flex'
        el.style.flexDirection = 'column'
        await mountApp(el)
        mountEl = el
        return el
      })()
    }
    return mountPromise
  }
}

/**
 * Opens a dock tab, or toggles it when it is already registered.
 *
 * @param plugin - Simple UI plugin that owns the dock.
 * @param id - Stable tab id.
 * @param label - Tab label in the current locale.
 * @param content - Mounted panel element.
 */
function toggleDockTab(
  plugin: AcApSimpleUiPlugin,
  id: string,
  label: string,
  content: HTMLElement
) {
  if (plugin.hasDockPanelTab(id)) {
    plugin.toggleDockPanelTab(id)
    return
  }

  plugin.addDockPanelTab({
    id,
    label,
    content
  })
}
