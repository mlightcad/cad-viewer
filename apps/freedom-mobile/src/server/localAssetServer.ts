// SPDX-License-Identifier: GPL-3.0-or-later
//
// LocalAssetServer (docs/OBJ-0104-m3-i5-local-asset-server-spec.md): serve o
// bundle do viewer e os documentos abertos **só** em `127.0.0.1`, atrás de um
// token por sessão, com ciclo de vida explícito. Puro: o socket entra pela
// `HttpListenerPort`, os bytes pelo `BundleSourcePort`/`AssetBytesPort`.
//
// Invariantes: (1) todo o acesso morre no instante em que `stop()` é chamado
// (token e concessões apagados de forma síncrona); (2) um pedido nunca vira um
// caminho de ficheiro; (3) nada do pedido, do token nem de caminhos internos
// sai em respostas, eventos ou erros; (4) `handle` nunca rejeita.

import {
  type DocumentFormat,
  MAX_DOCUMENT_BYTES
} from '../contracts/protocol.ts'
import { isAssetId } from '../files/names.ts'
import type { AssetUrlPort } from '../files/ports.ts'
import { MAX_BUNDLE_FILE_BYTES } from './bundle.ts'
import { LocalServerError } from './errors.ts'
import {
  ASSET_ROUTE,
  buildAssetPath,
  buildViewerPath,
  contentTypeFor,
  INDEX_FILE,
  isHtmlPath,
  parseTarget,
  ROUTE_PREFIX
} from './paths.ts'
import {
  checkRequestHeaders,
  COMMON_HEADERS,
  DEFAULT_CSP,
  defaultRandomBytes,
  ERROR_TEXT,
  safeEqual,
  TOKEN_BYTES,
  tokenFromBytes
} from './security.ts'
import type {
  AssetBytesPort,
  BundleSourcePort,
  HttpListenerPort,
  ListenAddress,
  ServerEvent,
  ServerInfo,
  ServerRequest,
  ServerResponse,
  ServerState
} from './types.ts'

export interface ServerLimits {
  /** Pedidos simultâneos; acima → 503 `busy`. */
  maxInFlight: number
  /** Leituras de assets simultâneas (cada uma traz o ficheiro para memória). */
  maxAssetReads: number
  /** Assets com URL válido ao mesmo tempo; o mais antigo é revogado. */
  maxGrants: number
  /** Tempo máximo de uma leitura (bundle ou asset) → 504. */
  requestTimeoutMs: number
  /** Espera por pedidos em curso no `stop()`. */
  drainTimeoutMs: number
  maxBundleFileBytes: number
}

export const DEFAULT_LIMITS: Readonly<ServerLimits> = {
  maxInFlight: 16,
  maxAssetReads: 2,
  maxGrants: 4,
  requestTimeoutMs: 30_000,
  drainTimeoutMs: 2_000,
  maxBundleFileBytes: MAX_BUNDLE_FILE_BYTES
}

export interface ServerTimers {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const defaultTimers: ServerTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

export interface LocalAssetServerDeps {
  listener: HttpListenerPort
  bundle: BundleSourcePort
  assets: AssetBytesPort
  /** Por omissão `crypto.getRandomValues` (sem ele o servidor não arranca). */
  randomBytes?: (length: number) => Uint8Array
  onEvent?: (event: ServerEvent) => void
  now?: () => number
  timers?: ServerTimers
  limits?: Partial<ServerLimits>
  /** `null` = sem CSP (não recomendado); por omissão `DEFAULT_CSP`. */
  contentSecurityPolicy?: string | null
}

const LOOPBACK_HOST = '127.0.0.1'

interface Session {
  epoch: number
  token: string
  origin: string
  host: string
  /** assetId → formato; ordem de inserção = do mais antigo ao mais recente. */
  grants: Map<string, DocumentFormat>
  inFlight: number
  assetReads: number
  idleWaiters: (() => void)[]
}

type Route = 'bundle' | 'asset' | 'rejected'

interface Routed {
  route: Route
  response: ServerResponse
}

class RequestTimeout extends Error {}

const noop = (): void => undefined

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0x7f
  return out
}

