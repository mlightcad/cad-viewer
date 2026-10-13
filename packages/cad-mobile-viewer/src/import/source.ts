// SPDX-License-Identifier: GPL-3.0-or-later
//
// Leitura da fonte de `open` (§5.2): `base64` (≤ 8 MB) ou `url` do servidor
// loopback (I5). Sem rede própria: o `fetchBytes` é um porto injectado e o URL
// só pode ser loopback (arquitectura §4: zero pedidos externos).

import { makeFailure } from './errors'
import { MAX_BASE64_BYTES } from './limits'
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
 * Só HTTP loopback (127.0.0.1, localhost ou ::1) com porta e segmentos de
 * caminho seguros; sem
 * `userinfo`, query, fragmento ou `..`.
 */
export function isLocalAssetUrl(url: string): boolean {
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

const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

/** Decodificação estrita (sem espaços, sem URL-safe, padding obrigatório). */
export function decodeBase64(data: string): ArrayBuffer | null {
  if (!BASE64.test(data)) return null
  const binary = atob(data)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
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
    return {
      ok: false,
      failure: makeFailure(
        'read-failed',
        'source',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}
