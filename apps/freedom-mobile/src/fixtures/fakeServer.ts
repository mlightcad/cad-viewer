// SPDX-License-Identifier: GPL-3.0-or-later
//
// Portas falsas do servidor loopback (M3-I5): listener, bytes dos assets e
// construtores de pedidos. Determinísticas: sem sockets, sem relógio, com portões
// (`gate`) para forçar a ordem de corridas e contadores de concorrência.

import { createMemoryBundle } from '../server/bundle.ts'
import {
  LocalAssetServer,
  type LocalAssetServerDeps
} from '../server/localAssetServer.ts'
import type {
  AssetBytesPort,
  HeaderValue,
  HttpListenerPort,
  ListenAddress,
  RequestHandler,
  ServerEvent,
  ServerInfo,
  ServerRequest,
  ServerResponse
} from '../server/types.ts'

export const FAKE_PORT = 43210
export const FAKE_HOST = `127.0.0.1:${FAKE_PORT}`
export const FAKE_ORIGIN = `http://127.0.0.1:${FAKE_PORT}`

/** Caminho "interno" sentinela: nunca pode aparecer em respostas/eventos/erros. */
export const SECRET_PATH = '/data/user/0/pt.aitra.freedom/cache/freedom-assets'

export class FakeListener implements HttpListenerPort {
  address: ListenAddress = { host: '127.0.0.1', port: FAKE_PORT }
  handler: RequestHandler | null = null
  onClosed: (() => void) | null = null
  listenCalls = 0
  closeCalls = 0
  failListen: Error | null = null
  failClose: Error | null = null
  /** O próximo `listen`/`close` fica à espera destes promises (uso único). */
  listenGate: Promise<void> | null = null
  closeGate: Promise<void> | null = null

  async listen(
    handler: RequestHandler,
    onClosed: () => void
  ): Promise<ListenAddress> {
    this.listenCalls++
    const gate = this.listenGate
    this.listenGate = null
    if (gate) await gate
    if (this.failListen) throw this.failListen
    this.handler = handler
    this.onClosed = onClosed
    return this.address
  }

  async close(): Promise<void> {
    this.closeCalls++
    const gate = this.closeGate
    this.closeGate = null
    if (gate) await gate
    if (this.failClose) throw this.failClose
    this.handler = null
  }

  /** Entrega um pedido ao handler registado (como faria o socket). */
  request(req: ServerRequest): Promise<ServerResponse> {
    if (!this.handler) throw new Error('listener fechado')
    return this.handler(req)
  }

  /** O SO fecha o socket sozinho (app suspensa). */
  lose(): void {
    this.onClosed?.()
  }
}

/** Promise controlável à mão (portões determinísticos). */
export function deferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export class FakeAssetBytes implements AssetBytesPort {
  readonly files = new Map<string, Uint8Array>()
  sizeCalls = 0
  readCalls = 0
  /** Leituras a decorrer neste instante e o máximo observado. */
  reading = 0
  maxReading = 0
  failSize: Error | null = null
  failRead: Error | null = null
  /** `sizeOf` devolve isto em vez do tamanho real (tectos, TOCTOU). */
  sizeOverride: number | null = null
  /** A próxima `read` fica à espera deste promise (uso único). */
  readGate: Promise<void> | null = null
  sizeGate: Promise<void> | null = null

  add(assetId: string, bytes: Uint8Array | string): this {
    this.files.set(
      assetId,
      typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
    )
    return this
  }

  async sizeOf(assetId: string): Promise<number | null> {
    this.sizeCalls++
    const gate = this.sizeGate
    this.sizeGate = null
    if (gate) await gate
    if (this.failSize) throw this.failSize
    const bytes = this.files.get(assetId)
    if (!bytes) return null
    return this.sizeOverride ?? bytes.byteLength
  }

  async read(assetId: string): Promise<Uint8Array> {
    this.readCalls++
    this.reading++
    this.maxReading = Math.max(this.maxReading, this.reading)
    try {
      const gate = this.readGate
      this.readGate = null
      if (gate) await gate
      if (this.failRead) throw this.failRead
      const bytes = this.files.get(assetId)
      if (!bytes) throw new Error(`ENOENT: ${SECRET_PATH}/${assetId}`)
      return bytes
    } finally {
      this.reading--
    }
  }
}

export const BUNDLE_FILES = {
  'index.html':
    '<!doctype html><title>viewer</title><script type="module" src="./assets/app.js"></script>',
  'assets/app.js': 'export const viewer = 1',
  'assets/style.css': 'body{margin:0}',
  'assets/libredwg-web.wasm': new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]),
  'assets/data.bin': new Uint8Array([1, 2, 3])
}

export function req(
  target: string,
  init: {
    method?: string
    host?: string | null
    headers?: Record<string, HeaderValue>
  } = {}
): ServerRequest {
  const headers: Record<string, HeaderValue> = {}
  if (init.host !== null) headers.host = init.host ?? FAKE_HOST
  Object.assign(headers, init.headers)
  return { method: init.method ?? 'GET', target, headers }
}

export interface ServerRig {
  server: LocalAssetServer
  listener: FakeListener
  assets: FakeAssetBytes
  events: ServerEvent[]
  /** Tokens deterministas: cada `start` consome o próximo. */
  tokenBytes: () => Uint8Array
  start(): Promise<ServerInfo>
  /** Token da sessão actual (vem do `viewerUrl`). */
  token(): string
  path(rest: string): string
}

/** Servidor + portas falsas; `randomBytes` determinístico e distinto por sessão. */
export function makeRig(
  overrides: Partial<LocalAssetServerDeps> = {}
): ServerRig {
  const listener = new FakeListener()
  const assets = new FakeAssetBytes()
  const events: ServerEvent[] = []
  let session = 0
  const tokenBytes = (): Uint8Array => {
    session++
    return Uint8Array.from(
      { length: 32 },
      (_, i) => (session * 37 + i * 11) & 255
    )
  }
  const server = new LocalAssetServer({
    listener,
    bundle: createMemoryBundle(BUNDLE_FILES),
    assets,
    randomBytes: tokenBytes,
    onEvent: e => events.push(e),
    ...overrides
  })
  const rig: ServerRig = {
    server,
    listener,
    assets,
    events,
    tokenBytes,
    start: () => server.start(),
    token: () => {
      const info = server.info
      if (!info) throw new Error('servidor parado')
      return /\/s\/([^/]+)\//.exec(info.viewerUrl)![1]
    },
    path: rest => `/s/${rig.token()}/${rest}`
  }
  return rig
}

export function bodyText(res: ServerResponse): string {
  return res.body ? new TextDecoder().decode(res.body) : ''
}