function isLoopbackAddress(a: ListenAddress | null | undefined): boolean {
  return (
    !!a &&
    a.host === LOOPBACK_HOST &&
    Number.isInteger(a.port) &&
    a.port >= 1 &&
    a.port <= 65535
  )
}

export class LocalAssetServer implements AssetUrlPort {
  private readonly deps: LocalAssetServerDeps
  private readonly limits: ServerLimits
  private readonly timers: ServerTimers
  private readonly now: () => number
  private readonly random: (length: number) => Uint8Array
  private readonly csp: string | null

  private currentState: ServerState = 'stopped'
  private session: Session | null = null
  private starting: Promise<ServerInfo> | null = null
  private stopping: Promise<void> | null = null
  private epoch = 0
  private cancelledEpoch = -1
  /** Arranque cujo listener fechou antes de o `listen` resolver. */
  private lostEpoch = -1
  private disposeRequested = false

  constructor(deps: LocalAssetServerDeps) {
    this.deps = deps
    this.limits = { ...DEFAULT_LIMITS, ...deps.limits }
    this.timers = deps.timers ?? defaultTimers
    this.now = deps.now ?? Date.now
    this.random = deps.randomBytes ?? defaultRandomBytes
    this.csp =
      deps.contentSecurityPolicy === undefined
        ? DEFAULT_CSP
        : deps.contentSecurityPolicy
  }

  // -- estado -----------------------------------------------------------------

  get state(): ServerState {
    return this.currentState
  }

  /** `null` fora de `running`. Contém o token: nunca registar. */
  get info(): ServerInfo | null {
    const s = this.session
    if (!s || this.currentState !== 'running') return null
    return {
      origin: s.origin,
      viewerUrl: `${s.origin}${buildViewerPath(s.token)}`
    }
  }

  /** Diagnóstico (só leitura; usado nos testes). */
  get stats(): { inFlight: number; assetReads: number; grants: number } {
    const s = this.session
    return {
      inFlight: s?.inFlight ?? 0,
      assetReads: s?.assetReads ?? 0,
      grants: s?.grants.size ?? 0
    }
  }

  // -- ciclo de vida ------------------------------------------------------------

  start(): Promise<ServerInfo> {
    if (this.disposeRequested) {
      return Promise.reject(new LocalServerError('disposed'))
    }
    switch (this.currentState) {
      case 'running':
        return Promise.resolve(this.info as ServerInfo)
      case 'starting': {
        const pending = this.starting as Promise<ServerInfo>
        // Um `stop()` já pediu o cancelamento deste arranque: o `start()` novo
        // espera o fim e arranca uma sessão limpa (nunca herda o cancelamento).
        if (this.cancelledEpoch === this.epoch) {
          return pending.then(noop, noop).then(() => this.start())
        }
        return pending
      }
      case 'stopping':
        return (this.stopping as Promise<void>).then(() => this.start())
      default: {
        // O estado muda em silêncio e o evento só sai depois de `starting`
        // estar atribuído: um observador reentrante vê sempre a promessa.
        this.currentState = 'starting'
        const run = this.doStart().finally(() => {
          if (this.starting === run) this.starting = null
        })
        this.starting = run
        this.emit({ kind: 'state', state: 'starting' })
        return run
      }
    }
  }

  stop(): Promise<void> {
    switch (this.currentState) {
      case 'stopped':
      case 'disposed':
        return Promise.resolve()
      case 'stopping':
        return this.stopping as Promise<void>
      case 'starting':
        this.cancelledEpoch = this.epoch
        return (this.starting as Promise<ServerInfo>).then(noop, noop)
      default: {
        const s = this.session
        // Síncrono: daqui em diante nenhum pedido novo ou em curso serve dados.
        this.session = null
        this.currentState = 'stopping'
        const run = this.doStop(s).finally(() => {
          if (this.stopping === run) this.stopping = null
        })
        this.stopping = run
        this.emit({ kind: 'state', state: 'stopping' })
        return run
      }
    }
  }

