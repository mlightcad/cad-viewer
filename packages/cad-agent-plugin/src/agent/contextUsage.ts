import type { UIMessage } from 'ai'

/**
 * Context-window size and usage helpers for the agent chat UI ring.
 *
 * Providers report prompt tokens on each model step; the last step's
 * `inputTokens` is the best available proxy for how full the context window is.
 * Category counts are estimated locally, then scaled so they sum to that total.
 */

/** Default when the active model is unknown or unlisted. */
export const DEFAULT_CONTEXT_WINDOW = 128_000

/** Categories that can appear in the CAD agent context breakdown. */
export type AgentContextUsageCategoryId =
  | 'system'
  | 'tools'
  | 'images'
  | 'conversation'

/** One row in the context-usage breakdown (only present when tokens > 0). */
export interface AgentContextUsageCategory {
  id: AgentContextUsageCategoryId
  /** Estimated / scaled token count for this category. */
  tokens: number
  /** Segment color matching the popover bar. */
  color: string
}

/** Snapshot of context usage reported after an agent step/round. */
export interface AgentContextUsage {
  /** Tokens currently filling the context window (last-step prompt tokens). */
  usedTokens: number
  /** Optional completion tokens from the last step (for detail tooltips). */
  outputTokens?: number
  /** Non-empty category rows for the popover (agent-relevant only). */
  breakdown: AgentContextUsageCategory[]
}

/** Inputs used to estimate a per-category breakdown. */
export interface AgentContextUsageEstimateInput {
  /** Provider-reported prompt tokens for the current step. */
  usedTokens: number
  /** System prompt text sent to the model. */
  systemPrompt: string
  /** Tool name → description (and optional schema text) for definition size. */
  tools: ReadonlyArray<{
    name: string
    description?: string
    /** Optional JSON-ish schema text; improves tool-definition estimates. */
    schemaText?: string
  }>
  /** Conversation messages included in the prompt. */
  messages: UIMessage[]
}

/** Cursor-like palette for categories the CAD agent actually has. */
export const CONTEXT_USAGE_CATEGORY_COLORS: Record<
  AgentContextUsageCategoryId,
  string
> = {
  system: '#8b8b8b',
  tools: '#a78bfa',
  images: '#38bdf8',
  conversation: '#9f1239'
}

/**
 * Known / heuristic context windows keyed by model-id substrings (first match
 * wins). Keep entries specific-before-generic within each family.
 */
const CONTEXT_WINDOW_RULES: ReadonlyArray<{
  pattern: RegExp
  tokens: number
}> = [
  // Anthropic
  { pattern: /claude-opus-4|claude-sonnet-4|claude-haiku-4/i, tokens: 200_000 },
  { pattern: /claude-(opus|sonnet|haiku|fable)-5/i, tokens: 200_000 },
  { pattern: /claude-3/i, tokens: 200_000 },
  { pattern: /claude/i, tokens: 200_000 },
  // OpenAI
  { pattern: /gpt-5\.6|gpt-5\.5|gpt-5\.4/i, tokens: 400_000 },
  { pattern: /gpt-5/i, tokens: 400_000 },
  { pattern: /gpt-4\.1/i, tokens: 1_047_576 },
  { pattern: /gpt-4o/i, tokens: 128_000 },
  { pattern: /o3|o4-mini/i, tokens: 200_000 },
  // DeepSeek
  { pattern: /deepseek-v4|deepseek-reasoner|deepseek-chat/i, tokens: 128_000 },
  { pattern: /deepseek-vl/i, tokens: 32_768 },
  { pattern: /deepseek/i, tokens: 128_000 },
  // Common gateways
  { pattern: /gemini.*pro|gemini-2/i, tokens: 1_000_000 },
  { pattern: /gemini/i, tokens: 128_000 },
  { pattern: /qwen.*(plus|max|turbo)/i, tokens: 128_000 },
  { pattern: /kimi/i, tokens: 128_000 }
]

/** Rough per-image token cost when vision images are in the prompt. */
const IMAGE_TOKEN_ESTIMATE = 765

/**
 * Resolves the context window size for a model id.
 *
 * @param modelId - Provider model identifier.
 * @returns Token limit used for the context usage percentage.
 */
export function resolveContextWindow(modelId: string): number {
  const id = modelId.trim()
  if (!id) return DEFAULT_CONTEXT_WINDOW
  for (const rule of CONTEXT_WINDOW_RULES) {
    if (rule.pattern.test(id)) return rule.tokens
  }
  return DEFAULT_CONTEXT_WINDOW
}

/**
 * Clamps used tokens into a 0–100 percentage of the context window.
 *
 * @param usedTokens - Tokens currently in context.
 * @param contextWindow - Model context window size.
 */
export function contextUsagePercent(
  usedTokens: number,
  contextWindow: number
): number {
  if (
    !Number.isFinite(usedTokens) ||
    !Number.isFinite(contextWindow) ||
    contextWindow <= 0
  ) {
    return 0
  }
  const raw = (Math.max(0, usedTokens) / contextWindow) * 100
  return Math.min(100, Math.max(0, raw))
}

/**
 * Formats a token count for compact UI display (e.g. `54.2K`, `1.0M`).
 *
 * @param tokens - Token count.
 */
