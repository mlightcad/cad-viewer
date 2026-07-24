import type { AcApWebworkerFiles } from './AcApDocManager'

/** Default worker script URLs used when `webworkerFileUrls` is omitted. */
export const DEFAULT_WEBWORKER_FILE_URLS: Required<AcApWebworkerFiles> = {
  dwgParser: './assets/libredwg-parser-worker.js',
  mtextRender: './assets/mtext-renderer-worker.js'
}

/**
 * Resolves configured worker URLs to strings, falling back to {@link DEFAULT_WEBWORKER_FILE_URLS}.
 */
export function resolveWebworkerFileUrls(
  webworkerFileUrls?: AcApWebworkerFiles
): string[] {
  return [
    webworkerFileUrls?.dwgParser ?? DEFAULT_WEBWORKER_FILE_URLS.dwgParser,
    webworkerFileUrls?.mtextRender ?? DEFAULT_WEBWORKER_FILE_URLS.mtextRender
  ].map(url => String(url))
}

let cachedReadinessKey: string | undefined
let cachedReadinessResult: true | undefined

/** Clears the module-level success cache (e.g. when the doc manager is destroyed). */
export function resetWebworkerReadinessCache(): void {
  cachedReadinessKey = undefined
  cachedReadinessResult = undefined
}

async function isWorkerUrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok) {
      return true
    }
    // Some static hosts reject HEAD; probe with a minimal ranged GET instead.
    if (response.status === 405) {
      const fallback = await fetch(url, { headers: { Range: 'bytes=0-0' } })
      return fallback.ok || fallback.status === 206
    }
    return false
  } catch {
    return false
  }
}

/**
 * Returns true when all configured worker scripts respond successfully.
 *
 * Uses HEAD requests to avoid downloading large worker bundles. Successful
 * results are cached for the current page lifecycle; failures are not cached
 * so transient network errors can be retried.
 */
export async function checkWebworkerReadiness(
  webworkerFileUrls?: AcApWebworkerFiles
): Promise<boolean> {
  const urls = resolveWebworkerFileUrls(webworkerFileUrls)
  const key = urls.join('|')
  if (cachedReadinessKey === key && cachedReadinessResult === true) {
    return true
  }

  try {
    const results = await Promise.all(urls.map(isWorkerUrlReachable))
    const ready = results.every(Boolean)
    if (ready) {
      cachedReadinessKey = key
      cachedReadinessResult = true
    }
    return ready
  } catch {
    return false
  }
}
