/**
 * Normalizes a user-entered LLM base URL for AI SDK providers.
 *
 * Provider SDKs append paths such as `/messages` or `/chat/completions` to
 * the base URL. Official defaults include `/v1` (e.g.
 * `https://api.anthropic.com/v1`). Gateways like OneAPI/NewAPI expose the
 * same paths under `/v1`, but users often paste only the host
 * (`https://ai-api.example.com`). Without `/v1`, the browser hits a
 * non-API route that typically lacks CORS headers and surfaces as
 * "Failed to fetch".
 *
 * @param baseUrl - Raw base URL from settings (may be empty).
 * @returns Trimmed URL with `/v1` appended when the path is empty, or
 *   `undefined` when the input is blank.
 */
export function normalizeLlmBaseUrl(baseUrl: string): string | undefined {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined

  try {
    const parsed = new URL(trimmed)
    if (!parsed.pathname || parsed.pathname === '/') {
      return `${trimmed}/v1`
    }
    return trimmed
  } catch {
    return trimmed
  }
}
