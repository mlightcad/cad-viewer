// SPDX-License-Identifier: GPL-3.0-or-later
//
// Cliente da ponte app → viewer (docs/OBJ-0104-architecture.md §5.1–§5.4).
// Puro: sem React Native. A WebView entra só como `inject(script)`; relógio e
// timers são injectáveis. Tudo o que acontece (envio, fila, resposta, erro,
// timeout, mensagem inválida) sai como `BridgeEvent` — nada é descartado nem
// substituído por um valor por omissão (fail-closed).

import {
  type AppMessage,
  type AppPayloads,
  type AppToViewerType,
  buildAppMessage,
  createIdGenerator,
  encodeInjection,
  type ErrorPayload,
  type FindActivePayload,
  type FindResultPayload,
  type LogPayload,
  type OpenedPayload,
  type OpenFailedCode,
  type OutgoingError,
  parseViewerMessage,
  type ProtocolErrorCode,
  type ReadyPayload,
  type ViewerMessage,
  type ViewerToAppType
} from '../contracts/protocol.ts'
import { READY_TIMEOUT_MS } from '../shell/shellState.ts'

/** Tempo máximo entre `open` e `opened`/`openFailed` ([H] §5.3). */
export const OPEN_TIMEOUT_MS = 120_000
/**
 * Máximo de ids pendentes retidos para correlacionar respostas/`error`. Ao
 * exceder, sai o mais antigo que **não** seja operação activa (`open` em curso,
 * `find` actual, última navegação): estas nunca são despejadas, para que a sua
 * resposta válida não vire `stale-reply`.
 */
export const MAX_TRACKED = 256

export type BridgePhase = 'booting' | 'ready' | 'failed'

/** Rejeições locais do cliente, além das de validação do contrato. */
export type CommandRejectCode =
  | OutgoingError['code']
  | 'not-ready'
  | 'viewer-unavailable'
  | 'send-failed'

export interface CommandRejection {
  code: CommandRejectCode
  message: string
}

export type BridgeIssueCode =
  | ProtocolErrorCode
  | 'duplicate-ready'
  | 'wrong-reply-type'

export type BridgeEvent =
  | { kind: 'ready'; payload: ReadyPayload }
  | { kind: 'ready-timeout' }
  | { kind: 'process-gone' }
  /** Aceite mas ainda não enviado (só `open`, antes de `ready`). */
  | { kind: 'command-queued'; id: string; message: AppMessage }
  | { kind: 'command-sent'; id: string; message: AppMessage }
  | {
      kind: 'command-rejected'
      command: AppToViewerType
      error: CommandRejection
    }
  /** `open` em fila substituído por um mais recente (§5.1); sem falha. */
  | { kind: 'open-superseded'; id: string }
  | { kind: 'opened'; replyTo: string; payload: OpenedPayload }
  /**
   * Abertura terminada sem documento. `send-failed`: o `open` em fila não pôde
   * ser entregue no `ready` (inject lançou) — sem `SendOutcome` a quem o pediu,
   * a falha só existe como este evento.
   */
  | {
      kind: 'open-failed'
      replyTo: string | null
      code: OpenFailedCode | 'send-failed'
      message: string
      origin: 'viewer' | 'local'
    }
  | { kind: 'find-result'; replyTo: string; payload: FindResultPayload }
  /**
   * O `goto{index:0}` automático após `findResult` (§5.4) foi rejeitado
   * localmente; `findId`/`replyTo` = pesquisa a que pertencia.
   */
  | {
      kind: 'find-navigation-failed'
      replyTo: string
      findId: number
      error: CommandRejection
    }
  | { kind: 'find-active'; replyTo: string; payload: FindActivePayload }
  /** `error` do viewer; `command` = comando original, se conhecido. */
  | {
      kind: 'viewer-error'
      command: AppToViewerType | null
      replyTo: string | null
      payload: ErrorPayload
    }
  /** Resposta a um id que já não está pendente (descartada com razão visível). */
  | { kind: 'stale-reply'; type: ViewerToAppType; replyTo: string | null }
  | { kind: 'protocol-error'; code: BridgeIssueCode; message: string }
  | { kind: 'log'; payload: LogPayload }

export interface Timers {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: h => clearTimeout(h as ReturnType<typeof setTimeout>)
}

export interface BridgeClientDeps {
  /** `webview.injectJavaScript`; pode lançar (ref em falta) — vira `send-failed`. */
  inject: (script: string) => void
  onEvent: (event: BridgeEvent) => void
  timers?: Timers
  readyTimeoutMs?: number
  openTimeoutMs?: number
}

