// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ponta-a-ponta app ↔ viewer (M3-I5, aceitação 1): `FileFlow` real → URL do
// `LocalAssetServer` real (sockets de 127.0.0.1) → `createLoopbackFetch` REAL do
// viewer (importado do pacote; auto-contido). Prova que os assets só saem pelo
// fluxo previsto (sessão da página, asset concedido e vivo) e que a limpeza fecha
// o acesso. O viewer só é lido (nenhuma alteração fora de `apps/`).
import assert from 'node:assert/strict'
import { describe, it, type TestContext } from 'node:test'

import {
  createLoopbackFetch,
  LoopbackFetchError,
  type LoopbackFetchErrorCode,
  type LoopbackPage
} from '../../../../packages/cad-mobile-viewer/src/import/loopbackFetch.ts'
import { MAX_DOCUMENT_BYTES } from '../contracts/protocol.ts'
import { FileFlow, type FileFlowEvent } from '../files/fileFlow.ts'
import { createAssetIdGenerator } from '../files/names.ts'
import type { BridgeOpenPort } from '../files/ports.ts'
import {
  FakeAssetStore,
  FakePicker,
  pickedFile
} from '../fixtures/fakeFiles.ts'
import { BUNDLE_FILES, deferred } from '../fixtures/fakeServer.ts'
import { createHarness } from '../fixtures/harness.ts'
import { createMemoryBundle } from './bundle.ts'
import { LocalAssetServer, type ServerLimits } from './localAssetServer.ts'
import { createNodeListener } from './nodeListener.node-test.ts'
import type { AssetBytesPort } from './types.ts'

const LAYOUTS = 'synthetic-layouts.dxf'
const BLOCKS = 'synthetic-blocks.dxf'

function bytesOf(
  store: FakeAssetStore,
  hooks: {
    gate?: () => Promise<void> | null
    sizeOverride?: () => number | null
  } = {}
): AssetBytesPort {
  return {
    sizeOf: async id => {
      const n = store.staged.get(id)
      if (n === undefined) return null
      return hooks.sizeOverride?.() ?? n
    },
    read: async id => {
      const gate = hooks.gate?.()
      if (gate) await gate
      return new Uint8Array(store.staged.get(id) ?? 0).fill(
        (id.charCodeAt(1) % 200) + 1
      )
    }
  }
}

async function setup(
  t: TestContext,
  limits: Partial<ServerLimits> = {},
  hooks: Parameters<typeof bytesOf>[1] = {}
) {
  let k = 0
  const store = new FakeAssetStore()
  const listener = createNodeListener()
  const server = new LocalAssetServer({
    listener,
    bundle: createMemoryBundle(BUNDLE_FILES),
    assets: bytesOf(store, hooks),
    limits
  })
  t.after(() => server.dispose())
  const info = await server.start()
  const page: LoopbackPage = {
    origin: info.origin,
    pathname: new URL(info.viewerUrl).pathname
  }
  const sent: { url: string; name: string; size: number }[] = []
  const events: FileFlowEvent[] = []
  const h = createHarness({ onEvent: e => flow.handle(e) })
  const bridge: BridgeOpenPort = {
    get phase() {
      return h.client.phase
    },
    open: payload => {
      if (payload.source.kind === 'url') {
        sent.push({
          url: payload.source.url,
          name: payload.name,
          size: payload.size
        })
      }
      return h.client.open(payload)
    }
  }
  const flow = new FileFlow({
    picker: new FakePicker(),
    store,
    urls: server,
    bridge,
    onEvent: e => {
      events.push(e)
      h.dispatch(e)
    },
    newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
  })
  h.boot()
  const send = (name: string, size = 100) =>
    flow.openPicked(store.addSource(pickedFile(name, size), size))
  const fetchBytes = createLoopbackFetch({ page })
  return {
    server,
    listener,
    store,
    flow,
    h,
    sent,
    events,
    send,
    fetchBytes,
    page,
    info
  }
}

async function failure(p: Promise<unknown>): Promise<LoopbackFetchErrorCode> {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof LoopbackFetchError, String(e))
    return e.code
  }
  assert.fail('devia ter falhado')
}

