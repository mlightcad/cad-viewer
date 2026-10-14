// SPDX-License-Identifier: GPL-3.0-or-later
//
// Leitura da fonte de `open` (§5.2): `base64` (≤ 8 MB) ou `url` do servidor
// loopback (I5). Sem rede própria: o `fetchBytes` é um porto injectado e o URL
// só pode ser loopback (arquitectura §4: zero pedidos externos).

import { makeFailure } from './errors'
import { MAX_BASE64_BYTES } from './limits'
import { LoopbackFetchError } from './loopbackFetch'
import type { ImportFailure } from './types'

export type OpenSource =
  | { kind: 'url'; url: string }
  | { kind: 'base64'; data: string }

export interface SourcePorts {
  /** Descarrega bytes de um URL **já validado como loopback**. */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>
}

export type SourceResult =
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; failure: ImportFailure }

const SEGMENT = /^[A-Za-z0-9._~-]+$/

/**
 * Espaço nas pontas ou carácter de controlo (C0/DEL) em qualquer posição:
 * `new URL` apara os primeiros e remove tab/CR/LF, pelo que o texto original
 * tem de ser validado antes de ser interpretado.
 */
export function hasEdgeSpaceOrControl(text: string): boolean {
  if (/^\s|\s$/.test(text)) return true
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c <= 0x1f || c === 0x7f) return true
  }
  return false
}

/**
 * Só HTTP loopback (127.0.0.1, localhost ou ::1) com porta e segmentos de
 * caminho seguros; sem
 * `userinfo`, query, fragmento ou `..`.
 */
export function isLocalAssetUrl(url: string): boolean {
  // `new URL` apara espaços e remove tab/CR/LF: o texto original tem de ser limpo
  if (typeof url !== 'string' || hasEdgeSpaceOrControl(url)) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:') return false
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) {
    return false
  }
  if (!parsed.port) return false
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return false
  }
  // `new URL` normaliza `..`; compara-se com o texto original
  if (/(^|\/)\.\.?(\/|$)/.test(url.slice(url.indexOf('//') + 2))) return false
  const segments = parsed.pathname.split('/').slice(1)
  return segments.length > 0 && segments.every(s => SEGMENT.test(s))
}

/** Código de carácter (Base64 padrão) → valor de 6 bits; -1 se inválido. */
function base64Value(c: number): number {
  if (c >= 65 && c <= 90) return c - 65 // A-Z
  if (c >= 97 && c <= 122) return c - 71 // a-z
  if (c >= 48 && c <= 57) return c + 4 // 0-9
  if (c === 43) return 62 // +
  if (c === 47) return 63 // /
  return -1
}

/** Chars Base64 por troço de `atob` (múltiplo de 4; evita uma string binária de MBs). */
const DECODE_CHUNK = 64 * 1024

/**
 * Validação estrita em tempo linear e memória O(1) (sem regex: a forma
 * `(?:[…]{4})*` rebenta a pilha do motor em entradas de vários MB).
 * Devolve o número de bytes decodificados ou -1 se inválido.
 */
function strictBase64Size(data: string): number {
  const length = data.length
  if (length === 0 || length % 4 !== 0) return -1
  let padding = 0
  if (data.charCodeAt(length - 1) === 61) {
    padding = data.charCodeAt(length - 2) === 61 ? 2 : 1
  }
  const end = length - padding
  for (let i = 0; i < end; i++) {
    if (base64Value(data.charCodeAt(i)) < 0) return -1
  }
  return (length / 4) * 3 - padding
}

/**
 * Decodificação estrita (sem espaços, sem URL-safe, padding obrigatório).
 * Valida antes de alocar e decodifica por troços.
 */
export function decodeBase64(data: string): ArrayBuffer | null {
  if (typeof data !== 'string') return null
  const size = strictBase64Size(data)
  if (size < 0) return null
  const out = new Uint8Array(size)
  let offset = 0
  for (let i = 0; i < data.length; i += DECODE_CHUNK) {
    const binary = atob(data.slice(i, i + DECODE_CHUNK))
    for (let j = 0; j < binary.length; j++) out[offset++] = binary.charCodeAt(j)
  }
  return out.buffer as ArrayBuffer
}

export async function readOpenSource(
  source: OpenSource,
  ports: SourcePorts = {}
): Promise<SourceResult> {
  try {
    if (source.kind === 'base64') {
      const data = source.data
      if (typeof data !== 'string' || data.length === 0) {
        return {
          ok: false,
          failure: makeFailure('read-failed', 'source', 'base64 vazio')
        }
      }
      // tamanho decodificado conhecido antes de alocar
      const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
      const decoded = Math.floor((data.length * 3) / 4) - padding
      if (decoded > MAX_BASE64_BYTES) {
        return {
          ok: false,
          failure: makeFailure(
            'too-large',
            'source',
            `base64 de ${decoded} bytes`
          )
        }
      }
      const bytes = decodeBase64(data)
      if (!bytes) {
        return {
          ok: false,
          failure: makeFailure('read-failed', 'source', 'base64 inválido')
        }
      }
      return { ok: true, bytes }
    }
    if (source.kind === 'url') {
      if (!isLocalAssetUrl(source.url)) {
        return {
          ok: false,
          failure: makeFailure(
            'read-failed',
            'source',
            'URL não é um asset local'
          )
        }
      }
      if (!ports.fetchBytes) {
        return {
          ok: false,
          failure: makeFailure(
            'read-failed',
            'source',
            'sem servidor local (I5)'
          )
        }
      }
      return { ok: true, bytes: await ports.fetchBytes(source.url) }
    }
    return {
      ok: false,
      failure: makeFailure('read-failed', 'source', 'fonte desconhecida')
    }
  } catch (error) {
    // O descarregamento do servidor local distingue ficheiro grande de mais e
    // tempo esgotado; o resto (rede, estado HTTP, URL de outra sessão) é leitura
    const code =
      error instanceof LoopbackFetchError &&
      (error.code === 'too-large' || error.code === 'timeout')
        ? error.code
        : 'read-failed'
    return {
      ok: false,
      failure: makeFailure(
        code,
        'source',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}