export type SendOutcome =
  | { ok: true; id: string; queued: boolean }
  | { ok: false; error: CommandRejection }

type Rejector = (
  command: AppToViewerType,
  error: CommandRejection
) => SendOutcome

const REPLY_TYPES: Partial<
  Record<ViewerToAppType, readonly AppToViewerType[]>
> = {
  opened: ['open'],
  openFailed: ['open'],
  findResult: ['find'],
  findActive: ['goto', 'findNext', 'findPrev']
}

export class BridgeClient {
  private phaseValue: BridgePhase = 'booting'
  private readonly nextId = createIdGenerator('a')
  private readonly timers: Timers
  private readonly openTimeoutMs: number
  private readonly pending = new Map<string, AppToViewerType>()
  private queuedOpen: AppMessage | null = null
  private inFlightOpenId: string | null = null
  private latestFindId: string | null = null
  private latestNavId: string | null = null
  private readyTimer: unknown = null
  private openTimer: unknown = null
  private disposed = false

  private readonly deps: BridgeClientDeps

  constructor(deps: BridgeClientDeps) {
    this.deps = deps
    this.timers = deps.timers ?? defaultTimers
    this.openTimeoutMs = deps.openTimeoutMs ?? OPEN_TIMEOUT_MS
    this.readyTimer = this.timers.set(
      () => this.onReadyTimeout(),
      deps.readyTimeoutMs ?? READY_TIMEOUT_MS
    )
  }

  get phase(): BridgePhase {
    return this.phaseValue
  }

  // -- comandos app → viewer ------------------------------------------------

  open(payload: AppPayloads['open']): SendOutcome {
    return this.send('open', payload)
  }
  find(payload: AppPayloads['find']): SendOutcome {
    return this.send('find', payload)
  }
  goto(payload: AppPayloads['goto']): SendOutcome {
    return this.send('goto', payload)
  }
  findNext(payload: AppPayloads['findNext']): SendOutcome {
    return this.send('findNext', payload)
  }
  findPrev(payload: AppPayloads['findPrev']): SendOutcome {
    return this.send('findPrev', payload)
  }
  zoom(payload: AppPayloads['zoom']): SendOutcome {
    return this.send('zoom', payload)
  }
  clearHighlight(): SendOutcome {
    return this.send('clearHighlight', {})
  }
  setInsets(payload: AppPayloads['setInsets']): SendOutcome {
    return this.send('setInsets', payload)
  }

  // -- entradas do viewer ---------------------------------------------------

  /** `onMessage` da WebView. Nunca lança. */
  receive(raw: unknown): void {
    if (this.disposed) return
    const parsed = parseViewerMessage(raw)
    if (!parsed.ok) {
      this.emit({
        kind: 'protocol-error',
        code: parsed.error.code,
        message: parsed.error.message
      })
      // Uma resposta com payload inválido a um pedido pendente não pode deixá-lo
      // pendurado até ao timeout: resolve-se já, com erro explícito.
      if (parsed.error.code === 'invalid-payload' && parsed.error.replyTo) {
        this.failPendingOnInvalidReply(parsed.error.type, parsed.error.replyTo)
      }
      return
    }
    this.route(parsed.message)
  }

  /** `onContentProcessDidTerminate` / `onRenderProcessGone`. */
  processGone(): void {
    if (this.disposed) return
    this.fail()
    this.emit({ kind: 'process-gone' })
  }

  dispose(): void {
    this.disposed = true
    this.clearTimers()
    this.pending.clear()
    this.queuedOpen = null
    this.inFlightOpenId = null
    this.latestNavId = null
  }

  // -- internos -------------------------------------------------------------

  private emit(event: BridgeEvent): void {
    if (!this.disposed) this.deps.onEvent(event)
  }

  private reject(
    command: AppToViewerType,
    error: CommandRejection
  ): SendOutcome {
    this.emit({ kind: 'command-rejected', command, error })
    return { ok: false, error }
  }

  /**
   * `onReject` decide o evento da rejeição: por omissão `command-rejected`
   * (quem chamou recebe o `SendOutcome`); envios automáticos sem chamador
   * (`open` em fila, `goto` após `findResult`) emitem um evento correlacionado.
   */
  private send<T extends AppToViewerType>(
    type: T,
    payload: AppPayloads[T],
    onReject: Rejector = (t, e) => this.reject(t, e)
  ): SendOutcome {
    if (this.disposed || this.phaseValue === 'failed') {
      return onReject(type, {
        code: 'viewer-unavailable',
        message: 'o viewer não está disponível; recarregue'
      })
    }
    const built = buildAppMessage(this.nextId(), type, payload)
    if (!built.ok) return onReject(type, built.error)
    const message = built.message

    if (this.phaseValue === 'booting') {
      // §5.1: antes de `ready` só um `open` pendente; o mais recente substitui.
      if (type !== 'open') {
        return this.reject(type, {
          code: 'not-ready',
          message: `o viewer ainda não está pronto (${type})`
        })
      }
      if (this.queuedOpen) {
        this.emit({ kind: 'open-superseded', id: this.queuedOpen.id })
      }
      this.queuedOpen = message
      this.emit({ kind: 'command-queued', id: message.id, message })
      return { ok: true, id: message.id, queued: true }
    }
    return this.dispatch(message, onReject)
  }

