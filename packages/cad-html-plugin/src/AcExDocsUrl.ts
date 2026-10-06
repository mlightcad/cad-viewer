/**
 * Localized user-guide URL builder for the offline HTML viewer.
 *
 * Mirrors {@link acapDocsUrl} in cad-simple-viewer. English pages omit the
 * locale segment; other locales use `{base}/{locale}/{path}`.
 */

/** Magnifier (mobile) guide page relative to the docs root. */
export const ACEX_DOCS_PATH_MAGNIFIER = 'guide/magnifier.html'

/** Default public user-guide root. */
export const ACEX_DEFAULT_DOCS_BASE_URL =
  'https://mlightcad.com/cad-viewer/docs/'

let docsBaseUrl = normalizeAcExDocsBaseUrl(ACEX_DEFAULT_DOCS_BASE_URL)

/**
 * Returns the configured docs root (no trailing slash).
 */
export function acexGetDocsBaseUrl(): string {
  return docsBaseUrl
}

/**
 * Sets the docs root used by {@link acexDocsUrl}.
 *
 * @param url - Absolute docs root from export metadata or host config.
 */
export function acexSetDocsBaseUrl(url: string): void {
  docsBaseUrl = normalizeAcExDocsBaseUrl(url)
}

/**
 * Builds a full docs URL for `docPath` under `locale`.
 *
 * @param docPath - Path under the docs root (e.g. `guide/magnifier.html`).
 * @param locale - Locale id (`en`, `zh`, …). English omits the locale segment.
 */
export function acexDocsUrl(docPath: string, locale: string): string {
  const lang = locale.toLowerCase().split(/[-_]/)[0]
  const prefix = !lang || lang === 'en' ? '' : `/${lang}`
  const path = docPath.replace(/^\/+/, '')
  return `${docsBaseUrl}${prefix}/${path}`
}

/**
 * Strips trailing slashes; empty input falls back to the default root.
 *
 * @param url - Raw docs base URL.
 */
export function normalizeAcExDocsBaseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ACEX_DEFAULT_DOCS_BASE_URL.replace(/\/+$/, '')
  return trimmed.replace(/\/+$/, '')
}
