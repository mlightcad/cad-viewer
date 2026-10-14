// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ciclo de vida de UMA superfície do viewer (spec M3-I5 §8 itens 1 e 4; card
// M4-I6), sem React Native: servidor loopback → URL da página com token →
// ponte → fluxo de ficheiros → limpeza determinística. O `ViewerScreen` cria
// uma sessão por geração (`reload` = token novo e WebView nova); os testes de
// integração e a prova de superfície usam ESTE código com sockets reais.
//
// Fail-closed: sem listener nativo, ou se o servidor não puder ser criado, não
// há ponte, nem fluxo de ficheiros, nem página — só o erro visível. Nunca se
// cai para outra origem, para uma página em branco nem para HTTP fora de
// 127.0.0.1.

import { BridgeClient, type BridgeClientDeps } from '../bridge/BridgeClient.ts'
import { FileFlow } from '../files/fileFlow.ts'
import type { AssetStorePort, DocumentPickerPort } from '../files/ports.ts'
import { LocalServerError } from '../server/errors.ts'
import type { LocalAssetServer } from '../server/localAssetServer.ts'
import type { ServerEvent } from '../server/types.ts'
import type { SessionAction } from '../state/session.ts'

/**
 * Fábrica do servidor da sessão. Recebe o observador de eventos (sem URL nem
 * token). `null` = este build não tem listener nativo; lançar = o servidor não
 * pode ser montado (ex.: bundle do viewer em falta no binário).
 */
export type ServerFactory = (
  onEvent: (event: ServerEvent) => void
) => LocalAssetServer | null

export const SERVER_UNAVAILABLE_TEXT =
  'Servidor local indisponível neste build: o viewer não pode arrancar.'
export const SERVER_FAILED_TEXT =
  'Falha ao arrancar o servidor local do viewer. Tente recarregar.'

/**
 * Texto visível de uma falha do servidor: a frase fixa + o código fixo do erro
 * (`listen-failed`, `not-loopback`, `invalid-config`…). Nunca a mensagem nem a
 * causa técnica (podem trazer caminhos internos).
 */
export function serverFailureText(error: unknown): string {
  const code = error instanceof LocalServerError ? error.code : 'setup-failed'
  return `${SERVER_FAILED_TEXT} (${code})`
}

/** Subconjunto do `AppState` do React Native. */
export interface AppStatePort {
  addEventListener(
    type: 'change',
    listener: (state: string) => void
  ): { remove(): void }
}

export interface ViewerSessionDeps {
  createServer: ServerFactory
  /** Injecção na superfície actual; lança se não existir (vira `send-failed`). */
  inject: (script: string) => void
  picker: DocumentPickerPort
  store: AssetStorePort
  appState: AppStatePort
  dispatch: (action: SessionAction) => void
  /** Página da sessão (contém o token): só em memória, nunca registar. */
  onViewerUrl: (url: string | null) => void
  onServerIssue: (text: string | null) => void
  /** Timers/timeouts da ponte (testes). */
  bridge?: Pick<BridgeClientDeps, 'timers' | 'readyTimeoutMs' | 'openTimeoutMs'>
}

export interface ViewerSession {
  readonly server: LocalAssetServer | null
  readonly client: BridgeClient | null
  readonly flow: FileFlow | null
  /** Mensagem do viewer (`onMessage` da WebView). */
  receive(raw: string): void
  processGone(): void
  /** Ordem fixa: ponte → assets (revoga + apaga) → servidor. Idempotente. */
  dispose(): Promise<void>
}

export function startViewerSession(deps: ViewerSessionDeps): ViewerSession {
  let disposed = false
  let disposing: Promise<void> | null = null

  let server: LocalAssetServer | null
  let issue: string | null = null
  try {
    server = deps.createServer(event => {
      // o SO matou o listener (iOS em segundo plano): página morta, token novo
      if (event.kind === 'listener-lost' && !disposed) {
        deps.onViewerUrl(null)
        deps.dispatch({ kind: 'reload' })
      }
    })
    if (!server) issue = SERVER_UNAVAILABLE_TEXT
  } catch (error) {
    server = null
    issue = serverFailureText(error)
  }
  deps.onViewerUrl(null)
  deps.onServerIssue(issue)

  if (!server) {
    return {
      server: null,
      client: null,
      flow: null,
      receive: () =>
        deps.dispatch({
          kind: 'protocol-error',
          code: 'invalid-envelope',
          message: 'mensagem do viewer recebida sem ponte activa'
        }),
      processGone: () => undefined,
      dispose: () => Promise.resolve()
    }
  }

  const live = server
  let flow: FileFlow | null = null
  const client = new BridgeClient({
    ...deps.bridge,
    inject: deps.inject,
    onEvent: event => {
      deps.dispatch(event)
      flow?.handle(event)
    }
  })
  flow = new FileFlow({
    picker: deps.picker,
    store: deps.store,
    urls: live,
    bridge: client,
    onEvent: deps.dispatch
  })
  const files = flow

  live.start().then(
    info => {
      if (!disposed) deps.onViewerUrl(info.viewerUrl)
    },
    error => {
      // sem página a ponte acaba em `ready-timeout` → «Recarregar»
      if (!disposed) deps.onServerIssue(serverFailureText(error))
    }
  )
  void files.startup()

  // de volta a primeiro plano com o listener morto: sessão nova
  const appState = deps.appState.addEventListener('change', state => {
    if (state === 'active' && !disposed && live.state === 'stopped') {
      deps.dispatch({ kind: 'reload' })
    }
  })

  return {
    server: live,
    client,
    flow: files,
    receive: raw => {
      if (!disposed) client.receive(raw)
    },
    processGone: () => {
      if (!disposed) client.processGone()
    },
    dispose() {
      if (disposing) return disposing
      disposed = true
      appState.remove()
      client.dispose()
      disposing = files
        .dispose()
        .catch(() => undefined)
        .then(() => live.dispose())
        .catch(() => undefined)
      return disposing
    }
  }
}
