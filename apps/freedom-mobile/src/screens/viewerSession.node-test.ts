// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ciclo de vida do `ViewerScreen` (`startViewerSession`, card M4-I6) com o
// `LocalAssetServer` REAL sobre o listener TCP REAL (`createTcpHttpListener` +
// sockets de 127.0.0.1): a página é pedida por HTTP como a WebView faria, o
// ficheiro escolhido é entregue por URL e lido por HTTP (Origin/Sec-Fetch da
// própria origem), o resultado e o erro voltam pela ponte, e a limpeza é
// determinística (assets revogados e apagados ANTES de o servidor fechar).
// O viewer é o `SyntheticViewer` (o rendering real está em
// `proof/surfaceProof.node-test.ts`, em Chromium, e na evidência do emulador).
import assert from 'node:assert/strict'
import net from 'node:net'
import { describe, it, type TestContext } from 'node:test'

import {
  FakeAssetStore,
  FakePicker,
  pickedFile
} from '../fixtures/fakeFiles.ts'
import { BUNDLE_FILES } from '../fixtures/fakeServer.ts'
import { FakeTimers } from '../fixtures/harness.ts'
import { SYNTHETIC_DOCUMENTS } from '../fixtures/syntheticDocuments.ts'
import {
  decodeInjection,
  SyntheticViewer
} from '../fixtures/syntheticViewer.ts'
import { createMemoryBundle } from '../server/bundle.ts'
import { LocalAssetServer } from '../server/localAssetServer.ts'
import { createTcpHttpListener } from '../server/tcpHttpListener.ts'
import type { AssetBytesPort, ServerEvent } from '../server/types.ts'
import {
  initialSessionState,
  type SessionAction,
  sessionReducer,
  type SessionState
} from '../state/session.ts'
import { isViewerUrl } from '../viewer/navigation.ts'
import {
  SERVER_FAILED_TEXT,
  SERVER_UNAVAILABLE_TEXT,
  type ServerFactory,
  startViewerSession,
  type ViewerSession
} from './viewerSession.ts'

const DOC = 'synthetic-layouts.dxf'

/** Bytes dos assets = o que a `FakeAssetStore` copiou (conteúdo determinístico). */
function bytesFrom(store: FakeAssetStore): AssetBytesPort {
  const content = (n: number) =>
    Uint8Array.from({ length: n }, (_, i) => i & 0xff)
  return {
    sizeOf: async id => store.staged.get(id) ?? null,
    read: async id => {
      const n = store.staged.get(id)
      if (n === undefined) throw new Error('asset em falta')
      return content(n)
    }
  }
}

class FakeAppState {
  listeners = new Set<(s: string) => void>()
  addEventListener(_t: 'change', fn: (s: string) => void) {
    this.listeners.add(fn)
    return { remove: () => this.listeners.delete(fn) }
  }
  emit(state: string) {
    for (const fn of this.listeners) fn(state)
  }
}

interface Rig {
  session: ViewerSession
  state: () => SessionState
  actions: SessionAction[]
  urls: (string | null)[]
  issues: (string | null)[]
  viewer: SyntheticViewer
  store: FakeAssetStore
  picker: FakePicker
  appState: FakeAppState
  serverEvents: ServerEvent[]
  /** Pedidos HTTP feitos pelo «viewer» aos URLs entregues. */
  fetched: { status: number; bytes: number }[]
  /** Ordem de `store.remove`, revogações e estados do servidor. */
  timeline: string[]
  flush: () => Promise<void>
}

function rig(t: TestContext, createServer?: ServerFactory): Rig {
  const store = new FakeAssetStore()
  const picker = new FakePicker()
  const appState = new FakeAppState()
  const viewer = new SyntheticViewer({ documents: SYNTHETIC_DOCUMENTS })
  const actions: SessionAction[] = []
  const urls: (string | null)[] = []
  const issues: (string | null)[] = []
  const serverEvents: ServerEvent[] = []
  const fetched: { status: number; bytes: number }[] = []
  const pendingFetches: Promise<void>[] = []
  const timeline: string[] = []
  const remove = store.remove.bind(store)
  store.remove = async id => {
    timeline.push('store:remove')
    return remove(id)
  }
  let state = initialSessionState
  let origin = ''
  const factory: ServerFactory =
    createServer ??
    (onEvent =>
      new LocalAssetServer({
        listener: createTcpHttpListener(net),
        bundle: createMemoryBundle(BUNDLE_FILES),
        assets: bytesFrom(store),
        onEvent: e => {
          serverEvents.push(e)
          if (e.kind === 'state') timeline.push(`server:${e.state}`)
          if (e.kind === 'revoke') timeline.push('server:revoke')
          onEvent(e)
        }
      }))
  const session: ViewerSession = startViewerSession({
    createServer: factory,
    inject: script => {
      const msg = decodeInjection(script)
      // o viewer real lê o documento por HTTP com a própria origem
      if (msg.type === 'open' && msg.payload.source.kind === 'url') {
        const url = msg.payload.source.url
        pendingFetches.push(
          fetch(url, {
            headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin' }
          }).then(async res => {
            fetched.push({
              status: res.status,
              bytes: (await res.arrayBuffer()).byteLength
            })
            viewer.handle(script)
          })
        )
        return
      }
      viewer.handle(script)
    },
    picker,
    store,
    appState,
    dispatch: a => {
      actions.push(a)
      state = sessionReducer(state, a)
    },
    onViewerUrl: u => {
      urls.push(u)
      if (u) origin = new URL(u).origin
    },
    onServerIssue: i => issues.push(i),
    bridge: { timers: new FakeTimers() }
  })
  t.after(() => session.dispose())
  return {
    session,
    state: () => state,
    actions,
    urls,
    issues,
    viewer,
    store,
    picker,
    appState,
    serverEvents,
    fetched,
    timeline,
    async flush() {
      for (let i = 0; i < 20; i++) {
        await Promise.all(pendingFetches.splice(0))
        for (const raw of viewer.drain()) session.receive(raw)
        await new Promise(r => setTimeout(r, 5))
        if (viewer.pending === 0 && pendingFetches.length === 0) return
      }
    }
  }
}

