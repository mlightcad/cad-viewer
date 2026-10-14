// SPDX-License-Identifier: GPL-3.0-or-later
//
// `HttpListenerPort` sobre um módulo TCP com a forma do `net` do Node (spec M3-I5
// §8 item 1; card M4-I6). Em produção o módulo é `react-native-tcp-socket`
// (`nativeListener.ts`); nos testes é o módulo `net` do Node com sockets reais de
// 127.0.0.1 — o MESMO código de HTTP corre nos dois.
//
// HTTP/1.1 estrito e mínimo: um pedido por ligação (`Connection: close`),
// `GET`/`HEAD` sem corpo (o núcleo decide), cabeçalhos ≤ 8 KiB terminados em
// CRLF, timeouts de cabeçalhos e de pedido, tecto de ligações, `close()`
// idempotente que corta TODAS as ligações e `onClosed` se o SO fechar o socket.
// Escuta só em `127.0.0.1` (o núcleo valida o endereço devolvido). Nunca
// regista nem ecoa a linha de pedido (contém o token).

import type {
  HeaderValue,
  HttpListenerPort,
  ListenAddress,
  RequestHandler,
  ServerResponse
} from './types.ts'

/** Ligação aceite: o subconjunto comum de `net.Socket` e do socket RN. */
export interface TcpSocketLike {
  on(event: 'data', fn: (chunk: Uint8Array | string) => void): unknown
  on(event: 'error', fn: (error: unknown) => void): unknown
  on(event: 'close', fn: () => void): unknown
  write(
    data: Uint8Array,
    encoding?: undefined,
    cb?: (error?: Error | null) => void
  ): unknown
  end(): unknown
  destroy(): unknown
}

export interface TcpServerLike {
  listen(options: { port: number; host: string }, cb: () => void): unknown
  address(): { address: string; port: number } | string | null
  close(cb?: (error?: Error) => void): unknown
  on(event: 'error', fn: (error: unknown) => void): unknown
  on(event: 'close', fn: () => void): unknown
}

export interface TcpModuleLike {
  createServer(onConnection: (socket: TcpSocketLike) => void): TcpServerLike
}

