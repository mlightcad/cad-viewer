// SPDX-License-Identifier: GPL-3.0-or-later
//
// Política de navegação da `ViewerSurface` (spec M3-I5 §8 item 3; card M4-I6).
// Pura e testável: a WebView só existe com a página do viewer da sessão
// actual (`http://127.0.0.1:<porta>/s/<token>/`) e só navega dentro desse
// prefixo. Sem página válida NÃO há WebView (nem página em branco). Tudo o resto
// é bloqueado (fail-closed). O `viewerUrl` contém o token: nunca é registado
// nem devolvido em mensagens.

/** `originWhitelist` da WebView: só loopback IPv4 em claro. */
export const SURFACE_ORIGIN_WHITELIST: readonly string[] = [
  'http://127.0.0.1:*'
]

const VIEWER_URL =
  /^http:\/\/127\.0\.0\.1:(\d{1,5})\/s\/[A-Za-z0-9_-]{16,128}\/$/

/** `true` se `viewerUrl` tem a forma exacta da página do `LocalAssetServer`. */
export function isViewerUrl(viewerUrl: unknown): viewerUrl is string {
  if (typeof viewerUrl !== 'string') return false
  const m = VIEWER_URL.exec(viewerUrl)
  return !!m && Number(m[1]) >= 1 && Number(m[1]) <= 65535
}

/**
 * `onShouldStartLoadWithRequest`: permite só pedidos dentro do prefixo da
 * sessão (mesma origem e mesmo token), sem query/fragmento/traversal. Sem
 * página válida nada carrega.
 */
export function isAllowedNavigation(url: unknown, viewerUrl: unknown): boolean {
  if (typeof url !== 'string' || !isViewerUrl(viewerUrl)) return false
  if (!url.startsWith(viewerUrl)) return false
  const rest = url.slice(viewerUrl.length)
  return !/[?#\\]|%2e|\.\./i.test(rest)
}