  /** Fim de vida (unmount): pára e fica inutilizável. */
  async dispose(): Promise<void> {
    this.disposeRequested = true
    await this.stop()
    this.setState('disposed')
  }

  private async doStart(): Promise<ServerInfo> {
    const epoch = ++this.epoch

    let token: string
    try {
      const bytes = this.random(TOKEN_BYTES)
      if (!(bytes instanceof Uint8Array) || bytes.length !== TOKEN_BYTES) {
        throw new LocalServerError('no-secure-random')
      }
      token = tokenFromBytes(bytes)
    } catch (error) {
      this.setState('stopped')
      throw error instanceof LocalServerError
        ? error
        : new LocalServerError('no-secure-random', error)
    }

    let address: ListenAddress
    try {
      address = await this.deps.listener.listen(
        req => this.handle(req, epoch),
        () => this.onListenerClosed(epoch)
      )
    } catch (error) {
      this.setState('stopped')
      throw new LocalServerError('listen-failed', error)
    }

    if (this.cancelledEpoch === epoch) {
      await this.closeListener()
      this.setState('stopped')
      throw new LocalServerError('stopped-during-start')
    }
    if (this.lostEpoch === epoch) {
      await this.closeListener()
      this.setState('stopped')
      throw new LocalServerError(
        'listen-failed',
        'listener fechado durante o arranque'
      )
    }
    if (!isLoopbackAddress(address)) {
      await this.closeListener()
      this.setState('stopped')
      throw new LocalServerError('not-loopback')
    }

    const host = `${LOOPBACK_HOST}:${address.port}`
    this.session = {
      epoch,
      token,
      origin: `http://127.0.0.1:${address.port}`,
      host,
      grants: new Map(),
      inFlight: 0,
      assetReads: 0,
      idleWaiters: []
    }
    this.setState('running')
    return this.info as ServerInfo
  }

  private async doStop(s: Session | null): Promise<void> {
    if (s) {
      const revoked = s.grants.size
      s.grants.clear()
      if (revoked > 0) this.emit({ kind: 'revoke', active: 0 })
    }
    await this.closeListener()
    if (s) await this.drain(s)
    this.setState('stopped')
  }

  private async closeListener(): Promise<void> {
    try {
      await this.deps.listener.close()
    } catch {
      this.emit({ kind: 'close-failed' })
    }
  }

  private drain(s: Session): Promise<void> {
    if (s.inFlight === 0) return Promise.resolve()
    return new Promise<void>(resolve => {
      const timer = this.timers.set(() => {
        this.emit({ kind: 'drain-timeout', pending: s.inFlight })
        resolve()
      }, this.limits.drainTimeoutMs)
      s.idleWaiters.push(() => {
        this.timers.clear(timer)
        resolve()
      })
    })
  }

  private onListenerClosed(epoch: number): void {
    if (this.currentState === 'starting' && epoch === this.epoch) {
      this.lostEpoch = epoch
      return
    }
    const s = this.session
    if (!s || s.epoch !== epoch || this.currentState !== 'running') return
    this.session = null
    s.grants.clear()
    this.setState('stopped')
    this.emit({ kind: 'listener-lost' })
    void this.closeListener()
  }

  private setState(state: ServerState): void {
    if (this.currentState === state) return
    this.currentState = state
    this.emit({ kind: 'state', state })
  }

  // -- AssetUrlPort -------------------------------------------------------------

  available(): boolean {
    return this.currentState === 'running' && this.session !== null
  }

