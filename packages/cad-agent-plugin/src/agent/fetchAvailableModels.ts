import type { LlmApiProtocol } from '../storage/modelCatalog'
import { ANTHROPIC_BROWSER_ACCESS_HEADER } from './anthropicBrowserAccess'
import { normalizeLlmBaseUrl } from './normalizeLlmBaseUrl'

/** One model reported by a provider's model-listing endpoint. */
export interface DiscoveredModel {
  /** Model id the endpoint accepts on requests. */
  id: string
  /** Display name, when the listing discloses one. */
  name?: string
}

/** Endpoint facts needed to ask a provider which models it serves. */
export interface ModelListingTarget {
  /** Wire protocol, which decides the listing path and auth headers. */
  protocol: LlmApiProtocol
  /** Base URL as entered in the settings form. */
  baseUrl: string
  /** API key as entered in the settings form (may not be saved yet). */
  apiKey: string
}

/** Why a model listing could not be read. */
export type ModelListingErrorCode = 'network' | 'http' | 'format'

/** Failure of {@link fetchAvailableModels}, carrying a UI-localizable code. */
export class ModelListingError extends Error {
  /**
   * @param code - Failure category.
   * @param url - Listing URL that was requested.
   * @param status - HTTP status for `http` failures.
   */
  constructor(
    readonly code: ModelListingErrorCode,
    readonly url: string,
    readonly status?: number
  ) {
    super(`Model listing failed (${code}) at ${url}`)
    this.name = 'ModelListingError'
  }
}

/** Stable API version required by Anthropic's model-listing endpoint. */
const ANTHROPIC_VERSION = '2023-06-01'

/** Largest page Anthropic's listing accepts; one page is read. */
const ANTHROPIC_MODEL_LIMIT = 1000

/**
 * Builds the listing URL for a protocol.
 *
 * OpenAI protocols list at `{baseURL}/models`. Anthropic lists at
 * `{root}/v1/models`, where the root is the base URL without one trailing
 * `/v1`, because gateways document both spellings of the same root.
 *
 * @param baseUrl - Base URL from the form.
 * @param protocol - Wire protocol.
 * @returns Listing URL.
 */
export function modelListingUrl(
  baseUrl: string,
  protocol: LlmApiProtocol
): string {
  const base = normalizeLlmBaseUrl(baseUrl) ?? ''
  if (protocol !== 'anthropic-messages') return `${base}/models`
  const root = base.endsWith('/v1') ? base.slice(0, -3) : base
  return `${root}/v1/models?limit=${ANTHROPIC_MODEL_LIMIT}`
}

/** Returns the first non-empty string among the candidates. */
function firstString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return undefined
}

/**
 * Parses a model-listing reply.
 *
 * Accepts the standard `{ data: [...] }` array and the `{ models: { id: {...} } }`
 * map some gateways expose. Entries without a usable id are skipped and
 * duplicate ids are collapsed.
 *
 * @param body - Parsed JSON reply.
 * @returns Discovered models in listing order.
 * @throws {@link ModelListingError} with code `format` for other shapes.
 */
export function parseModelListing(body: unknown, url = ''): DiscoveredModel[] {
  const listing = body as { data?: unknown; models?: unknown } | null
  let entries: { key?: string; raw: unknown }[]
  if (Array.isArray(listing?.data)) {
    entries = (listing.data as unknown[]).map(raw => ({ raw }))
  } else if (
    listing?.models &&
    typeof listing.models === 'object' &&
    !Array.isArray(listing.models)
  ) {
    entries = Object.entries(listing.models as Record<string, unknown>)
      .filter(([, raw]) => !!raw && typeof raw === 'object')
      .map(([key, raw]) => ({ key, raw }))
  } else {
    throw new ModelListingError('format', url)
  }

  const models = new Map<string, DiscoveredModel>()
  for (const { key, raw } of entries) {
    const entry = (raw ?? {}) as Record<string, unknown>
    const id = firstString(key, entry.id)
    if (!id || models.has(id)) continue
    const name = firstString(entry.name, entry.display_name, entry.displayName)
    models.set(id, name && name !== id ? { id, name } : { id })
  }
  return [...models.values()]
}

/**
 * Asks a provider which models it serves, using the values currently in the
 * settings form so a provider can be set up in one pass.
 *
 * @param target - Protocol, base URL and API key.
 * @param fetchImpl - Fetch implementation (injectable for tests).
 * @param signal - Optional abort signal.
 * @returns Discovered models.
 * @throws {@link ModelListingError} on network, HTTP or format failures.
 */
export async function fetchAvailableModels(
  target: ModelListingTarget,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal
): Promise<DiscoveredModel[]> {
  const url = modelListingUrl(target.baseUrl, target.protocol)
  const apiKey = target.apiKey.trim()
  const headers: Record<string, string> =
    target.protocol === 'anthropic-messages'
      ? {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          ...ANTHROPIC_BROWSER_ACCESS_HEADER
        }
      : { Authorization: `Bearer ${apiKey}` }

  let response: Response
  try {
    response = await fetchImpl(url, { method: 'GET', headers, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    // Browsers report CORS refusals and unreachable hosts identically.
    throw new ModelListingError('network', url)
  }
  if (!response.ok) {
    throw new ModelListingError('http', url, response.status)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ModelListingError('format', url)
  }
  return parseModelListing(body, url)
}
