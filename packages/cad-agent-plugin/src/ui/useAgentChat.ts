import { Chat } from '@ai-sdk/vue'
import { shallowRef } from 'vue'

import {
  createAgentChatTransport,
  createCadAgent
} from '../agent/createCadAgent'
import type { LlmSettings } from '../storage/LlmSettingsStore'

/**
 * Creates a Vue {@link Chat} instance wired to the in-process CAD agent.
 *
 * @param getSettings - Callback returning the saved LLM configuration for each request.
 * @returns A new chat session with CAD drawing tools.
 */
export function createAgentChat(getSettings: () => LlmSettings) {
  return new Chat({
    transport: createAgentChatTransport(() =>
      createCadAgent({ ...getSettings() })
    )
  })
}

/**
 * Holds a replaceable chat ref so settings changes can reset the session.
 *
 * @param getSettings - Callback returning current LLM settings (e.g. from a Vue ref).
 * @returns `chat` — shallow ref to the active session; `resetChat` — recreate after settings save.
 */
export function useAgentChatRef(getSettings: () => LlmSettings) {
  const chat = shallowRef(createAgentChat(getSettings))

  /** Discards the current session and builds a new agent from latest settings. */
  const resetChat = () => {
    chat.value = createAgentChat(getSettings)
  }

  return { chat, resetChat }
}