export function formatTokenCount(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens < 0) return '0'
  if (tokens >= 1_000_000) {
    const value = tokens / 1_000_000
    const formatted = value.toFixed(1)
    return formatted.endsWith('.0')
      ? `${Math.floor(value)}M`
      : `${formatted}M`
  }
  if (tokens >= 1_000) {
    const value = tokens / 1_000
    const formatted = value.toFixed(1)
    return formatted.endsWith('.0')
      ? `${Math.floor(value)}K`
      : `${formatted}K`
  }
  return String(Math.round(tokens))
}

/**
 * Estimates tokens from text. Uses a char heuristic that leans slightly high
 * for CJK (common in this product) without pulling in a tokenizer.
 *
 * @param text - Raw text content.
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0
  let cjk = 0
  let other = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    // CJK Unified Ideographs + common CJK punctuation / kana / hangul.
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk += 1
    } else if (!/\s/u.test(char)) {
      other += 1
    }
  }
  // ~1 token per CJK char; ~4 chars per token elsewhere.
  return Math.max(0, Math.ceil(cjk + other / 4))
}

/** Counts image file parts on UI messages. */
function countImageParts(messages: UIMessage[]): number {
  let count = 0
  for (const message of messages) {
    if (!message.parts?.length) continue
    for (const part of message.parts) {
      if (
        part.type === 'file' &&
        typeof part.mediaType === 'string' &&
        part.mediaType.startsWith('image/')
      ) {
        count += 1
      }
    }
  }
  return count
}

/** Collects non-image textual content from UI messages for estimation. */
function collectConversationText(messages: UIMessage[]): string {
  const chunks: string[] = []
  for (const message of messages) {
    if (!message.parts?.length) continue
    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        chunks.push(part.text)
        continue
      }
      if (part.type === 'reasoning' && 'text' in part && part.text) {
        chunks.push(String(part.text))
        continue
      }
      if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
        const toolPart = part as {
          type: string
          toolName?: string
          input?: unknown
          output?: unknown
          errorText?: string
        }
        chunks.push(toolPart.type)
        if (toolPart.toolName) chunks.push(toolPart.toolName)
        try {
          if (toolPart.input !== undefined) {
            chunks.push(JSON.stringify(toolPart.input))
          }
        } catch {
          chunks.push(String(toolPart.input))
        }
        try {
          if (toolPart.output !== undefined) {
            chunks.push(JSON.stringify(toolPart.output))
          }
        } catch {
          chunks.push(String(toolPart.output))
        }
        if (toolPart.errorText) chunks.push(toolPart.errorText)
      }
    }
  }
  return chunks.join('\n')
}

/**
 * Builds a category breakdown that sums to {@link usedTokens}.
 *
 * System prompt and tool definitions are estimated from known content; the
 * remainder of the provider total is split between images (when present) and
 * conversation. Categories with 0 tokens are omitted.
 *
 * @param input - Provider total plus content used for local estimates.
 */
export function buildContextUsageBreakdown(
  input: AgentContextUsageEstimateInput
): AgentContextUsageCategory[] {
  const usedTokens = Math.max(0, Math.round(input.usedTokens))
  if (usedTokens <= 0) return []

  const systemEst = estimateTextTokens(input.systemPrompt)
  const toolsEst = estimateTextTokens(
    input.tools
      .map(
        tool =>
          `${tool.name}\n${tool.description ?? ''}\n${tool.schemaText ?? ''}`
      )
      .join('\n')
  )
  const imageCount = countImageParts(input.messages)
  const imagesEst = imageCount * IMAGE_TOKEN_ESTIMATE
  const conversationEst = estimateTextTokens(
    collectConversationText(input.messages)
  )

  // Keep system + tools as local estimates (they don't grow mid-turn); assign
  // the remaining provider-reported tokens to images + conversation.
  const fixed = Math.min(usedTokens, systemEst + toolsEst)
  let systemTokens = 0
  let toolsTokens = 0
  if (fixed > 0 && systemEst + toolsEst > 0) {
    systemTokens = Math.round(fixed * (systemEst / (systemEst + toolsEst)))
    toolsTokens = fixed - systemTokens
  } else if (fixed > 0) {
    systemTokens = fixed
  }

  const remainder = Math.max(0, usedTokens - systemTokens - toolsTokens)
  const variableEst = imagesEst + conversationEst
  let imagesTokens = 0
  let conversationTokens = remainder
  if (remainder > 0 && variableEst > 0 && imagesEst > 0) {
    imagesTokens = Math.min(
      remainder,
      Math.round(remainder * (imagesEst / variableEst))
    )
    conversationTokens = remainder - imagesTokens
  }

  const raw: Array<{ id: AgentContextUsageCategoryId; tokens: number }> = [
    { id: 'system', tokens: systemTokens },
    { id: 'tools', tokens: toolsTokens },
    { id: 'images', tokens: imagesTokens },
    { id: 'conversation', tokens: conversationTokens }
  ]

  return raw
    .filter(row => row.tokens > 0)
    .map(row => ({
      id: row.id,
      tokens: row.tokens,
      color: CONTEXT_USAGE_CATEGORY_COLORS[row.id]
    }))
}

/**
 * Builds a full {@link AgentContextUsage} snapshot from provider usage + local
 * content estimates.
 */
export function buildAgentContextUsage(
  input: AgentContextUsageEstimateInput & { outputTokens?: number }
): AgentContextUsage {
  return {
    usedTokens: Math.max(0, Math.round(input.usedTokens)),
    outputTokens: input.outputTokens,
    breakdown: buildContextUsageBreakdown(input)
  }
}
