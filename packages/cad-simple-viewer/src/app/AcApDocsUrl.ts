/**
 * Builds localized user-guide URLs under a configurable docs root.
 *
 * English pages live at `{base}/{path}` (no locale segment). Other locales
 * use `{base}/{locale}/{path}`, matching the VitePress site layout.
 *
 * Configure the root via {@link AcApDocManagerOptions.docsBaseUrl},
 * {@link acapSetDocsBaseUrl}, or the `docs-base-url` prop on `MlCadViewer`.
 *
 * @example
 * ```ts
 * acapDocsUrl('guide/magnifier.html', 'en')
 * // → https://mlightcad.com/cad-viewer/docs/guide/magnifier.html
 * acapDocsUrl('guide/magnifier.html', 'zh')
 * // → https://mlightcad.com/cad-viewer/docs/zh/guide/magnifier.html
 * ```
 */

import { MLIGHTCAD_DOCS_URL } from './AcApBrand'

/** Magnifier (mobile) guide page relative to the docs root. */
export const ACAP_DOCS_PATH_MAGNIFIER = 'guide/magnifier.html'

/**
 * Default public user-guide root (trailing slash optional; normalized on use).
 * Prefer {@link acapGetDocsBaseUrl} at runtime.
 */
export const ACAP_DEFAULT_DOCS_BASE_URL = MLIGHTCAD_DOCS_URL

/** Active docs root for {@link acapDocsUrl} (no trailing slash). */
let docsBaseUrl = normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)

/**
 * Returns the configured docs root, falling back to
 * {@link ACAP_DEFAULT_DOCS_BASE_URL}.
 */
export function acapGetDocsBaseUrl(): string {
  return docsBaseUrl
}

/**
 * Sets the docs root used by {@link acapDocsUrl}.
 *
 * Prefer {@link AcApDocManagerOptions.docsBaseUrl} (or the `docs-base-url`
 * prop on `MlCadViewer`) so the value is applied when the viewer starts.
 *
 * @param url - Absolute docs root (e.g. `https://example.com/docs/`).
 */
export function acapSetDocsBaseUrl(url: string): void {
  docsBaseUrl = normalizeDocsBaseUrl(url)
}

/**
 * Builds a full docs URL for `docPath` under `locale`.
 *
 * @param docPath - Path under the docs root, with or without a leading slash
 *   (e.g. `guide/magnifier.html` or `/guide/magnifier.html`).
 * @param locale - Locale id (`en`, `zh`, `zh-CN`, …). English (`en`) omits the
 *   locale path segment. Callers should pass the active UI locale (for example
 *   {@link AcApI18n.currentLocale}).
 * @returns Absolute URL to the localized page.
 */
export function acapDocsUrl(docPath: string, locale: string = 'en'): string {
  const base = acapGetDocsBaseUrl()
  const lang = locale.toLowerCase().split(/[-_]/)[0]
  const prefix = !lang || lang === 'en' ? '' : `/${lang}`
  const path = docPath.replace(/^\/+/, '')
  return `${base}${prefix}/${path}`
}

/**
 * Strips trailing slashes and ensures a usable absolute or root-relative base.
 *
 * @param url - Raw docs base URL from options or callers.
 * @returns Normalized base without a trailing slash (joined paths add `/`).
 */
export function normalizeDocsBaseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ACAP_DEFAULT_DOCS_BASE_URL.replace(/\/+$/, '')
  return trimmed.replace(/\/+$/, '')
}