describe('FileFlow → servidor → fetchBytes do viewer (fluxo previsto)', () => {
  it('o URL entregue ao viewer descarrega exactamente os bytes copiados, sem pedir mais nada', async t => {
    const s = await setup(t)
    const r = await s.send(LAYOUTS, 4096)
    assert.equal(r.status, 'handed-off')
    assert.equal(s.sent.length, 1)
    assert.match(
      s.sent[0].url,
      /^http:\/\/127\.0\.0\.1:\d+\/s\/[A-Za-z0-9_-]{43}\/a\/f/
    )
    const bytes = new Uint8Array(await s.fetchBytes(s.sent[0].url))
    assert.equal(bytes.length, 4096)
    assert.ok(bytes.every(b => b === bytes[0]))
    assert.equal(s.listener.served, 1)
  })

  it('a página do viewer também é servida pelo mesmo servidor (bundle offline)', async t => {
    const s = await setup(t)
    const res = await fetch(s.info.viewerUrl)
    assert.equal(res.status, 200)
    assert.match(await res.text(), /<title>viewer<\/title>/)
  })

  it('documento aberto fica descarregável; ao abrir outro, o URL do anterior morre (http-status)', async t => {
    const s = await setup(t)
    await s.send(LAYOUTS, 100)
    s.h.flush()
    const first = s.sent[0].url
    assert.equal((await s.fetchBytes(first)).byteLength, 100)
    await s.send(BLOCKS, 200)
    s.h.flush()
    assert.equal(await failure(s.fetchBytes(first)), 'http-status')
    assert.equal((await s.fetchBytes(s.sent[1].url)).byteLength, 200)
    assert.equal(s.server.stats.grants, 1)
  })

  it('abertura recusada pelo viewer (open-failed) → o URL deixa de servir', async t => {
    const s = await setup(t)
    await s.send('synthetic-layouts.dwg', 100)
    const url = s.sent[0].url
    assert.equal((await s.fetchBytes(url)).byteLength, 100)
    s.h.flush() // o viewer sintético recusa → open-failed → libertação
    assert.equal(s.h.state.document.error?.code, 'read-failed')
    assert.equal(await failure(s.fetchBytes(url)), 'http-status')
  })

  it('o viewer a morrer (process-gone) revoga tudo; dispose do fluxo também', async t => {
    const s = await setup(t)
    await s.send(LAYOUTS, 50)
    s.h.flush()
    await s.send(BLOCKS, 60)
    const [a, b] = [s.sent[0].url, s.sent[1].url]
    s.h.client.processGone()
    assert.equal(await failure(s.fetchBytes(a)), 'http-status')
    assert.equal(await failure(s.fetchBytes(b)), 'http-status')
    await s.flow.dispose()
    assert.equal(s.server.stats.grants, 0)
  })
})

describe('o que o viewer NUNCA pode obter por este canal', () => {
  it('um asset de outra instância do servidor: recusado antes de abrir ligação (wrong-origin)', async t => {
    const mine = await setup(t)
    const other = await setup(t)
    await other.send(LAYOUTS, 70)
    const foreign = other.sent[0].url
    const servedBefore = other.listener.served
    assert.equal(await failure(mine.fetchBytes(foreign)), 'wrong-origin')
    assert.equal(other.listener.served, servedBefore, 'nem sequer chegou lá')
  })

  it('um URL da mesma porta mas de outra sessão (reinício): wrong-session sem pedido', async t => {
    const s = await setup(t)
    await s.send(LAYOUTS, 70)
    const oldUrl = s.sent[0].url
    await s.server.stop()
    const info = await s.server.start()
    // a página nova (outra porta e outro token) não aceita o URL antigo
    const newFetch = createLoopbackFetch({
      page: { origin: info.origin, pathname: new URL(info.viewerUrl).pathname }
    })
    const code = await failure(newFetch(oldUrl))
    assert.ok(['wrong-origin', 'wrong-session'].includes(code), code)
  })

  it('o fetch da página velha contra o servidor reiniciado: sem concessão, sem bytes', async t => {
    const s = await setup(t)
    await s.send(LAYOUTS, 70)
    const oldUrl = s.sent[0].url
    await s.server.stop()
    assert.equal(await failure(s.fetchBytes(oldUrl)), 'network')
    await s.server.start()
    const code = await failure(s.fetchBytes(oldUrl))
    assert.ok(['network', 'http-status'].includes(code), code)
  })

  it('outros alvos do mesmo servidor (bundle, raiz, outro asset) não são asset de documento', async t => {
    const s = await setup(t)
    const token = /\/s\/([^/]+)\//.exec(s.info.viewerUrl)![1]
    for (const path of [
      `/s/${token}/index.html`,
      `/s/${token}/assets/app.js`,
      `/s/${token}/`,
      `/s/${token}/a/f9-nao-existe`
    ]) {
      assert.ok(
        ['wrong-session', 'invalid-url', 'http-status'].includes(
          await failure(s.fetchBytes(`${s.info.origin}${path}`))
        ),
        path
      )
    }
  })
})

