import {
  type ChatTransport,
  convertToModelMessages,
  Experimental_Agent as Agent,
  generateId,
  type InferUIMessageChunk,
  stepCountIs,
  type UIMessage,
  validateUIMessages
} from 'ai'

import { agentT } from '../i18n'
import type { AgentMode } from '../storage/AgentModeStore'
import type { LlmSettings } from '../storage/LlmSettingsStore'
import { createCadTools } from '../tools/cadTools'
import { formatChatError } from '../ui/formatChatError'
import { extractConversationContext } from './conversationContext'
import { createModelFromSettings } from './createModel'
import { captureDrawingPreview } from './drawingPreviewCapture'
import {
  buildVerificationFeedbackMessage,
  MAX_VERIFICATION_ATTEMPTS,
  verifyDrawing
} from './drawingVerifier'
import { CAD_AGENT_SYSTEM_PROMPT } from './systemPrompt'
import {
  appendAssistantText,
  appendVerificationReview,
  type UIMessageChunkWriter
} from './uiMessageStreamHelpers'

function wasAborted(
  abortSignal: AbortSignal | undefined,
  error?: unknown
): boolean {
  if (abortSignal?.aborted) return true
  return error instanceof Error && error.name === 'AbortError'
}

/** Runtime options that affect agent behavior beyond LLM settings. */
export interface AgentChatOptions {
  /** When `high-inference`, screenshot verification runs after each drawing round. */
  agentMode: AgentMode
}

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
 * Streams one agent round and returns the updated UI messages when finished.
 */
async function streamAgentRound(options: {
  agent: Agent
  workingMessages: UIMessage[]
  abortSignal: AbortSignal | undefined
  write: UIMessageChunkWriter
}): Promise<UIMessage[]> {
  const { agent, workingMessages, abortSignal, write } = options
  const modelMessages = await convertToModelMessages(workingMessages, {
    tools: agent.tools
  })
  const result = agent.stream({
    prompt: modelMessages,
    abortSignal
  })

  let finishedMessages = workingMessages
  const uiStream = result.toUIMessageStream({
    originalMessages: workingMessages,
    onFinish: ({ messages }) => {
      finishedMessages = messages
    },
    onError: error =>
      error instanceof Error ? formatChatError(error) : String(error)
  })

  for await (const chunk of uiStream) {
    write(chunk)
  }

  return finishedMessages
}

/**
 * Creates a {@link ChatTransport} that runs the agent in-process (no HTTP server).
 *
 * In high-inference mode, captures a drawing screenshot after each agent round
 * and loops until verification passes or {@link MAX_VERIFICATION_ATTEMPTS} is reached.
 */
export function createAgentChatTransport(
  getAgent: () => Agent,
  getSettings: () => LlmSettings,
  getOptions: () => AgentChatOptions
): ChatTransport<UIMessage> {
  return {
    sendMessages: async ({ messages, abortSignal }) => {
      const agent = getAgent()
      const validatedMessages = await validateUIMessages({
        messages,
        tools: agent.tools
      })

      return new ReadableStream<InferUIMessageChunk<UIMessage>>({
        async start(controller) {
          const write: UIMessageChunkWriter = chunk => {
            controller.enqueue(chunk)
          }

          try {
            let workingMessages = validatedMessages
            const { agentMode } = getOptions()

            if (agentMode === 'simple') {
              await streamAgentRound({
                agent,
                workingMessages,
                abortSignal,
                write
              })
              return
            }

            const settings = getSettings()
            const { userRequest, referenceImages } =
              extractConversationContext(validatedMessages)
            let verificationAttempts = 0

            while (!abortSignal?.aborted) {
              workingMessages = await streamAgentRound({
                agent,
                workingMessages,
                abortSignal,
                write
              })

              if (abortSignal?.aborted) break

              verificationAttempts += 1

              const preview = await captureDrawingPreview()
              if (!preview.ok) {
                appendVerificationReview(write, {
                  title: agentT('verificationTitle'),
                  attempt: verificationAttempts,
                  maxAttempts: MAX_VERIFICATION_ATTEMPTS,
                  statusText: `${agentT('verificationSkipped')}: ${preview.reason}`,
                  referenceImages,
                  referenceLabel: agentT('referenceImages'),
                  drawingLabel: agentT('drawingScreenshot')
                })
                break
              }

              appendVerificationReview(write, {
                title: agentT('verificationTitle'),
                attempt: verificationAttempts,
                maxAttempts: MAX_VERIFICATION_ATTEMPTS,
                statusText: agentT('verifying'),
                referenceImages,
                referenceLabel: agentT('referenceImages'),
                drawingLabel: agentT('drawingScreenshot'),
                drawingDataUrl: preview.dataUrl
              })

              let verification
              try {
                verification = await verifyDrawing(
                  settings,
                  userRequest,
                  referenceImages,
                  preview.dataUrl,
                  abortSignal
                )
              } catch (error) {
                if (wasAborted(abortSignal, error)) break
                appendAssistantText(
                  write,
                  `\n${agentT('verificationError')}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                )
                break
              }

              if (abortSignal?.aborted) break

              if (verification.passed) {
                appendAssistantText(write, `\n${agentT('verificationPassed')}`)
                break
              }

              if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
                appendAssistantText(
                  write,
                  `\n${agentT('verificationMaxAttempts')}\n\n${verification.feedback.trim()}`
                )
                break
              }

              appendAssistantText(
                write,
                `\n${agentT('verificationFailed')}\n${verification.feedback.trim()}\n\n${agentT('verificationContinuing')}`
              )

              workingMessages = [
                ...workingMessages,
                {
                  id: generateId(),
                  role: 'user',
                  parts: [
                    {
                      type: 'text',
                      text: buildVerificationFeedbackMessage(
                        verificationAttempts,
                        MAX_VERIFICATION_ATTEMPTS,
                        verification.feedback
                      )
                    }
                  ]
                }
              ]
            }
          } catch (error) {
            if (wasAborted(abortSignal, error)) return
            controller.enqueue({
              type: 'error',
              errorText:
                error instanceof Error ? formatChatError(error) : String(error)
            })
          } finally {
            controller.close()
          }
        }
      })
    },
    reconnectToStream: async () => null
  }
}
