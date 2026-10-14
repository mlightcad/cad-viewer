// SPDX-License-Identifier: GPL-3.0-or-later
//
// `fetchBytes` do viewer para `open{source:{kind:'url'}}` (docs/OBJ-0104-m3-i5-
// local-asset-server-spec.md §4.4; handoff M3-I4 §6.3). Só descarrega do **próprio
// servidor da página**: `<origem da página>/s/<token da página>/a/<assetId>`.
// Qualquer outro destino — outra porta de loopback (p.ex. outro serviço local),
// outra sessão, outro caminho — é recusado **antes** de abrir a ligação (SSRF).
//
// Auto-contido de propósito (sem imports relativos): os testes do app
// (`node:test`) importam este ficheiro directamente para o provar contra o
// servidor real. As constantes de rota duplicam as do app e são fixadas por um
// teste de deriva (`__tests__/loopbackFetch.test.ts`).

/** `/s/<token>/…` — igual a `ROUTE_PREFIX` do servidor do app. */
export const LOOPBACK_ROUTE_PREFIX = 's'
/** `/s/<token>/a/<assetId>` — igual a `ASSET_ROUTE` do servidor do app. */
export const LOOPBACK_ASSET_ROUTE = 'a'

/** Tecto por omissão: o maior documento aceite (DXF, arquitectura §4). */
export const LOOPBACK_DEFAULT_MAX_BYTES = 20 * 1024 * 1024
/** Tempo máximo do descarregamento ([H] até S2). */
export const LOOPBACK_DEFAULT_TIMEOUT_MS = 60_000

/** Maior atraso que `setTimeout` respeita (acima disto dispara quase já). */
export const LOOPBACK_MAX_TIMEOUT_MS = 2 ** 31 - 1
/** Maior tecto de bytes aceite (inteiro seguro; `Infinity`/`NaN` desligariam o tecto). */
export const LOOPBACK_MAX_BYTES_LIMIT = Number.MAX_SAFE_INTEGER

const MAX_URL_LENGTH = 512
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const ASSET_ID = /^[a-z0-9-]{8,64}$/

export type LoopbackFetchErrorCode =
  | 'no-page'
  | 'invalid-url'
  | 'wrong-origin'
  | 'wrong-session'
  | 'http-status'
  | 'too-large'
  | 'timeout'
  | 'network'

/** Mensagens fixas: nunca incluem o URL, o token, a porta nem texto de excepção. */
export const LOOPBACK_FETCH_MESSAGES: Record<LoopbackFetchErrorCode, string> = {
  'no-page': 'A página do viewer não tem uma origem local válida.',
  'invalid-url': 'O endereço do ficheiro não é um endereço local válido.',
  'wrong-origin':
    'O endereço do ficheiro não pertence ao servidor desta página.',
  'wrong-session': 'O endereço do ficheiro não pertence a esta sessão.',
  'http-status': 'O servidor local recusou o pedido do ficheiro.',
  'too-large': 'O ficheiro é demasiado grande.',
  timeout: 'O descarregamento do ficheiro demorou demasiado tempo.',
  network: 'Não foi possível obter o ficheiro do servidor local.'
}

export class LoopbackFetchError extends Error {
  readonly code: LoopbackFetchErrorCode

  constructor(code: LoopbackFetchErrorCode) {
    super(LOOPBACK_FETCH_MESSAGES[code])
    this.name = 'LoopbackFetchError'
    this.code = code
  }
}

/** Forma mínima de `fetch` usada (compatível com DOM e com o `fetch` do Node). */
export interface LoopbackRequestInit {
  method: 'GET'
  credentials: 'omit'
  cache: 'no-store'
  redirect: 'error'
  referrerPolicy: 'no-referrer'
  mode: 'same-origin'
  signal: AbortSignal
}

export interface LoopbackResponse {
  status: number
  headers: { get(name: string): string | null }
  body: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>
      cancel(): Promise<void>
    }
  } | null
  arrayBuffer(): Promise<ArrayBuffer>
}

export type LoopbackFetchImpl = (
  url: string,
  init: LoopbackRequestInit
) => Promise<LoopbackResponse>

/** Origem e caminho da página do viewer (`location.origin`/`location.pathname`). */
export interface LoopbackPage {
  origin: string
  pathname: string
}

/** Opção inválida: lançada à construção, nunca em silêncio na primeira leitura. */
export class LoopbackConfigError extends RangeError {
  constructor(option: 'maxBytes' | 'timeoutMs') {
    super(`opção inválida: ${option}`)
    this.name = 'LoopbackConfigError'
  }
}

/**
 * `undefined` = omissão. Caso contrário tem de ser um **inteiro** `number` com
 * `1 ≤ v ≤ max`; `NaN`, `±Infinity`, `0`, negativos, fraccionários, `null` e
 * não-números são recusados (fail-closed): com `NaN` o tecto nunca disparava e
 * o temporizador disparava logo. Semântica de `maxBytes`: aceita-se
 * `total === maxBytes`, recusa-se `total > maxBytes`.
 */
function resolveOption(
  value: unknown,
  fallback: number,
  max: number,
  option: 'maxBytes' | 'timeoutMs'
): number {
  if (value === undefined) return fallback
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > max
  ) {
    throw new LoopbackConfigError(option)
  }
  return value
}

