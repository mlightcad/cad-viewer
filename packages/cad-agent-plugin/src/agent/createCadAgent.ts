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
import {
  type AgentContextUsage,
  buildAgentContextUsage
} from './contextUsage'
import { extractConversationContext } from './conversationContext'
import { createModelFromSettings } from './createModel'
import { captureDrawingPreview } from './drawingPreviewCapture'
import {
  buildVerificationFeedbackMessage,
  MAX_VERIFICATION_ATTEMPTS,
  verifyDrawing
} from './drawingVerifier'
import { normalizeInlineFileData } from './normalizeInlineFileData'
import { skipDataUrlDownload } from './skipDataUrlDownload'
import { buildCadAgentSystemPrompt } from './systemPrompt'
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
  /**
   * When `high-inference`, screenshot verification runs after rounds that
   * invoked CAD tools (skipped when the agent only replied with text).
   */
  agentMode: AgentMode
  /**
   * Called after each agent round with the last model step's prompt tokens so
   * the UI can update the context-usage ring.
   */
  onContextUsage?: (usage: AgentContextUsage) => void
}

/**
 * Max model↔tool steps in one `agent.stream` (one user turn).
 * Query / edit tasks often need many successive `execute_cad_script` calls;
 * the old limit of 10 ran out too quickly.
 */
export const MAX_AGENT_STEPS_SIMPLE = 50
/** High inference allows longer incremental draw + fix loops. */
export const MAX_AGENT_STEPS_HIGH = 80

/**
 * Builds an AI SDK agent configured for CAD drawing with tool calling.
 *
 * @param settings - LLM provider credentials and model selection.
 * @param options - Runtime options (agent mode controls screenshots / verification).
 * @returns An agent that streams responses and can invoke {@link createCadTools}.
 */
export function createCadAgent(
  settings: LlmSettings,
  options: AgentChatOptions = { agentMode: 'simple' }
) {
  const maxSteps =
    options.agentMode === 'high-inference'
      ? MAX_AGENT_STEPS_HIGH
      : MAX_AGENT_STEPS_SIMPLE
  return new Agent({
    model: createModelFromSettings(settings),
    system: buildCadAgentSystemPrompt(options.agentMode),
    tools: createCadTools({ agentMode: options.agentMode }),
    stopWhen: stepCountIs(maxSteps)
  })
}

/** Extracts tool name/description/schema text for context-usage estimates. */
function toolDefsForContextUsage(tools: Agent['tools']) {
  return Object.entries(tools).map(([name, value]) => {
    const tool = value as {
      description?: string
      inputSchema?: unknown
      parameters?: unknown
    }
    let schemaText = ''
    try {
      schemaText = JSON.stringify(tool.inputSchema ?? tool.parameters ?? '')
    } catch {
      schemaText = String(tool.inputSchema ?? tool.parameters ?? '')
    }
    return {
      name,
      description: tool.description,
      schemaText
    }
  })
}

async function streamAgentRound(options: {
  agent: Agent
  workingMessages: UIMessage[]
  abortSignal: AbortSignal | undefined
  write: UIMessageChunkWriter
  systemPrompt: string
  onContextUsage?: (usage: AgentContextUsage) => void
}): Promise<UIMessage[]> {
  const {
    agent,
    workingMessages,
    abortSignal,
    write,
    systemPrompt,
    onContextUsage
  } = options
  const modelMessages = normalizeInlineFileData(
    await convertToModelMessages(workingMessages, {
      tools: agent.tools,
      // Incomplete tool calls (e.g. input-streaming cut off) must not poison the
      // next round's prompt — especially after a huge script arg failed mid-stream.
      ignoreIncompleteToolCalls: true
    })
  )
  const tools = toolDefsForContextUsage(agent.tools)
  const reportContextUsage = (
    usage: {
      inputTokens: number | undefined
      outputTokens: number | undefined
    },
    messages: UIMessage[]
  ) => {
    if (abortSignal?.aborted || !onContextUsage) return
    const usedTokens = usage.inputTokens
    if (typeof usedTokens !== 'number' || !Number.isFinite(usedTokens)) return
    onContextUsage(
      buildAgentContextUsage({
        usedTokens,
        outputTokens:
          typeof usage.outputTokens === 'number'
            ? usage.outputTokens
            : undefined,
        systemPrompt,
        tools,
        messages
      })
    )
  }

  // Agent.stream typings omit streamText extras; options are forwarded at runtime.
  const result = agent.stream({
    prompt: modelMessages,
    abortSignal,
    // Skip redundant fetch of inline image data URLs (can stall large attachments).
    experimental_download: skipDataUrlDownload,
    // Update the ring after every model step (not only when the round ends).
    onStepFinish: ({ usage }) => {
      reportContextUsage(usage, workingMessages)
    }
  } as Parameters<Agent['stream']>[0])

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

  // Final pass with the completed transcript so tool results land in Conversation.
  if (onContextUsage && !abortSignal?.aborted) {
    try {
      reportContextUsage(await result.usage, finishedMessages)
    } catch {
      // Usage may reject when the stream produced no steps; leave prior UI state.
    }
  }

  return finishedMessages
}

/** Counts CAD tool-call parts in UI messages (e.g. `tool-execute_cad_script`). */
function countCadToolParts(messages: UIMessage[]): number {
  let count = 0
  for (const message of messages) {
    if (!message.parts?.length) continue
    for (const part of message.parts) {
      if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
        count += 1
      }
    }
  }
  return count
}

/**
 * Creates a {@link ChatTransport} that runs the agent in-process (no HTTP server).
 *
 * In high-inference mode, after a round that invoked CAD tools, captures a
 * drawing screenshot and loops until verification passes or
 * {@link MAX_VERIFICATION_ATTEMPTS} is reached. An initial text-only round
 * (e.g. clarifying questions) skips verification; once retries have started,
 * text-only turns still consume the attempt budget instead of exiting early.
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
            const { agentMode, onContextUsage } = getOptions()
            const systemPrompt = buildCadAgentSystemPrompt(agentMode)

            if (agentMode === 'simple') {
              await streamAgentRound({
                agent,
                workingMessages,
                abortSignal,
                write,
                systemPrompt,
                onContextUsage
              })
              return
            }

            const settings = getSettings()
            const { userRequest, referenceImages } =
              extractConversationContext(validatedMessages)
            let verificationAttempts = 0

            while (!abortSignal?.aborted) {
              const toolPartsBefore = countCadToolParts(workingMessages)
              workingMessages = await streamAgentRound({
                agent,
                workingMessages,
                abortSignal,
                write,
                systemPrompt,
                onContextUsage
              })

              if (abortSignal?.aborted) break

              // Skip screenshot verification when the first round is text-only
              // (clarifying questions). After a failed verification, a text-only
              // turn must not abandon the loop — keep consuming the retry budget.
              if (countCadToolParts(workingMessages) <= toolPartsBefore) {
                if (verificationAttempts === 0) {
                  break
                }

                verificationAttempts += 1
                if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
                  appendAssistantText(
                    write,
                    `\n${agentT('verificationMaxAttempts')}`
                  )
                  break
                }

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
                          'No execute_cad_script call was made. Please apply a corrective script for the outstanding verification feedback.'
                        )
                      }
                    ]
                  }
                ]
                continue
              }

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