async function waitFor(cond: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms
  while (!cond()) {
    if (Date.now() > end) throw new Error('condição não cumprida')
    await new Promise(r => setTimeout(r, 5))
  }
}

const lastUrl = (r: Rig) => r.urls.filter(Boolean).at(-1) ?? null

describe('viewerSession: fail-closed sem listener', () => {
  it('fábrica nula (sem módulo nativo): sem ponte, sem fluxo, sem página; erro visível', async t => {
    const r = rig(t, () => null)
    assert.equal(r.session.server, null)
    assert.equal(r.session.client, null)
    assert.equal(r.session.flow, null)
    assert.deepEqual(r.urls, [null])
    assert.deepEqual(r.issues, [SERVER_UNAVAILABLE_TEXT])
    // uma mensagem sem ponte é um erro de protocolo explícito, nunca engolida
    r.session.receive('{}')
    assert.equal(r.actions.at(-1)?.kind, 'protocol-error')
    await r.session.dispose()
  })

  it('fábrica que lança (bundle em falta no binário): o mesmo fail-closed, outra mensagem', async t => {
    const r = rig(t, () => {
      throw new Error('/data/app/viewer-bundle/MANIFEST.json em falta')
    })
    assert.equal(r.session.client, null)
    assert.deepEqual(r.issues, [`${SERVER_FAILED_TEXT} (setup-failed)`])
    assert.ok(!JSON.stringify(r.issues).includes('/data/'))
    await r.session.dispose()
  })

  it('listen falhado: página nunca é entregue e o erro aparece', async t => {
    const r = rig(
      t,
      () =>
        new LocalAssetServer({
          listener: {
            listen: () => Promise.reject(new Error('EACCES')),
            close: async () => undefined
          },
          bundle: createMemoryBundle(BUNDLE_FILES),
          assets: bytesFrom(new FakeAssetStore())
        })
    )
    await waitFor(() =>
      r.issues.includes(`${SERVER_FAILED_TEXT} (listen-failed)`)
    )
    assert.deepEqual(r.urls, [null])
    await r.session.dispose()
  })
})

