// SPDX-License-Identifier: GPL-3.0-or-later
//
// Token de sessão, validação dos cabeçalhos do pedido e cabeçalhos de segurança
// das respostas (spec §3 A1, A2, A4, A8, A9). Puro e determinístico.

import { LocalServerError } from './errors.ts'
import type { HeaderValue } from './types.ts'

/** 256 bits de aleatoriedade por sessão. */
export const TOKEN_BYTES = 32
/** `base64url` sem padding de 32 bytes. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** `base64url` sem padding e sem `Buffer` (corre em Hermes). */
export function tokenFromBytes(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out +=
      ALPHABET[(n >> 18) & 63] +
      ALPHABET[(n >> 12) & 63] +
      ALPHABET[(n >> 6) & 63] +
      ALPHABET[n & 63]
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const n = bytes[i] << 16
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63]
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    out +=
      ALPHABET[(n >> 18) & 63] +
      ALPHABET[(n >> 12) & 63] +
      ALPHABET[(n >> 6) & 63]
  }
  return out
}

/**
 * Aleatoriedade segura **ou nada**: sem `crypto.getRandomValues` o servidor não
 * arranca (nunca `Math.random` — o token é a única autenticação, §3 A1).
 */
export function defaultRandomBytes(length: number): Uint8Array {
  const c = (
    globalThis as {
      crypto?: { getRandomValues?: <T extends Uint8Array>(a: T) => T }
    }
  ).crypto
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new LocalServerError('no-secure-random')
  }
  return c.getRandomValues(new Uint8Array(length))
}

/** Comparação de comprimento público e tempo independente do conteúdo. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// -- cabeçalhos do pedido -------------------------------------------------------

export type HeaderVerdict = { ok: true } | { ok: false; status: 400 | 403 }

function collect(
  headers: Readonly<Record<string, HeaderValue>>
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const key of Object.keys(headers)) {
    const value = headers[key]
    if (value === undefined) continue
    const values = typeof value === 'string' ? [value] : [...value]
    const name = key.toLowerCase()
    map.set(name, [...(map.get(name) ?? []), ...values])
  }
  return map
}

/**
 * `Host` exacto (rebinding DNS traz outro), `Origin`/`Sec-Fetch-Site` só da
 * própria origem, sem corpo. Valores repetidos ou em falta = 400; inválidos = 403.
 */
export function checkRequestHeaders(
  headers: Readonly<Record<string, HeaderValue>>,
  expected: { host: string; origin: string }
): HeaderVerdict {
  const h = collect(headers)

  const host = h.get('host')
  if (!host || host.length !== 1 || host[0] === '') {
    return { ok: false, status: 400 }
  }
  if (host[0] !== expected.host) return { ok: false, status: 403 }

  const origin = h.get('origin')
  if (origin) {
    if (origin.length !== 1) return { ok: false, status: 400 }
    if (origin[0] !== expected.origin) return { ok: false, status: 403 }
  }

  const site = h.get('sec-fetch-site')
  if (site) {
    if (site.length !== 1) return { ok: false, status: 400 }
    if (site[0] !== 'same-origin' && site[0] !== 'none') {
      return { ok: false, status: 403 }
    }
  }

  const length = h.get('content-length')
  if (length && (length.length !== 1 || length[0].trim() !== '0')) {
    return { ok: false, status: 400 }
  }
  if (h.has('transfer-encoding')) return { ok: false, status: 400 }

  return { ok: true }
}

// -- cabeçalhos das respostas ---------------------------------------------------

/**
 * Em todas as respostas. Sem `Access-Control-*` (nada é cross-origin), sem
 * `Server`/`ETag`/`Last-Modified` (nada interno sai).
 */
export const COMMON_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Accept-Ranges': 'none'
}

/** Palavra-chave de CSP entre apóstrofos (`'self'`), sem literais com aspas mistas. */
function kw(name: string): string {
  return `'${name}'`
}

/**
 * CSP do HTML do viewer: `connect-src 'self'` torna «zero rede externa» também
 * uma garantia de runtime. **[H]** valores a confirmar em dispositivo (S2);
 * configurável em `LocalAssetServerDeps.contentSecurityPolicy`.
 */
export const DEFAULT_CSP = [
  `default-src ${kw('none')}`,
  `script-src ${kw('self')} ${kw('wasm-unsafe-eval')}`,
  `worker-src ${kw('self')} blob:`,
  `connect-src ${kw('self')}`,
  `img-src ${kw('self')} data: blob:`,
  `style-src ${kw('self')} ${kw('unsafe-inline')}`,
  `font-src ${kw('self')} data:`,
  `object-src ${kw('none')}`,
  `base-uri ${kw('none')}`,
  `form-action ${kw('none')}`,
  `frame-ancestors ${kw('none')}`
].join('; ')

/** Corpo fixo por estado (nunca ecoa o pedido). */
export const ERROR_TEXT: Readonly<Record<number, string>> = {
  400: 'Bad request',
  403: 'Forbidden',
  404: 'Not found',
  405: 'Method not allowed',
  413: 'Payload too large',
  414: 'URI too long',
  500: 'Internal error',
  503: 'Unavailable',
  504: 'Timeout'
}
