// SPDX-License-Identifier: GPL-3.0-or-later
//
// Transporte do viewer dentro da WebView (arquitectura §5, §6.2 passo 3; card
// M4-I6): o app injecta `window.__cadBridge.receive(<json>)` e o viewer
// responde com `window.ReactNativeWebView.postMessage(<json>)`. Puro (recebe a
// janela), testável sem DOM.
//
// Fail-closed: sem `ReactNativeWebView.postMessage` não há para onde responder
// e a instalação lança (nada fica meio ligado). Uma falha do dispatcher ou do
// envio nunca é engolida em silêncio: vira um `error{code:'internal'}`.

import type { DwgStatus } from '../import/types'
import type { ViewerDispatcher } from '../viewer/dispatcher'

export interface BridgeWindow {
  ReactNativeWebView?: { postMessage(message: string): void }
  __cadBridge?: { receive(raw: unknown): void }
}

export interface InstalledBridge {
  /** Mensagens recebidas ainda por responder (diagnóstico/testes). */
  pending(): number
  /** Espera que todas as respostas em curso tenham sido enviadas. */
  idle(): Promise<void>
}

export class BridgeTransportError extends Error {
  constructor() {
    super('transporte da WebView indisponível')
    this.name = 'BridgeTransportError'
  }
}

/** Erro fixo (sem eco da mensagem nem do erro original). */
const INTERNAL_ERROR = JSON.stringify({
  v: 1,
  id: 'w-internal',
  type: 'error',
  payload: { code: 'internal', message: 'falha interna do transporte' }
})

export function installBridge(
  win: BridgeWindow,
  dispatcher: ViewerDispatcher,
  dwg: DwgStatus
): InstalledBridge {
  const native = win.ReactNativeWebView
  if (!native || typeof native.postMessage !== 'function') {
    throw new BridgeTransportError()
  }
  const post = (text: string) => native.postMessage(text)
  const inFlight = new Set<Promise<void>>()

  win.__cadBridge = {
    receive(raw: unknown) {
      const task = dispatcher
        .receive(raw)
        .then(out => out.forEach(post))
        .catch(() => {
          try {
            post(INTERNAL_ERROR)
          } catch {
            // o canal morreu: o app detecta-o pelo timeout/`processGone`
          }
        })
        .finally(() => inFlight.delete(task))
      inFlight.add(task)
    }
  }
  // `ready` só depois de `receive` existir: o app pode injectar logo a seguir
  post(dispatcher.ready(dwg))

  return {
    pending: () => inFlight.size,
    async idle() {
      while (inFlight.size > 0) await Promise.all([...inFlight])
    }
  }
}
