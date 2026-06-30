/** Minimal chat message shape used when rewriting request bodies. */
type MessageLike = { role?: string; [key: string]: unknown }

/**
 * Rewrites `developer` roles to `system` in place for OpenAI-compatible APIs.
 *
 * @param items - Message array from a chat request body, if present.
 */
function convertDeveloperRoles(items: MessageLike[] | undefined): void {
  if (!items) return
  for (const item of items) {
    if (item.role === 'developer') {
      item.role = 'system'
    }
  }
}

/**
 * Wraps `fetch` so OpenAI-compatible providers accept AI SDK 5 request bodies.
 *
 * AI SDK 5 may emit `developer` roles for system prompts on chat models.
 * Most OpenAI-compatible APIs (DeepSeek, etc.) only accept `system`.
 *
 * @param baseFetch - Underlying fetch implementation (defaults to `globalThis.fetch`).
 * @returns A fetch function that normalizes message roles before sending.
 */
export function createOpenAiCompatibleFetch(
  baseFetch: typeof fetch = globalThis.fetch.bind(globalThis)
): typeof fetch {
  return async (input, init) => {
    if (!init?.body || typeof init.body !== 'string') {
      return baseFetch(input, init)
    }

    try {
      const body = JSON.parse(init.body) as {
        messages?: MessageLike[]
        input?: MessageLike[]
      }
      convertDeveloperRoles(body.messages)
      convertDeveloperRoles(body.input)
      return baseFetch(input, { ...init, body: JSON.stringify(body) })
    } catch {
      return baseFetch(input, init)
    }
  }
}