  /** Concede o asset e devolve o seu URL de loopback; `null` fora de `running`. */
  urlFor(assetId: string, format: DocumentFormat): string | null {
    const s = this.session
    if (!s || this.currentState !== 'running') return null
    if (!isAssetId(assetId) || (format !== 'dwg' && format !== 'dxf')) {
      return null
    }
    s.grants.delete(assetId)
    s.grants.set(assetId, format)
    while (s.grants.size > this.limits.maxGrants) {
      const oldest = s.grants.keys().next().value as string
      s.grants.delete(oldest)
      this.emit({ kind: 'revoke', active: s.grants.size })
    }
    this.emit({ kind: 'grant', active: s.grants.size })
    return `${s.origin}${buildAssetPath(s.token, assetId)}`
  }

  /** Revoga o URL do asset (antes de o ficheiro ser apagado). */
  release(assetId: string): void {
    const s = this.session
    if (s && s.grants.delete(assetId)) {
      this.emit({ kind: 'revoke', active: s.grants.size })
    }
  }

  // -- pedidos --------------------------------------------------------------------

  /** Chamado pelo listener (com o `epoch` da sessão que o criou). Nunca rejeita. */
  async handle(req: ServerRequest, epoch?: number): Promise<ServerResponse> {
    const started = this.now()
    const s = this.session
    if (!s || (epoch !== undefined && s.epoch !== epoch)) {
      return this.finish(req, 'rejected', this.error(503), started)
    }
    if (s.inFlight >= this.limits.maxInFlight) {
      return this.finish(req, 'rejected', this.busy(), started)
    }
    s.inFlight++
    try {
      const routed = await this.route(s, req)
      // O `stop()` chegou enquanto o pedido corria: nada é servido.
      if (this.session !== s) {
        return this.finish(req, 'rejected', this.error(503), started)
      }
      return this.finish(req, routed.route, routed.response, started)
    } catch {
      return this.finish(req, 'rejected', this.error(500), started)
    } finally {
      s.inFlight--
      if (s.inFlight === 0) {
        for (const wake of s.idleWaiters.splice(0)) wake()
      }
    }
  }

  private finish(
    req: ServerRequest,
    route: Route,
    response: ServerResponse,
    started: number
  ): ServerResponse {
    this.emit({
      kind: 'request',
      route,
      status: response.status,
      ms: Math.max(0, this.now() - started)
    })
    return req && req.method === 'HEAD' ? { ...response, body: null } : response
  }

  private async route(s: Session, req: ServerRequest): Promise<Routed> {
    const rejected = (
      status: number,
      extra?: Record<string, string>
    ): Routed => ({
      route: 'rejected',
      response: this.error(status, extra)
    })

    if (typeof req !== 'object' || req === null) return rejected(400)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return rejected(405, { Allow: 'GET, HEAD' })
    }
    const headers = checkRequestHeaders(req.headers ?? {}, {
      host: s.host,
      origin: s.origin
    })
    if (!headers.ok) return rejected(headers.status)

    const target = parseTarget(req.target)
    if (!target.ok) return rejected(target.status)
    const { segments, trailingSlash } = target
    if (
      segments.length < 2 ||
      segments[0] !== ROUTE_PREFIX ||
      !safeEqual(segments[1], s.token)
    ) {
      return rejected(404)
    }
    const rest = segments.slice(2)
    const head = req.method === 'HEAD'

