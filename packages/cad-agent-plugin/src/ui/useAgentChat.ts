import { Chat } from '@ai-sdk/vue'
import { shallowRef } from 'vue'

import {
  type AgentChatOptions,
  createAgentChatTransport,
  createCadAgent
} from '../agent/createCadAgent'
import type { AgentMode } from '../storage/AgentModeStore'
import type { LlmSettings } from '../storage/LlmSettingsStore'

/** Settings and runtime options passed into each chat session. */
export interface AgentChatSessionConfig {
  settings: LlmSettings
  options: AgentChatOptions
}

/**
 * Creates a Vue {@link Chat} instance wired to the in-process CAD agent.
 *
 * @param getConfig - Callback returning LLM settings and agent options for each request.
 * @returns A new chat session with CAD drawing tools.
 */
export function createAgentChat(getConfig: () => AgentChatSessionConfig) {
  return new Chat({
    transport: createAgentChatTransport(
      () => createCadAgent({ ...getConfig().settings }),
      () => ({ ...getConfig().settings }),
      () => ({ ...getConfig().options })
    )
  })
}

/**
 * Holds a replaceable chat ref so settings changes can reset the session.
 *
 * @param getConfig - Callback returning current session config (e.g. from Vue refs).
 * @returns `chat` — shallow ref to the active session; `resetChat` — recreate after settings save.
 */
export function useAgentChatRef(getConfig: () => AgentChatSessionConfig) {
  const chat = shallowRef(createAgentChat(getConfig))

  /** Discards the current session and builds a new agent from latest settings. */
  const resetChat = () => {
    chat.value = createAgentChat(getConfig)
  }

  return { chat, resetChat }
}

/** Convenience helper for callers that only need agent mode alongside LLM settings. */
export function createAgentChatOptions(agentMode: AgentMode): AgentChatOptions {
  return { agentMode }
}