describe('viewerSession: abrir, entregar, resultado e erro sobre HTTP real', () => {
  it('página real em 127.0.0.1 → ready → ficheiro entregue por URL → opened; depois erro visível', async t => {
    const r = rig(t)
    await waitFor(() => lastUrl(r) !== null)
    const page = lastUrl(r)!
    assert.ok(isViewerUrl(page), 'URL da página fora do contrato')
    // a WebView carrega a página (navegação de topo: Sec-Fetch-Site none)
    const res = await fetch(page, { headers: { 'Sec-Fetch-Site': 'none' } })
    assert.equal(res.status, 200)
    assert.match(
      res.headers.get('content-security-policy') ?? '',
      /connect-src 'self'/
    )
    assert.equal(await res.text(), BUNDLE_FILES['index.html'])

    r.viewer.boot()
    await r.flush()
    assert.equal(r.state().shell.viewer, 'ready')

    const file = r.store.addSource(pickedFile(DOC, 2048), 2048)
    r.picker.willPick(file)
    const result = await r.session.flow!.pickAndOpen()
    assert.equal(result.status, 'handed-off')
    await waitFor(() => r.fetched.length > 0)
    await r.flush()
    assert.deepEqual(r.fetched, [{ status: 200, bytes: 2048 }])
    assert.equal(r.state().document.current?.layouts.length, 3)
    assert.ok(r.actions.some(a => a.kind === 'opened'))

    // um ficheiro que o viewer não lê: o erro chega ao estado (visível) e o
    // documento anterior mantém-se
    r.picker.willPick(r.store.addSource(pickedFile('partido.dxf', 10), 10))
    await r.session.flow!.pickAndOpen()
    await waitFor(() => r.fetched.length > 1)
    await r.flush()
    assert.ok(r.actions.some(a => a.kind === 'open-failed'))
    assert.equal(r.state().document.error?.code, 'read-failed')
    assert.equal(r.state().document.current?.layouts.length, 3)

    // FIND e zoom pela mesma ponte
    r.session.client!.find({
      query: 'Parede',
      matchCase: false,
      scope: 'drawing'
    })
    r.session.client!.zoom({ op: 'in' })
    await r.flush()
    assert.equal(r.state().find.status, 'results')
    assert.ok(r.state().find.total > 0)
    assert.equal(r.state().zoom.error, null)
    await r.session.dispose()
  })

  it('outra origem (Origin/Sec-Fetch) não lê o asset entregue: 403', async t => {
    const r = rig(t)
    await waitFor(() => lastUrl(r) !== null)
    r.viewer.boot()
    await r.flush()
    r.picker.willPick(r.store.addSource(pickedFile(DOC, 64), 64))
    await r.session.flow!.pickAndOpen()
    const open = r.viewer.received.find(m => m.type === 'open') ?? null
    const url =
      open?.type === 'open' && open.payload.source.kind === 'url'
        ? open.payload.source.url
        : (r.actions
            .filter(a => a.kind === 'command-sent')
            .map(a =>
              a.kind === 'command-sent' &&
              a.message.type === 'open' &&
              a.message.payload.source.kind === 'url'
                ? a.message.payload.source.url
                : null
            )
            .find(Boolean) ?? null)
    assert.ok(url)
    for (const headers of [
      { 'Sec-Fetch-Site': 'cross-site' } as Record<string, string>,
      { 'Sec-Fetch-Site': 'same-site' },
      { Origin: 'http://127.0.0.1:1' }
    ]) {
      assert.equal((await fetch(url, { headers })).status, 403)
    }
    await r.session.dispose()
  })
})

describe('viewerSession: ciclo de vida e limpeza determinística', () => {
  it('dispose: ponte desligada, assets revogados e apagados, depois o servidor fecha; idempotente', async t => {
    const r = rig(t)
    await waitFor(() => lastUrl(r) !== null)
    const page = lastUrl(r)!
    r.viewer.boot()
    await r.flush()
    r.picker.willPick(r.store.addSource(pickedFile(DOC, 128), 128))
    await r.session.flow!.pickAndOpen()
    await waitFor(() => r.fetched.length > 0)
    await r.flush()
    assert.equal(r.store.staged.size, 1)
    const server = r.session.server!
    const first = r.session.dispose()
    assert.equal(r.session.dispose(), first, 'dispose não é idempotente')
    await first
    assert.equal(r.store.staged.size, 0, 'asset não apagado')
    assert.equal(server.state, 'disposed')
    // ordem fixa: revogar → apagar o ficheiro → só então parar o servidor
    const tl = r.timeline
    const stopping = tl.indexOf('server:stopping')
    assert.ok(tl.indexOf('server:revoke') >= 0, JSON.stringify(tl))
    assert.ok(
      tl.indexOf('server:revoke') < tl.indexOf('store:remove'),
      JSON.stringify(tl)
    )
    assert.ok(tl.indexOf('store:remove') < stopping, JSON.stringify(tl))
    assert.equal(tl.at(-1), 'server:disposed')
    await assert.rejects(fetch(page), 'a porta ainda aceita ligações')
    // depois do dispose nada chega à ponte nem ao estado
    const n = r.actions.length
    r.session.receive('{}')
    r.appState.emit('active')
    assert.equal(r.actions.length, n)
  })

  it('listener-lost (SO fecha o socket): URL apagado e reload pedido (token novo)', async t => {
    let lost: (() => void) | null = null
    const r = rig(t, onEvent => {
      const base = createTcpHttpListener(net)
      return new LocalAssetServer({
        listener: {
          listen: (h, onClosed) => {
            lost = onClosed
            return base.listen(h, onClosed)
          },
          close: () => base.close()
        },
        bundle: createMemoryBundle(BUNDLE_FILES),
        assets: bytesFrom(new FakeAssetStore()),
        onEvent
      })
    })
    await waitFor(() => lastUrl(r) !== null)
    lost!()
    await waitFor(() => r.actions.some(a => a.kind === 'reload'))
    assert.equal(r.urls.at(-1), null)
    assert.equal(r.session.server!.state, 'stopped')
    // voltar a primeiro plano com o servidor parado pede outro reload
    const before = r.actions.filter(a => a.kind === 'reload').length
    r.appState.emit('active')
    assert.equal(r.actions.filter(a => a.kind === 'reload').length, before + 1)
    await r.session.dispose()
  })

  it('primeiro plano com o servidor vivo não recarrega', async t => {
    const r = rig(t)
    await waitFor(() => lastUrl(r) !== null)
    r.appState.emit('active')
    r.appState.emit('background')
    assert.equal(
      r.actions.some(a => a.kind === 'reload'),
      false
    )
    await r.session.dispose()
    assert.equal(
      r.appState.listeners.size,
      0,
      'listener do AppState por remover'
    )
  })
})
