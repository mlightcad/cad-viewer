// SPDX-License-Identifier: GPL-3.0-or-later
//
// Nomes, ids opacos e higiene de caminhos/URLs do fluxo de ficheiros
// (docs/OBJ-0104-m2-i1-file-flow-spec.md §3.2; arquitectura §9). Puro.

import { detectDocumentFormat } from '../contracts/protocol.ts'

export const MAX_NAME_LENGTH = 120

// Controlos C0/C1, separadores de linha e marcas bidi/zero-width (spoofing de nomes).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g
const INVALID_NAME_CHARS = /[<>:"|?*]/g

/**
 * Nome seguro de um documento: só o _basename_, sem controlos nem caracteres
 * inválidos, NFC, ≤ 120 chars preservando a extensão. `null` se não sobrar um
 * nome com extensão `.dwg`/`.dxf` (o viewer trataria o resto como DXF).
 */
export function sanitizeDocumentName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const base = raw.normalize('NFC').split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .replace(CONTROL_CHARS, '')
    .replace(INVALID_NAME_CHARS, '')
    .trim()
  const format = detectDocumentFormat(cleaned)
  if (!format) return null
  const ext = cleaned.slice(-4)
  const stem = cleaned.slice(0, -4).replace(/[. ]+$/, '')
  if (stem.length === 0) return null
  const room = MAX_NAME_LENGTH - ext.length
  return `${Array.from(stem).slice(0, room).join('')}${ext}`
}

const REDACTED = '[caminho]'

/**
 * Remove de um texto livre (mensagens de excepção) URIs e caminhos absolutos.
 * `known` = cadeias sensíveis conhecidas (uri do picker, pasta controlada),
 * removidas primeiro e também na forma percent-decoded.
 */
export function redactPaths(
  text: string,
  known: readonly string[] = []
): string {
  let out = text
  for (const k of known) {
    if (!k) continue
    for (const variant of new Set([k, safeDecode(k)])) {
      if (variant) out = out.split(variant).join(REDACTED)
    }
  }
  return out
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S*/gi, REDACTED)
    .replace(/\b[A-Za-z]:[\\/]\S*/g, REDACTED)
    .replace(/\\\\\S+/g, REDACTED)
    .replace(/(^|[\s"'(=\[])~?\/[^\s"')\]]+/g, `$1${REDACTED}`)
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Ids de asset: opacos, só `[a-z0-9-]`, 8–64 chars (único nome do ficheiro copiado). */
export const ASSET_ID_PATTERN = /^[a-z0-9-]{8,64}$/

export function isAssetId(x: unknown): x is string {
  return typeof x === 'string' && ASSET_ID_PATTERN.test(x)
}

function defaultRandom(): number {
  const c = (
    globalThis as {
      crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array }
    }
  ).crypto
  if (c?.getRandomValues) {
    return c.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000
  }
  return Math.random()
}

/**
 * Gerador de ids `f<n>-<8 chars aleatórios>`. `random` é injectável para
 * testes determinísticos. **Não é autenticação** (spec §6).
 */
export function createAssetIdGenerator(
  random: () => number = defaultRandom
): () => string {
  let n = 0
  return () => {
    let suffix = ''
    for (let i = 0; i < 8; i++) {
      suffix += Math.floor(random() * 36).toString(36)
    }
    return `f${++n}-${suffix}`
  }
}

const LOCAL_URL =
  /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})((?:\/[A-Za-z0-9._~-]+)+)$/

/**
 * Só URLs loopback `http://127.0.0.1|localhost|[::1]:<porta>/<segmentos>`; sem
 * `userinfo`, query, fragmento nem `.`/`..`. Qualquer outro destino seria
 * dependência de rede externa e é recusado (fail-closed).
 */
export function isLocalAssetUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  const m = LOCAL_URL.exec(url)
  if (!m) return false
  const port = Number(m[1])
  if (!(port >= 1 && port <= 65535)) return false
  return m[2].split('/').every(seg => seg !== '.' && seg !== '..')
}