export interface LoopbackFetchOptions {
  /** Por omissão `globalThis.location`. */
  page?: LoopbackPage
  /** Por omissão `globalThis.fetch`. */
  fetchImpl?: LoopbackFetchImpl
  maxBytes?: number
  timeoutMs?: number
}

interface Session {
  origin: string
  prefix: string
}

/** `http://127.0.0.1:<porta>` + `/s/<token>/` da página, ou `null` se inválida. */
function sessionOf(page: LoopbackPage | undefined): Session | null {
  if (!page || typeof page.origin !== 'string') return null
  if (typeof page.pathname !== 'string') return null
  const m = /^http:\/\/127\.0\.0\.1:(\d{1,5})$/.exec(page.origin)
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 65535) return null
  const parts = page.pathname.split('/')
  // ['', 's', '<token>', …]
  if (parts[0] !== '' || parts[1] !== LOOPBACK_ROUTE_PREFIX) return null
  if (!TOKEN.test(parts[2] ?? '')) return null
  return {
    origin: page.origin,
    prefix: `/${LOOPBACK_ROUTE_PREFIX}/${parts[2]}/${LOOPBACK_ASSET_ROUTE}/`
  }
}

/** Valida o URL contra a sessão da página; lança antes de qualquer pedido. */
function validate(url: unknown, session: Session): string {
  if (typeof url !== 'string' || url.length === 0) {
    throw new LoopbackFetchError('invalid-url')
  }
  if (url.length > MAX_URL_LENGTH) throw new LoopbackFetchError('invalid-url')
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new LoopbackFetchError('invalid-url')
  }
  if (parsed.protocol !== 'http:') throw new LoopbackFetchError('invalid-url')
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new LoopbackFetchError('invalid-url')
  }
  // Sem normalização escondida: `new URL` apara espaços, remove tab/CR/LF, resolve
  // `..`/`%2e`, tira a porta por omissão e põe o host em minúsculas. Qualquer
  // diferença face ao texto recebido (incluindo espaços e controlos) é recusada.
  if (url !== `${parsed.origin}${parsed.pathname}`) {
    throw new LoopbackFetchError('invalid-url')
  }
  if (parsed.origin !== session.origin) {
    throw new LoopbackFetchError('wrong-origin')
  }
  if (!parsed.pathname.startsWith(session.prefix)) {
    throw new LoopbackFetchError('wrong-session')
  }
  const assetId = parsed.pathname.slice(session.prefix.length)
  if (!ASSET_ID.test(assetId)) throw new LoopbackFetchError('wrong-session')
  return url
}

function concat(chunks: Uint8Array[], total: number): ArrayBuffer {
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out.buffer as ArrayBuffer
}

/**
 * Cria o `fetchBytes` da sessão. Pode ser criado uma vez e usado em todos os
 * `open`; a página é lida a cada chamada (a sessão da página não muda, mas o
 * teste e o `location` real podem).
 */
export function createLoopbackFetch(
  options: LoopbackFetchOptions = {}
): (url: string) => Promise<ArrayBuffer> {
  const maxBytes = resolveOption(
    options.maxBytes,
    LOOPBACK_DEFAULT_MAX_BYTES,
    LOOPBACK_MAX_BYTES_LIMIT,
    'maxBytes'
  )
  const timeoutMs = resolveOption(
    options.timeoutMs,
    LOOPBACK_DEFAULT_TIMEOUT_MS,
    LOOPBACK_MAX_TIMEOUT_MS,
    'timeoutMs'
  )

  return async function fetchBytes(url: string): Promise<ArrayBuffer> {
    const page =
      options.page ??
      (globalThis as { location?: LoopbackPage }).location ??
      undefined
    const session = sessionOf(page)
    if (!session) throw new LoopbackFetchError('no-page')
    const target = validate(url, session)

    const fetchImpl =
      options.fetchImpl ??
      ((globalThis as { fetch?: unknown }).fetch as
        | LoopbackFetchImpl
        | undefined)
    if (typeof fetchImpl !== 'function') throw new LoopbackFetchError('network')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(target, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        mode: 'same-origin',
        signal: controller.signal
      })
      if (res.status === 413) throw new LoopbackFetchError('too-large')
      if (res.status !== 200) throw new LoopbackFetchError('http-status')

      const declared = Number(res.headers.get('content-length'))
      if (Number.isFinite(declared) && declared > maxBytes) {
        res.body
          ?.getReader()
          .cancel()
          .catch(() => undefined)
        throw new LoopbackFetchError('too-large')
      }
      if (!res.body) {
        const all = await res.arrayBuffer()
        if (all.byteLength > maxBytes) throw new LoopbackFetchError('too-large')
        return all
      }
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        total += value.byteLength
        if (total > maxBytes) {
          reader.cancel().catch(() => undefined)
          throw new LoopbackFetchError('too-large')
        }
        chunks.push(value)
      }
      return concat(chunks, total)
    } catch (error) {
      if (error instanceof LoopbackFetchError) throw error
      throw new LoopbackFetchError(
        controller.signal.aborted ? 'timeout' : 'network'
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