  private dispatch(
    message: AppMessage,
    onReject: Rejector = (t, e) => this.reject(t, e)
  ): SendOutcome {
    try {
      this.deps.inject(encodeInjection(message))
    } catch (e) {
      return onReject(message.type, {
        code: 'send-failed',
        message: `falha a entregar ${message.type} ao viewer: ${
          e instanceof Error ? e.message : String(e)
        }`
      })
    }
    this.track(message)
    this.emit({ kind: 'command-sent', id: message.id, message })
    return { ok: true, id: message.id, queued: false }
  }

  private track(message: AppMessage): void {
    this.pending.set(message.id, message.type)
    if (message.type === 'find') {
      // Pesquisa nova invalida a anterior (§5.4): a resposta tardia fica `stale-reply`.
      if (this.latestFindId) this.pending.delete(this.latestFindId)
      this.latestFindId = message.id
    }
    if (message.type === 'open') {
      // Um novo `open` torna obsoleta a resposta do anterior.
      if (this.inFlightOpenId) this.pending.delete(this.inFlightOpenId)
      this.inFlightOpenId = message.id
      if (this.openTimer !== null) this.timers.clear(this.openTimer)
      this.openTimer = this.timers.set(
        () => this.onOpenTimeout(message.id),
        this.openTimeoutMs
      )
    }
    if (
      message.type === 'goto' ||
      message.type === 'findNext' ||
      message.type === 'findPrev'
    ) {
      this.latestNavId = message.id
    }
    if (this.pending.size > MAX_TRACKED) this.evictOldestInactive()
  }

  /**
   * Despeja o pendente mais antigo que não seja operação activa. Há no máximo
   * três activas (`open`, `find`, navegação) e `MAX_TRACKED` > 3, logo existe
   * sempre um candidato; a resposta tardia do despejado sai `stale-reply`.
   */
  private evictOldestInactive(): void {
    for (const id of this.pending.keys()) {
      if (
        id !== this.inFlightOpenId &&
        id !== this.latestFindId &&
        id !== this.latestNavId
      ) {
        this.pending.delete(id)
        return
      }
    }
  }

  private route(msg: ViewerMessage): void {
    switch (msg.type) {
      case 'ready':
        return this.onReady(msg.payload)
      case 'log':
        return this.emit({ kind: 'log', payload: msg.payload })
      case 'error':
        return this.onViewerError(msg.payload, msg.replyTo)
      case 'opened':
        if (!this.takeReply(msg.type, msg.replyTo)) return
        this.finishOpen()
        return this.emit({
          kind: 'opened',
          replyTo: msg.replyTo as string,
          payload: msg.payload
        })
      case 'openFailed':
        if (!this.takeReply(msg.type, msg.replyTo)) return
        this.finishOpen()
        return this.emit({
          kind: 'open-failed',
          replyTo: msg.replyTo as string,
          code: msg.payload.code,
          message: msg.payload.message,
          origin: 'viewer'
        })
      case 'findResult': {
        if (!this.takeReply(msg.type, msg.replyTo)) return
        const replyTo = msg.replyTo as string
        this.emit({ kind: 'find-result', replyTo, payload: msg.payload })
        // §5.4: pesquisa nova → `goto{index:0}` se houver hits (como `useFind.submit`).
        // Ninguém recebe este `SendOutcome`: uma rejeição sai como
        // `find-navigation-failed`, correlacionada com a pesquisa (fail-closed).
        if (replyTo === this.latestFindId && msg.payload.total > 0) {
          const findId = msg.payload.findId
          this.send('goto', { findId, index: 0 }, (_type, error) => {
            this.emit({
              kind: 'find-navigation-failed',
              replyTo,
              findId,
              error
            })
            return { ok: false, error }
          })
        }
        return
      }
      case 'findActive':
        if (!this.takeReply(msg.type, msg.replyTo)) return
        return this.emit({
          kind: 'find-active',
          replyTo: msg.replyTo as string,
          payload: msg.payload
        })
    }
  }

