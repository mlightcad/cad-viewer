/** Agent execution mode for the CAD drawing assistant. */
export type AgentMode = 'simple' | 'high-inference'

const STORAGE_KEY = 'cad-agent-plugin.agent-mode'

const DEFAULT_MODE: AgentMode = 'high-inference'

/** Loads the persisted agent mode from `localStorage`. */
export function loadAgentMode(): AgentMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'simple' || raw === 'high-inference') {
      return raw
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_MODE
}

/** Persists the selected agent mode to `localStorage`. */
export function saveAgentMode(mode: AgentMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
}