describe('erros explícitos do canal (mapeados no viewer para códigos de openFailed)', () => {
  it('asset acima do tecto do formato → o servidor responde 413 → too-large', async t => {
    let over: number | null = null
    const s = await setup(t, {}, { sizeOverride: () => over })
    await s.send('synthetic-layouts.dxf', 100)
    over = MAX_DOCUMENT_BYTES.dxf + 1
    assert.equal(await failure(s.fetchBytes(s.sent[0].url)), 'too-large')
  })

  it('o viewer com tecto menor que o ficheiro → too-large (fluxo cortado)', async t => {
    const s = await setup(t)
    await s.send(LAYOUTS, 10_000)
    const small = createLoopbackFetch({ page: s.page, maxBytes: 5_000 })
    assert.equal(await failure(small(s.sent[0].url)), 'too-large')
  })

  it('servidor ocupado (maxAssetReads=1, leitura a decorrer) → http-status 503, e recupera', async t => {
    const gate = deferred()
    let hold = true
    const s = await setup(
      t,
      { maxAssetReads: 1 },
      { gate: () => (hold ? gate.promise : null) }
    )
    await s.send(LAYOUTS, 300)
    const url = s.sent[0].url
    const first = s.fetchBytes(url)
    await new Promise(r => setTimeout(r, 50))
    assert.equal(await failure(s.fetchBytes(url)), 'http-status')
    hold = false
    gate.resolve()
    assert.equal((await first).byteLength, 300)
    assert.equal((await s.fetchBytes(url)).byteLength, 300)
  })

  it('leitura que não termina → timeout do viewer; ao libertar, o servidor fica são', async t => {
    const gate = deferred()
    let hold = true
    const s = await setup(t, {}, { gate: () => (hold ? gate.promise : null) })
    await s.send(LAYOUTS, 300)
    const url = s.sent[0].url
    const quick = createLoopbackFetch({ page: s.page, timeoutMs: 80 })
    assert.equal(await failure(quick(url)), 'timeout')
    hold = false
    gate.resolve()
    await new Promise(r => setTimeout(r, 30))
    assert.equal((await s.fetchBytes(url)).byteLength, 300)
    assert.deepEqual(s.server.stats.inFlight, 0)
  })

  it('servidor parado a meio (stop com pedido a ler) → o viewer não recebe bytes', async t => {
    const gate = deferred()
    let hold = true
    const s = await setup(t, {}, { gate: () => (hold ? gate.promise : null) })
    await s.send(LAYOUTS, 300)
    const url = s.sent[0].url
    const pending = s.fetchBytes(url).then(
      b => ({ ok: true as const, b }),
      (e: unknown) => ({ ok: false as const, e })
    )
    await new Promise(r => setTimeout(r, 40))
    const stopping = s.server.stop()
    hold = false
    gate.resolve()
    await stopping
    const outcome = await pending
    assert.equal(outcome.ok, false, 'não pode receber bytes depois do stop')
    if (!outcome.ok) {
      assert.ok(outcome.e instanceof LoopbackFetchError)
      assert.ok(['http-status', 'network'].includes(outcome.e.code))
    }
  })
})
