import { APICallError } from 'ai'

/**
 * Extracts a human-readable message from a provider error payload.
 *
 * @param value - Parsed JSON body or nested `error` object from an API response.
 * @returns Trimmed message string, or `undefined` when none is found.
 */
function extractApiMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>
  const nestedError = record.error
  if (nestedError && typeof nestedError === 'object') {
    const nestedMessage = (nestedError as Record<string, unknown>).message
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage.trim()
    }
  }

  for (const key of ['message', 'detail', 'error']) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return undefined
}

/**
 * Turns provider/API errors into a short user-facing message.
 *
 * @param error - Error thrown by the AI SDK or transport layer.
 * @returns A concise message suitable for the chat error banner.
 */
export function formatChatError(error: Error): string {
  if (APICallError.isInstance(error)) {
    const fromBody = extractApiMessage(error.responseBody)
    if (fromBody) return fromBody
  }

  const responseBody = (error as Error & { responseBody?: unknown })
    .responseBody
  const fromBody = extractApiMessage(responseBody)
  if (fromBody) return fromBody

  const message = error.message?.trim()
  if (!message) return 'Unknown error'

  const jsonMatch = message.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      const fromJson = extractApiMessage(parsed)
      if (fromJson) return fromJson
    } catch {
      // fall through to raw message
    }
  }

  return message
}