export interface TcpListenerTimers {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

export interface TcpHttpListenerOptions {
  /** Só para provar o fail-closed do núcleo; em produção é sempre 127.0.0.1. */
  bindHost?: string
  maxHeaderBytes?: number
  /** Da aceitação ao fim dos cabeçalhos. */
  headersTimeoutMs?: number
  /** Da aceitação ao início da resposta. */
  requestTimeoutMs?: number
  maxConnections?: number
  /** Espera máxima pelo `close` do servidor em `close()`. */
  closeTimeoutMs?: number
  /** Tamanho de cada `write` (limita cópias base64 na ponte RN). */
  writeChunkBytes?: number
  timers?: TcpListenerTimers
}

export const TCP_LISTENER_DEFAULTS = {
  bindHost: '127.0.0.1',
  maxHeaderBytes: 8 * 1024,
  headersTimeoutMs: 5_000,
  requestTimeoutMs: 10_000,
  maxConnections: 32,
  closeTimeoutMs: 1_000,
  writeChunkBytes: 256 * 1024
} as const

const defaultTimers: TcpListenerTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

const REASON: Readonly<Record<number, string>> = {
  200: 'OK',
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  431: 'Request Header Fields Too Large',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported'
}

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const REQUEST_LINE =
  /^([!#$%&'*+.^_`|~0-9A-Za-z-]+) ([\x21-\x7e]+) HTTP\/(\d)\.(\d)$/
/** Valor de cabeçalho: VCHAR/obs-text, espaço e tab; nunca CR/LF/NUL. */
const FIELD_VALUE = /^[\t\x20-\x7e\x80-\xff]*$/

export type ParsedRequest =
  | {
      ok: true
      method: string
      target: string
      headers: Record<string, HeaderValue>
    }
  | { ok: false; status: 400 | 505 }

/** `bytes` → string latin1 (1 byte = 1 código); sem `TextDecoder` (Hermes). */
function latin1(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 4096) {
    out += String.fromCharCode(...bytes.subarray(i, i + 4096))
  }
  return out
}

/**
 * Analisa o bloco de cabeçalhos (sem o CRLF CRLF final). Puro. Rejeita LF/CR
 * soltos, obs-fold, nomes inválidos e versões ≠ 1.1; nomes em minúsculas e
 * repetidos agrupados (o núcleo rejeita os que não podem repetir).
 */
export function parseRequestHead(head: string): ParsedRequest {
  const lines = head.split('\r\n')
  if (lines.some(l => l.includes('\r') || l.includes('\n'))) {
    return { ok: false, status: 400 }
  }
  const m = REQUEST_LINE.exec(lines[0])
  if (!m) return { ok: false, status: 400 }
  if (m[3] !== '1' || m[4] !== '1') return { ok: false, status: 505 }
  const headers: Record<string, HeaderValue> = {}
  for (const line of lines.slice(1)) {
    if (line === '' || line[0] === ' ' || line[0] === '\t') {
      return { ok: false, status: 400 }
    }
    const colon = line.indexOf(':')
    if (colon <= 0) return { ok: false, status: 400 }
    const name = line.slice(0, colon)
    const value = line.slice(colon + 1).replace(/^[ \t]+|[ \t]+$/g, '')
    if (!TOKEN.test(name) || !FIELD_VALUE.test(value)) {
      return { ok: false, status: 400 }
    }
    const key = name.toLowerCase()
    const prev = headers[key]
    headers[key] =
      prev === undefined
        ? value
        : [...(typeof prev === 'string' ? [prev] : (prev ?? [])), value]
  }
  return { ok: true, method: m[1], target: m[2], headers }
}

/** Cabeçalho de resposta seguro: nome token e valor sem CR/LF. */
function safeHeader(name: string, value: string): boolean {
  return TOKEN.test(name) && /^[\t\x20-\x7e]*$/.test(value)
}

/** Linha de estado + cabeçalhos; `null` se algum cabeçalho for inseguro. */
export function serializeHead(res: ServerResponse): Uint8Array | null {
  if (!Number.isInteger(res.status) || res.status < 100 || res.status > 599) {
    return null
  }
  let head = `HTTP/1.1 ${res.status} ${REASON[res.status] ?? 'Unknown'}\r\n`
  for (const name of Object.keys(res.headers)) {
    if (name.toLowerCase() === 'connection') continue
    const value = res.headers[name]
    if (!safeHeader(name, value)) return null
    head += `${name}: ${value}\r\n`
  }
  head += 'Connection: close\r\n\r\n'
  const bytes = new Uint8Array(head.length)
  for (let i = 0; i < head.length; i++) bytes[i] = head.charCodeAt(i)
  return bytes
}

function fixed(status: number): Uint8Array {
  return serializeHead({
    status,
    headers: { 'Content-Length': '0', 'Cache-Control': 'no-store' },
    body: null
  }) as Uint8Array
}

const CRLFCRLF = [13, 10, 13, 10]

function indexOfEnd(buf: Uint8Array, from: number): number {
  for (let i = Math.max(0, from - 3); i + 3 < buf.length; i++) {
    if (
      buf[i] === CRLFCRLF[0] &&
      buf[i + 1] === CRLFCRLF[1] &&
      buf[i + 2] === CRLFCRLF[2] &&
      buf[i + 3] === CRLFCRLF[3]
    ) {
      return i
    }
  }
  return -1
}

export interface TcpHttpListener extends HttpListenerPort {
  /** Ligações abertas neste instante (diagnóstico/testes). */
  openConnections(): number
}

export function createTcpHttpListener(
  net: TcpModuleLike,
  options: TcpHttpListenerOptions = {}
): TcpHttpListener {
  const o = { ...TCP_LISTENER_DEFAULTS, ...options }
  const timers = options.timers ?? defaultTimers
  const sockets = new Set<TcpSocketLike>()
  let server: TcpServerLike | null = null
  let closing: Promise<void> | null = null

  const kill = (socket: TcpSocketLike): void => {
    sockets.delete(socket)
    try {
      socket.destroy()
    } catch {
      // já fechado
    }
  }

  /** Escreve em troços e fecha (FIN) só depois do último. */
  const send = (
    socket: TcpSocketLike,
    head: Uint8Array,
    body: Uint8Array | null
  ): void => {
    const parts: Uint8Array[] = [head]
    if (body) {
      for (let i = 0; i < body.byteLength; i += o.writeChunkBytes) {
        parts.push(body.subarray(i, i + o.writeChunkBytes))
      }
    }
    try {
      parts.forEach((part, i) => {
        if (i < parts.length - 1) socket.write(part)
        else
          socket.write(part, undefined, error => {
            if (error) kill(socket)
            else {
              try {
                socket.end()
              } catch {
                kill(socket)
              }
            }
          })
      })
    } catch {
      kill(socket)
    }
  }

  const accept = (socket: TcpSocketLike, handler: RequestHandler): void => {
    if (closing || sockets.size >= o.maxConnections) {
      kill(socket)
      return
    }
    sockets.add(socket)
    let buf = new Uint8Array(0)
    let phase: 'head' | 'handling' | 'done' = 'head'
    const headersTimer = timers.set(() => {
      if (phase === 'head') kill(socket)
    }, o.headersTimeoutMs)
    const requestTimer = timers.set(() => {
      if (phase !== 'done') kill(socket)
    }, o.requestTimeoutMs)
    const finish = (head: Uint8Array, body: Uint8Array | null): void => {
      phase = 'done'
      timers.clear(headersTimer)
      timers.clear(requestTimer)
      if (!sockets.has(socket)) return
      send(socket, head, body)
    }

    socket.on('error', () => kill(socket))
    socket.on('close', () => {
      sockets.delete(socket)
      timers.clear(headersTimer)
      timers.clear(requestTimer)
    })
    socket.on('data', chunk => {
      // um pedido por ligação: o que vier depois dos cabeçalhos é ignorado
      if (phase !== 'head') return
      const bytes =
        typeof chunk === 'string'
          ? Uint8Array.from(chunk, c => c.charCodeAt(0) & 0xff)
          : chunk
      const from = buf.length
      const next = new Uint8Array(buf.length + bytes.length)
      next.set(buf)
      next.set(bytes, buf.length)
      buf = next
      const end = indexOfEnd(buf, from)
      if (end < 0) {
        if (buf.length > o.maxHeaderBytes) finish(fixed(431), null)
        return
      }
      if (end + 4 > o.maxHeaderBytes) {
        finish(fixed(431), null)
        return
      }
      const parsed = parseRequestHead(latin1(buf.subarray(0, end)))
      buf = new Uint8Array(0)
      if (!parsed.ok) {
        finish(fixed(parsed.status), null)
        return
      }
      phase = 'handling'
      timers.clear(headersTimer)
      handler({
        method: parsed.method,
        target: parsed.target,
        headers: parsed.headers
      }).then(
        res => {
          if (phase !== 'handling') return
          const head = serializeHead(res)
          if (!head) finish(fixed(500), null)
          else finish(head, res.body)
        },
        () => {
          if (phase === 'handling') finish(fixed(500), null)
        }
      )
    })
  }

  function closeServer(): Promise<void> {
    if (closing) return closing
    const s = server
    server = null
    for (const socket of [...sockets]) kill(socket)
    if (!s) {
      closing = Promise.resolve()
      return closing
    }
    closing = new Promise<void>(resolve => {
      let done = false
      const finish = (): void => {
        if (done) return
        done = true
        timers.clear(timer)
        resolve()
      }
      // o socket RN pode não emitir `close` se não estava a escutar
      const timer = timers.set(finish, o.closeTimeoutMs)
      try {
        s.close(() => finish())
      } catch {
        finish()
      }
    })
    return closing
  }

  return {
    openConnections: () => sockets.size,

    async listen(
      handler: RequestHandler,
      onClosed: () => void
    ): Promise<ListenAddress> {
      if (server) throw new Error('listener já activo')
      closing = null
      const s = net.createServer(socket => accept(socket, handler))
      server = s
      let listening = false
      let address: ListenAddress
      try {
        address = await new Promise<ListenAddress>((resolve, reject) => {
          s.on('error', error => {
            if (!listening) {
              reject(error)
              return
            }
            // o SO fechou o socket de escuta: corta tudo e avisa o núcleo
            if (!closing && server === s) {
              server = null
              for (const socket of [...sockets]) kill(socket)
              try {
                s.close()
              } catch {
                // já fechado
              }
              onClosed()
            }
          })
          s.on('close', () => {
            if (listening && !closing && server === s) {
              server = null
              for (const socket of [...sockets]) kill(socket)
              onClosed()
            }
          })
          s.listen({ port: 0, host: o.bindHost }, () => {
            listening = true
            const a = s.address()
            if (!a || typeof a === 'string') {
              reject(new Error('endereço do listener desconhecido'))
              return
            }
            resolve({ host: a.address, port: a.port })
          })
        })
      } catch (error) {
        // qualquer rejeição: fecha o socket criado antes de rejeitar e limpa o estado
        if (server === s) await closeServer()
        else await closing
        throw error
      }
      return address
    },

    close: closeServer
  }
}
