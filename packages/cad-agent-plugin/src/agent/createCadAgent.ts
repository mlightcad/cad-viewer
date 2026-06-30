import {
  type ChatTransport,
  convertToModelMessages,
  Experimental_Agent as Agent,
  stepCountIs,
  type UIMessage,
  validateUIMessages
} from 'ai'

import type { LlmSettings } from '../storage/LlmSettingsStore'
import { createCadTools } from '../tools/cadTools'
import { createModelFromSettings } from './createModel'
import { CAD_AGENT_SYSTEM_PROMPT } from './systemPrompt'

/**
 * Builds an AI SDK agent configured for CAD drawing with tool calling.
 *
 * @param settings - LLM provider credentials and model selection.
 * @returns An agent that streams responses and can invoke {@link createCadTools}.
 */
export function createCadAgent(settings: LlmSettings) {
  return new Agent({
    model: createModelFromSettings(settings),
    system: CAD_AGENT_SYSTEM_PROMPT,
    tools: createCadTools(),
    stopWhen: stepCountIs(10)
  })
}

/**
 * Creates a {@link ChatTransport} that runs the agent in-process (no HTTP server).
 *
 * Validates UI messages, converts them to model messages, and streams UI chunks
 * directly from the agent rather than over SSE.
 *
 * @param getAgent - Factory invoked per request so settings changes take effect after reset.
 * @returns A transport compatible with `@ai-sdk/vue` {@link Chat}.
 */
export function createAgentChatTransport(
  getAgent: () => Agent
): ChatTransport<UIMessage> {
  return {
    /** Validates messages, streams the agent, and yields UI message chunks. */
    sendMessages: async ({ messages, abortSignal }) => {
      const agent = getAgent()
      const validatedMessages = await validateUIMessages({
        messages,
        tools: agent.tools
      })
      const modelMessages = await convertToModelMessages(validatedMessages, {
        tools: agent.tools
      })
      const result = agent.stream({
        prompt: modelMessages,
        abortSignal
      })
      // Return UI message chunks directly — not HTTP SSE from respond().body.
      return result.toUIMessageStream({
        originalMessages: validatedMessages
      })
    },
    /** In-process transport does not support stream reconnection. */
    reconnectToStream: async () => null
  }
}
