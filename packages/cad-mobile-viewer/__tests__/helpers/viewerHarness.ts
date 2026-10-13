// SPDX-License-Identifier: GPL-3.0-or-later
//
// Harness da sessão do viewer (spec M3-I4): as mensagens são construídas pelo
// construtor REAL do app (`buildAppMessage` + `encodeInjection`), atravessam o
// dispatcher e cada resposta é validada pelo parser REAL do app
// (`parseViewerMessage`). A vista é um duplo determinístico.

import * as app from '../../../../apps/freedom-mobile/src/contracts/protocol'
import type { ViewBox } from '../../src/model/types'
import { createViewerDispatcher } from '../../src/viewer/dispatcher'
import type { FindOutcome } from '../../src/viewer/protocol'
import {
  type NavigateTarget,
  ViewerSession,
  type ViewerSessionDeps,
  type ViewPort
} from '../../src/viewer/session'

export class FakeView implements ViewPort {
  layout: string | null = null
  box: ViewBox | null = { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } }
  zooms: Array<{ box: ViewBox; margin: number }> = []
  clears = 0
  navs: NavigateTarget[] = []
  /** Resultado (ou função) da próxima navegação. */
  outcome:
    | FindOutcome
    | ((t: NavigateTarget) => Promise<FindOutcome> | FindOutcome) = 'navigated'
  fail: Partial<Record<keyof ViewPort, Error>> = {}

  activeLayoutId() {
    if (this.fail.activeLayoutId) throw this.fail.activeLayoutId
    return this.layout
  }
  visibleBox() {
    if (this.fail.visibleBox) throw this.fail.visibleBox
    return this.box
  }
  zoomTo(box: ViewBox, margin: number) {
    if (this.fail.zoomTo) throw this.fail.zoomTo
    this.zooms.push({ box, margin })
  }
  clearSelection() {
    if (this.fail.clearSelection) throw this.fail.clearSelection
    this.clears++
  }
  navigate(t: NavigateTarget) {
    if (this.fail.navigate) throw this.fail.navigate
    this.navs.push(t)
    const out =
      typeof this.outcome === 'function' ? this.outcome(t) : this.outcome
    if (out === 'navigated') this.layout = t.entry.layoutId
    return out
  }
}

export type AppViewerMessage = app.ViewerMessage

/** Extrai o texto que `window.__cadBridge.receive` recebe de uma injecção. */
export function decodeInjection(script: string): string {
  const m = /^window\.__cadBridge\.receive\((.*)\);true;$/s.exec(script)
  if (!m) throw new Error('injecção fora do formato')
  return JSON.parse(m[1]) as string
}

export function harness(deps: Partial<ViewerSessionDeps> = {}) {
  const view = (deps.view as FakeView | undefined) ?? new FakeView()
  const session = new ViewerSession({ dwg: 'unavailable', ...deps, view })
  const dispatcher = createViewerDispatcher(session)
  let n = 0

  /** Respostas validadas pelo app; lança se o app rejeitar alguma. */
  async function receive(raw: unknown): Promise<AppViewerMessage[]> {
    const out = await dispatcher.receive(raw)
    return out.map(text => {
      const parsed = app.parseViewerMessage(text)
      if (!parsed.ok) {
        throw new Error(`app rejeitou ${text}: ${parsed.error.message}`)
      }
      return parsed.message
    })
  }

  async function send<T extends app.AppToViewerType>(
    type: T,
    payload: app.AppPayloads[T]
  ): Promise<AppViewerMessage[]> {
    const id = `a-${++n}`
    const built = app.buildAppMessage(id, type, payload)
    if (!built.ok)
      throw new Error(`app recusou construir: ${built.error.message}`)
    const out = await receive(
      decodeInjection(app.encodeInjection(built.message))
    )
    for (const m of out) {
      if (m.replyTo !== id) throw new Error(`replyTo ${m.replyTo} ≠ ${id}`)
    }
    return out
  }

  async function open(
    name: string,
    bytes: ArrayBuffer,
    size = bytes.byteLength
  ) {
    const data = Buffer.from(new Uint8Array(bytes)).toString('base64')
    const out = await send('open', {
      name,
      size,
      source: { kind: 'base64', data }
    })
    const opened = out.find(m => m.type === 'opened')
    // o renderer mostra o layout activo do documento aberto
    if (opened?.type === 'opened') view.layout = opened.payload.activeLayoutId
    return out
  }

  return { view, session, dispatcher, send, receive, open }
}

export const only = <T extends AppViewerMessage['type']>(
  out: AppViewerMessage[],
  type: T
) => {
  const found = out.filter(m => m.type === type)
  if (found.length !== 1) {
    throw new Error(
      `esperava 1 «${type}», recebi: ${JSON.stringify(out.map(m => m.type))}`
    )
  }
  return found[0] as Extract<AppViewerMessage, { type: T }>
}

export function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