    if (rest[0] === ASSET_ROUTE) {
      if (rest.length !== 2 || trailingSlash) return rejected(404)
      return {
        route: 'asset',
        response: await this.serveAsset(s, rest[1], head)
      }
    }
    if (rest.length === 0) {
      // A raiz tem de terminar em `/`: os URLs relativos do HTML dependem disso.
      if (!trailingSlash) return rejected(404)
      return {
        route: 'bundle',
        response: await this.serveBundle(INDEX_FILE, head)
      }
    }
    if (trailingSlash) return rejected(404)
    return {
      route: 'bundle',
      response: await this.serveBundle(rest.join('/'), head)
    }
  }

  // -- bundle -------------------------------------------------------------------

  private async serveBundle(
    path: string,
    head: boolean
  ): Promise<ServerResponse> {
    const entry = this.deps.bundle.lookup(path)
    if (!entry) return this.error(404)
    if (
      !Number.isInteger(entry.size) ||
      entry.size < 0 ||
      entry.size > this.limits.maxBundleFileBytes
    ) {
      return this.error(500)
    }
    const extra: Record<string, string> = {}
    if (isHtmlPath(path) && this.csp !== null) {
      extra['Content-Security-Policy'] = this.csp
    }
    if (head) return this.ok(null, entry.size, contentTypeFor(path), extra)
    try {
      const bytes = await this.race(entry.read())
      if (bytes.byteLength !== entry.size) return this.error(500)
      return this.ok(bytes, bytes.byteLength, contentTypeFor(path), extra)
    } catch (error) {
      return this.error(error instanceof RequestTimeout ? 504 : 500)
    }
  }

  // -- assets ---------------------------------------------------------------------

  private async serveAsset(
    s: Session,
    assetId: string,
    head: boolean
  ): Promise<ServerResponse> {
    if (!isAssetId(assetId)) return this.error(404)
    const format = s.grants.get(assetId)
    if (!format) return this.error(404)
    if (s.assetReads >= this.limits.maxAssetReads) return this.busy()

    s.assetReads++
    // A leitura continua mesmo que a resposta já tenha saído por tempo: o lugar
    // só é libertado quando o trabalho de facto termina (memória limitada).
    const work = (async (): Promise<ServerResponse> => {
      const size = await this.deps.assets.sizeOf(assetId)
      // `stop()` e `release()` apagam a concessão: sem ela não se lê nada
      // (`handle` responde 503 se foi o servidor que parou)
      if (size === null || !s.grants.has(assetId)) return this.error(404)
      if (!Number.isInteger(size) || size <= 0) return this.error(500)
      if (size > MAX_DOCUMENT_BYTES[format]) return this.error(413)
      const extra = { 'Content-Disposition': 'attachment' }
      if (head) return this.ok(null, size, 'application/octet-stream', extra)
      const bytes = await this.deps.assets.read(assetId)
      // `handle` converte em 503 se o servidor parou entretanto; a concessão
      // revogada durante a leitura é decidida aqui (404, nunca os bytes)
      if (!s.grants.has(assetId)) return this.error(404)
      if (bytes.byteLength !== size) return this.error(500)
      return this.ok(bytes, size, 'application/octet-stream', extra)
    })()
    const settled = work.then(noop, noop).finally(() => {
      s.assetReads--
    })
    void settled
    try {
      return await this.race(work)
    } catch (error) {
      return this.error(error instanceof RequestTimeout ? 504 : 500)
    }
  }

  // -- respostas ------------------------------------------------------------------

  private race<T>(work: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = this.timers.set(
        () => reject(new RequestTimeout()),
        this.limits.requestTimeoutMs
      )
      work.then(
        value => {
          this.timers.clear(timer)
          resolve(value)
        },
        error => {
          this.timers.clear(timer)
          reject(error)
        }
      )
    })
  }

  private ok(
    body: Uint8Array | null,
    length: number,
    contentType: string,
    extra: Record<string, string> = {}
  ): ServerResponse {
    return {
      status: 200,
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': contentType,
        'Content-Length': String(length),
        ...extra
      },
      body
    }
  }

  private error(
    status: number,
    extra: Record<string, string> = {}
  ): ServerResponse {
    const text = ERROR_TEXT[status] ?? ERROR_TEXT[500]
    return {
      status,
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(text.length),
        ...extra
      },
      body: ascii(text)
    }
  }

  private busy(): ServerResponse {
    return this.error(503, { 'Retry-After': '1' })
  }

  private emit(event: ServerEvent): void {
    try {
      this.deps.onEvent?.(event)
    } catch {
      // um observador com defeito nunca derruba o servidor
    }
  }
}
