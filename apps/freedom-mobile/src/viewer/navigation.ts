// SPDX-License-Identifier: GPL-3.0-or-later
//
// Política de navegação da `ViewerSurface` (spec M3-I5 §8 item 3; card M4-I6).
// Pura e testável: a WebView só carrega a página do viewer da sessão actual
// (`http://127.0.0.1:<porta>/s/<token>/…`) ou, sem servidor, `about:blank`.
// Tudo o resto é bloqueado (fail-closed). O `viewerUrl` contém o token: nunca
// é registado nem devolvido em mensagens.

export const BLANK_URI = 'about:blank'
/** `originWhitelist` da WebView: só loopback IPv4 em claro (e `about:`). */
export const SURFACE_ORIGIN_WHITELIST: readonly string[] = [
  'http://127.0.0.1:*',
  'about:*'
]

const VIEWER_URL =
  /^http:\/\/127\.0\.0\.1:(\d{1,5})\/s\/[A-Za-z0-9_-]{16,128}\/$/

/** `true` se `viewerUrl` tem a forma exacta da página do `LocalAssetServer`. */
export function isViewerUrl(viewerUrl: string): boolean {
  const m = VIEWER_URL.exec(viewerUrl)
  return !!m && Number(m[1]) >= 1 && Number(m[1]) <= 65535
}

/** Fonte da superfície: a página da sessão, ou `about:blank` se inválida/ausente. */
export function surfaceUri(viewerUrl: string | null): string {
  return viewerUrl !== null && isViewerUrl(viewerUrl) ? viewerUrl : BLANK_URI
}

/**
 * `onShouldStartLoadWithRequest`: permite só pedidos dentro do prefixo da
 * sessão (mesma origem e mesmo token), sem query/fragmento, ou `about:blank`
 * quando não há sessão.
 */
export function isAllowedNavigation(
  url: string,
  viewerUrl: string | null
): boolean {
  if (typeof url !== 'string') return false
  const page = surfaceUri(viewerUrl)
  if (page === BLANK_URI) return url === BLANK_URI
  if (!url.startsWith(page)) return false
  const rest = url.slice(page.length)
  return !/[?#\\]|%2e|\.\./i.test(rest)
}