  /**
   * Consome o id pendente a que a resposta responde. `false` = resposta
   * descartada, **com** evento explícito (`stale-reply` ou `protocol-error`).
   */
  private takeReply(
    type: ViewerToAppType,
    replyTo: string | undefined
  ): boolean {
    const origin = replyTo !== undefined ? this.pending.get(replyTo) : undefined
    if (replyTo === undefined || origin === undefined) {
      this.emit({ kind: 'stale-reply', type, replyTo: replyTo ?? null })
      return false
    }
    if (!REPLY_TYPES[type]?.includes(origin)) {
      this.emit({
        kind: 'protocol-error',
        code: 'wrong-reply-type',
        message: `${type} não responde a ${origin}`
      })
      return false
    }
    // `findActive` pode repetir-se para o mesmo id? Não: uma resposta por pedido.
    this.pending.delete(replyTo)
    return true
  }

  private onReady(payload: ReadyPayload): void {
    if (this.phaseValue === 'ready') {
      this.emit({
        kind: 'protocol-error',
        code: 'duplicate-ready',
        message: 'ready recebido mais do que uma vez'
      })
      return
    }
    // Recuperação tardia (decisão de shellState.ts): um `ready` válido restaura
    // `ready` mesmo depois de `ready-timeout`/`process-gone`; o que estava
    // pendente foi descartado ao falhar e não regressa.
    this.phaseValue = 'ready'
    if (this.readyTimer !== null) this.timers.clear(this.readyTimer)
    this.readyTimer = null
    this.emit({ kind: 'ready', payload })
    const queued = this.queuedOpen
    this.queuedOpen = null
    if (!queued) return
    // O `SendOutcome` deste envio não tem destinatário (o `open()` já devolveu
    // `queued:true`): a falha tem de sair como `open-failed` do mesmo id, para
    // o estado do documento terminar o loading.
    this.dispatch(queued, (_type, error) => {
      this.emit({
        kind: 'open-failed',
        replyTo: queued.id,
        code: 'send-failed',
        message: error.message,
        origin: 'local'
      })
      return { ok: false, error }
    })
  }

  private onViewerError(
    payload: ErrorPayload,
    envReplyTo: string | undefined
  ): void {
    const replyTo = payload.replyTo ?? envReplyTo ?? null
    const command =
      replyTo !== null ? (this.pending.get(replyTo) ?? null) : null
    if (replyTo !== null && command !== null) {
      this.pending.delete(replyTo)
      if (command === 'open' && replyTo === this.inFlightOpenId)
        this.finishOpen()
    }
    this.emit({ kind: 'viewer-error', command, replyTo, payload })
  }

  /** Resposta inválida a um pedido pendente: resolve-o com erro explícito. */
  private failPendingOnInvalidReply(
    type: string | undefined,
    replyTo: string
  ): void {
    const origin = this.pending.get(replyTo)
    if (!origin) return
    this.pending.delete(replyTo)
    if (origin === 'open') {
      this.finishOpen()
      this.emit({
        kind: 'open-failed',
        replyTo,
        code: 'parse',
        message: `resposta inválida do viewer (${type ?? 'desconhecido'})`,
        origin: 'local'
      })
      return
    }
    this.emit({
      kind: 'viewer-error',
      command: origin,
      replyTo,
      payload: {
        code: 'invalid-reply',
        message: `resposta inválida do viewer (${type ?? 'desconhecido'})`
      }
    })
  }

  private finishOpen(): void {
    if (this.openTimer !== null) this.timers.clear(this.openTimer)
    this.openTimer = null
    this.inFlightOpenId = null
  }

  private onReadyTimeout(): void {
    this.readyTimer = null
    if (this.phaseValue !== 'booting') return
    this.fail()
    this.emit({ kind: 'ready-timeout' })
  }

  private onOpenTimeout(id: string): void {
    this.openTimer = null
    if (this.inFlightOpenId !== id) return
    this.pending.delete(id)
    this.inFlightOpenId = null
    this.emit({
      kind: 'open-failed',
      replyTo: id,
      code: 'timeout',
      message: 'o viewer não respondeu a tempo à abertura',
      origin: 'local'
    })
  }

  private fail(): void {
    this.phaseValue = 'failed'
    this.clearTimers()
    this.pending.clear()
    this.queuedOpen = null
    this.inFlightOpenId = null
    this.latestNavId = null
  }

  private clearTimers(): void {
    if (this.readyTimer !== null) this.timers.clear(this.readyTimer)
    if (this.openTimer !== null) this.timers.clear(this.openTimer)
    this.readyTimer = null
    this.openTimer = null
  }
}
