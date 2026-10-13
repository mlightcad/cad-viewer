// SPDX-License-Identifier: GPL-3.0-or-later
//
// Rotas, análise do alvo do pedido e tipos de conteúdo (spec §4.1, ameaça A3).
// O pedido **nunca** vira um caminho de ficheiro: só se comparam segmentos
// validados com uma lista permitida (bundle) ou com ids opacos concedidos.

/** `/s/<token>/…` — raiz de tudo o que o servidor serve. */
export const ROUTE_PREFIX = 's'
/** `/s/<token>/a/<assetId>` — documentos abertos. Reservado no bundle. */
export const ASSET_ROUTE = 'a'
export const INDEX_FILE = 'index.html'

export const MAX_TARGET_LENGTH = 256
export const MAX_SEGMENTS = 8
export const MAX_SEGMENT_LENGTH = 128

const SEGMENT = /^[A-Za-z0-9._~-]{1,128}$/

export function isSafeSegment(segment: unknown): segment is string {
  return (
    typeof segment === 'string' &&
    segment !== '.' &&
    segment !== '..' &&
    SEGMENT.test(segment)
  )
}

export type TargetResult =
  | { ok: true; segments: string[]; trailingSlash: boolean }
  | { ok: false; status: 400 | 414 }

/**
 * Alvo → segmentos. Sem query, fragmento, `%`, `\`, `//`, `.`/`..` nem formas
 * absolutas (com esquema) nem `*`. `/` dá zero segmentos.
 */
export function parseTarget(target: unknown): TargetResult {
  if (typeof target !== 'string') return { ok: false, status: 400 }
  if (target.length > MAX_TARGET_LENGTH) return { ok: false, status: 414 }
  // `//…` é forma sem esquema (autoridade), nunca um caminho
  if (!target.startsWith('/') || target.startsWith('//')) {
    return { ok: false, status: 400 }
  }
  if (target.includes('?') || target.includes('#')) {
    return { ok: false, status: 400 }
  }
  const trailingSlash = target.endsWith('/')
  const path = target.slice(1, trailingSlash ? -1 : undefined)
  if (path === '') return { ok: true, segments: [], trailingSlash }
  const segments = path.split('/')
  if (segments.length > MAX_SEGMENTS || !segments.every(isSafeSegment)) {
    return { ok: false, status: 400 }
  }
  return { ok: true, segments, trailingSlash }
}

/** Caminho (relativo ao bundle) válido: segmentos seguros e fora da rota reservada. */
export function isBundlePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0) return false
  const segments = path.split('/')
  return (
    segments.length <= MAX_SEGMENTS &&
    segments.every(isSafeSegment) &&
    segments[0] !== ASSET_ROUTE
  )
}

export function buildAssetPath(token: string, assetId: string): string {
  return `/${ROUTE_PREFIX}/${token}/${ASSET_ROUTE}/${assetId}`
}

export function buildViewerPath(token: string): string {
  return `/${ROUTE_PREFIX}/${token}/`
}

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

// `Map` (não objecto): `x.__proto__` não pode devolver `Object.prototype`.
const CONTENT_TYPES = new Map<string, string>([
  ['html', 'text/html; charset=utf-8'],
  ['js', 'text/javascript; charset=utf-8'],
  ['mjs', 'text/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['json', 'application/json; charset=utf-8'],
  ['map', 'application/json; charset=utf-8'],
  ['txt', 'text/plain; charset=utf-8'],
  ['wasm', 'application/wasm'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['ico', 'image/x-icon'],
  ['woff', 'font/woff'],
  ['woff2', 'font/woff2'],
  ['ttf', 'font/ttf'],
  ['otf', 'font/otf']
])

/** Tipo por extensão (nunca pelo conteúdo); desconhecido → `octet-stream`. */
export function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf('.')
  if (dot < 0 || dot === path.length - 1) return DEFAULT_CONTENT_TYPE
  return (
    CONTENT_TYPES.get(path.slice(dot + 1).toLowerCase()) ?? DEFAULT_CONTENT_TYPE
  )
}

export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path)
}
