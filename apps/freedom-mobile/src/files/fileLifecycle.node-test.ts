// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ciclo de vida dos assets com o `BridgeClient` REAL, o `sessionReducer` real e
// o viewer sintético (M2-I1, spec §3.1): quando se apaga, o que se preserva, o
// que é comunicado pelo protocolo, e que nada sai (caminhos, rede).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { OPEN_TIMEOUT_MS } from '../bridge/BridgeClient.ts'
import {
  FakeAssetStore,
  FakePicker,
  FakeUrls,
  pickedFile,
  SECRET_CACHE_DIR
} from '../fixtures/fakeFiles.ts'
import { createHarness, type HarnessOptions } from '../fixtures/harness.ts'
import { READY_TIMEOUT_MS } from '../shell/shellState.ts'
import { describeDocument, describeFiles } from '../state/describe.ts'
import { FileFlow, type FileFlowEvent, type ReleaseReason } from './fileFlow.ts'
import { createAssetIdGenerator } from './names.ts'

const LAYOUTS = 'synthetic-layouts.dxf'
const BLOCKS = 'synthetic-blocks.dxf'

function setup(options: HarnessOptions = {}) {
  let k = 0
  const store = new FakeAssetStore()
  const urls = new FakeUrls()
  const picker = new FakePicker()
  const events: FileFlowEvent[] = []
  let flow!: FileFlow
  const h = createHarness({ ...options, onEvent: e => flow.handle(e) })
  flow = new FileFlow({
    picker,
    store,
    urls,
    bridge: h.client,
    onEvent: e => {
      events.push(e)
      h.dispatch(e)
    },
    newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
  })
  /** Escolhe+entrega um ficheiro sintético (sem `flush`: a resposta fica no viewer). */
  const send = (name: string, size = 100) =>
    flow.openPicked(store.addSource(pickedFile(name, size), size))
  const released = (): { reason: ReleaseReason; assetId: string }[] =>
    events.flatMap(e =>
      e.kind === 'file-asset-released'
        ? [{ reason: e.reason, assetId: e.assetId }]
        : []
    )
  const idOf = (name: string): string => {
    const e = events.find(x => x.kind === 'file-handed-off' && x.name === name)
    assert.ok(e && e.kind === 'file-handed-off', `sem handed-off de ${name}`)
    return e.assetId
  }
  return { h, flow, store, urls, picker, events, send, released, idOf }
}

describe('ciclo de vida — sucesso', () => {
  it('open → opened: o asset fica activo (mantido) e o estado volta a idle', async () => {
    const t = setup()
    t.h.boot()
    const r = await t.send(LAYOUTS)
    assert.equal(r.status, 'handed-off')
    assert.equal(t.h.state.files.phase, 'handed-off')
    assert.ok(t.h.state.document.opening)
    t.h.flush()
    assert.equal(t.h.state.files.phase, 'idle')
    assert.equal(t.h.state.document.current?.name, LAYOUTS)
    assert.deepEqual(t.flow.tracked, [
      { assetId: t.idOf(LAYOUTS), state: 'active' }
    ])
    assert.equal(
      t.store.staged.size,
      1,
      'mantido enquanto o documento está aberto'
    )
    assert.deepEqual(t.released(), [])
  })

  it('abrir outro documento com sucesso liberta o anterior (replaced)', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    const first = t.idOf(LAYOUTS)
    await t.send(BLOCKS)
    t.h.flush()
    await t.flow.settled()
    assert.deepEqual(t.released(), [{ reason: 'replaced', assetId: first }])
    assert.deepEqual([...t.store.staged.keys()], [t.idOf(BLOCKS)])
    assert.equal(t.h.state.document.current?.name, BLOCKS)
  })

  it('open antes de `ready` fica em fila e completa no ready', async () => {
    const t = setup()
    await t.send(LAYOUTS)
    const handed = t.events.find(e => e.kind === 'file-handed-off')
    assert.ok(handed && handed.kind === 'file-handed-off' && handed.queued)
    t.h.boot()
    assert.equal(t.h.state.document.current?.name, LAYOUTS)
    assert.equal(t.flow.tracked[0].state, 'active')
  })
})

describe('ciclo de vida — falhas preservam o documento anterior', () => {
  it('openFailed do viewer: o novo asset é apagado, o activo mantém-se', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    const keep = t.idOf(LAYOUTS)
    await t.send('desconhecido.dxf')
    const bad = t.idOf('desconhecido.dxf')
    t.h.flush()
    await t.flow.settled()
    assert.deepEqual(t.released(), [{ reason: 'open-failed', assetId: bad }])
    assert.deepEqual([...t.store.staged.keys()], [keep])
    // a ponte comunica o erro pelo protocolo e o documento anterior continua
    assert.equal(t.h.state.document.current?.name, LAYOUTS)
    assert.equal(t.h.state.document.error?.code, 'read-failed')
    assert.equal(t.h.state.document.error?.origin, 'viewer')
    assert.equal(t.h.state.files.phase, 'idle')
  })

  it('DWG indisponível → openFailed dwg-unavailable e asset apagado', async () => {
    const t = setup({ dwg: 'unavailable' })
    t.h.boot()
    await t.send('planta.dwg')
    t.h.flush()
    await t.flow.settled()
    assert.equal(t.h.state.document.error?.code, 'dwg-unavailable')
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(
      t.released().map(r => r.reason),
      ['open-failed']
    )
  })

  it('`error` do viewer ao open: asset apagado', async () => {
    const t = setup()
    t.h.boot()
    t.h.viewer.failNext('open', { code: 'boom', message: 'falha interna' })
    await t.send(LAYOUTS)
    t.h.flush()
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(
      t.released().map(r => r.reason),
      ['open-failed']
    )
    assert.equal(t.h.state.document.error?.code, 'viewer-error')
  })

  it('timeout do open: asset apagado e a resposta tardia não o ressuscita', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.timers.advance(OPEN_TIMEOUT_MS)
    await t.flow.settled()
    assert.equal(t.h.state.document.error?.code, 'timeout')
    assert.equal(t.store.staged.size, 0)
    t.h.flush() // `opened` tardio → stale-reply
    assert.equal(t.h.state.document.current, null)
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(t.flow.tracked, [])
    assert.ok(t.h.events.some(e => e.kind === 'stale-reply'))
  })

  it('inject a falhar (WebView sem ref): rejeitado como send-failed e asset apagado', async () => {
    const t = setup({ failInject: type => type === 'open' })
    t.h.boot()
    const r = await t.send(LAYOUTS)
    assert.deepEqual(r, { status: 'rejected', code: 'send-failed' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.h.state.files.error?.code, 'send-failed')
    assert.ok(t.h.state.files.error?.message)
  })

  it('open em fila cujo inject falha no ready → open-failed → asset apagado', async () => {
    const t = setup({ failInject: type => type === 'open' })
    await t.send(LAYOUTS)
    t.h.boot()
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(
      t.released().map(r => r.reason),
      ['open-failed']
    )
    assert.equal(t.h.state.document.opening, null)
  })

  it('ready-timeout: o open em fila é descartado, o asset apagado e um ready tardio não o reenvia', async () => {
    const t = setup()
    await t.send(LAYOUTS)
    t.h.timers.advance(READY_TIMEOUT_MS)
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(
      t.released().map(r => r.reason),
      ['ready-timeout']
    )
    t.h.boot()
    assert.equal(t.h.state.document.current, null)
    assert.equal(t.h.viewer.received.length, 0)
  })

  it('viewer falhado: novo pedido é rejeitado antes de copiar', async () => {
    const t = setup()
    t.h.timers.advance(READY_TIMEOUT_MS)
    const r = await t.send(LAYOUTS)
    assert.deepEqual(r, { status: 'rejected', code: 'viewer-unavailable' })
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
    assert.match(describeFiles(t.h.state.files) ?? '', /não está disponível/)
  })
})

describe('ciclo de vida — pedidos concorrentes', () => {
  it('dois open em fila: o primeiro é libertado (superseded), só o segundo abre', async () => {
    const t = setup()
    await t.send(LAYOUTS)
    const a = t.idOf(LAYOUTS)
    await t.send(BLOCKS)
    await t.flow.settled()
    assert.deepEqual(t.released(), [{ reason: 'superseded', assetId: a }])
    t.h.boot()
    assert.equal(t.h.state.document.current?.name, BLOCKS)
    assert.deepEqual([...t.store.staged.keys()], [t.idOf(BLOCKS)])
  })

  it('segundo open com o primeiro em voo: resposta antiga é stale-reply e o asset antigo já foi apagado', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    const a = t.idOf(LAYOUTS)
    await t.send(BLOCKS)
    await t.flow.settled()
    assert.deepEqual(t.released(), [{ reason: 'superseded', assetId: a }])
    t.h.flush()
    assert.equal(t.h.state.document.current?.name, BLOCKS)
    assert.ok(t.h.events.some(e => e.kind === 'stale-reply'))
    assert.deepEqual(t.flow.tracked, [
      { assetId: t.idOf(BLOCKS), state: 'active' }
    ])
    assert.equal(t.store.staged.size, 1)
  })
})

describe('ciclo de vida — o documento deixa de existir', () => {
  it('process-gone liberta pendentes e activo; o estado volta ao início', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    await t.send(BLOCKS) // pendente
    t.h.client.processGone()
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(
      t
        .released()
        .map(r => r.reason)
        .sort(),
      ['process-gone', 'process-gone']
    )
    assert.equal(t.h.state.document.current, null)
    assert.equal(t.h.state.files.phase, 'idle')
    assert.deepEqual(t.flow.tracked, [])
  })

  it('findActive{no-document} liberta o activo', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    t.flow.handle({
      kind: 'find-active',
      replyTo: 'a-9',
      payload: { findId: 1, index: -1, outcome: 'no-document' }
    })
    await t.flow.settled()
    assert.deepEqual(
      t.released().map(r => r.reason),
      ['document-closed']
    )
    assert.equal(t.store.staged.size, 0)
  })

  it('dispose (reload/unmount) liberta tudo e deixa de emitir', async () => {
    const t = setup()
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    await t.send(BLOCKS)
    await t.flow.dispose()
    assert.equal(t.store.staged.size, 0)
    const n = t.events.length
    t.flow.handle({ kind: 'process-gone' })
    await t.flow.settled()
    assert.equal(t.events.length, n)
  })

  it('crash entre sessões: startup apaga as sobras e só depois abre', async () => {
    const t = setup()
    t.store.staged.set('f0-orphan01', 500)
    await t.flow.startup()
    assert.equal(t.store.staged.size, 0)
    t.h.boot()
    await t.send(LAYOUTS)
    t.h.flush()
    assert.equal(t.store.staged.size, 1)
  })

  it('remoção que falha: aviso na sessão, id retido e apagado no retryCleanup', async () => {
    const t = setup({ dwg: 'unavailable' })
    t.h.boot()
    await t.send('planta.dwg')
    const id = t.idOf('planta.dwg')
    t.store.failRemove.add(id)
    t.h.flush()
    await t.flow.settled()
    assert.deepEqual(t.flow.leakedIds, [id])
    assert.equal(t.h.state.files.cleanupFailures, 1)
    t.store.failRemove.clear()
    await t.flow.retryCleanup()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(t.flow.leakedIds, [])
  })
})

describe('estado de sessão e textos', () => {
  it('rejeição local aparece em files.error (PT-PT) e uma nova escolha limpa-a', async () => {
    const t = setup()
    t.h.boot()
    await t.send('foto.png')
    assert.equal(t.h.state.files.error?.code, 'unsupported-ext')
    assert.equal(
      describeFiles(t.h.state.files),
      'Só são aceites ficheiros .dwg e .dxf.'
    )
    assert.equal(t.h.viewer.received.length, 0, 'nada chegou ao viewer')
    t.picker.willPick(t.store.addSource(pickedFile(LAYOUTS, 50), 50))
    const p = t.flow.pickAndOpen()
    assert.equal(t.h.state.files.phase, 'picking')
    assert.equal(describeFiles(t.h.state.files), 'A escolher o ficheiro…')
    await p
    assert.equal(t.h.state.files.error, null)
  })

  it('too-large (sem servidor) → mensagem; com servidor o mesmo ficheiro abre por url', async () => {
    const t = setup()
    t.h.boot()
    const big = 9 * 1024 * 1024
    const r = await t.send(LAYOUTS, big)
    assert.deepEqual(r, { status: 'rejected', code: 'too-large' })
    assert.match(describeFiles(t.h.state.files) ?? '', /demasiado grande/)
    t.urls.enabled = true
    t.store.sources.clear()
    assert.equal((await t.send(LAYOUTS, big)).status, 'handed-off')
    t.h.flush()
    assert.equal(t.h.state.document.current?.name, LAYOUTS)
    assert.equal(
      describeDocument(t.h.state.document)?.startsWith(LAYOUTS),
      true
    )
  })

  it('o estado reinicia no reload', async () => {
    const t = setup()
    t.h.boot()
    await t.send('foto.png')
    t.h.dispatch({ kind: 'reload' })
    assert.equal(t.h.state.files.error, null)
  })
})

describe('higiene (acceptance 2) e offline (acceptance 1)', () => {
  async function scenarios() {
    const t = setup({ dwg: 'unavailable' })
    t.h.boot()
    const secrets: string[] = [SECRET_CACHE_DIR, 'Obra Cliente X', 'data/user']
    const dirty = (name: string, size: number) => {
      const f = pickedFile(`/storage/Obra Cliente X/${name}`, size)
      secrets.push(f.uri)
      return t.flow.openPicked(t.store.addSource(f, size))
    }
    await dirty(LAYOUTS, 100) // ok
    t.h.flush()
    await dirty('desconhecido.dxf', 100) // openFailed
    t.h.flush()
    await dirty('planta.dwg', 100) // dwg-unavailable
    t.h.flush()
    await dirty('foto.png', 10) // unsupported-ext
    t.store.failStage = true
    await dirty(BLOCKS, 100) // stage falha com caminhos na excepção
    t.store.failStage = false
    t.store.failSizeOf = true
    await t.flow.openPicked(
      t.store.addSource(
        pickedFile(`/storage/Obra Cliente X/${BLOCKS}`, null),
        1
      )
    )
    t.h.client.processGone()
    await t.flow.dispose()
    return { t, secrets }
  }

  it('nenhum evento, estado ou mensagem para o viewer contém caminhos/URIs internos', async () => {
    const { t, secrets } = await scenarios()
    const blob = JSON.stringify({
      flow: t.events,
      bridge: t.h.events,
      state: t.h.state,
      toViewer: t.h.viewer.received,
      text: [
        describeFiles(t.h.state.files),
        describeDocument(t.h.state.document)
      ]
    })
    for (const s of secrets) {
      assert.ok(!blob.includes(s), `fuga: ${s}`)
    }
    assert.ok(!/file:\/\/|content:\/\/|\/storage\/|\/data\/user/.test(blob))
    // só o basename segue para o viewer
    assert.ok(
      t.h.viewer.received.every(
        m => m.type !== 'open' || !m.payload.name.includes('/')
      )
    )
  })

  it('não há cópias esquecidas no fim (store vazia, nada em `leaked`)', async () => {
    const { t } = await scenarios()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(t.flow.leakedIds, [])
    assert.deepEqual(t.flow.tracked, [])
  })

  it('é determinístico: a mesma sequência dá os mesmos eventos', async () => {
    const a = await scenarios()
    const b = await scenarios()
    assert.deepEqual(a.t.events, b.t.events)
    assert.deepEqual(a.t.h.state, b.t.h.state)
  })

  it('o fluxo não faz pedidos de rede (fetch/XHR armadilhados) e só entrega URLs loopback', async () => {
    const g = globalThis as Record<string, unknown>
    const saved = { fetch: g.fetch, XMLHttpRequest: g.XMLHttpRequest }
    let calls = 0
    g.fetch = () => {
      calls++
      throw new Error('rede proibida')
    }
    g.XMLHttpRequest = function () {
      calls++
      throw new Error('rede proibida')
    }
    try {
      await scenarios()
      const t = setup()
      t.urls.enabled = true
      t.h.boot()
      await t.send(LAYOUTS, 15 * 1024 * 1024)
      const open = t.h.viewer.received.find(m => m.type === 'open')
      assert.ok(open && open.type === 'open')
      assert.equal(open.payload.source.kind, 'url')
      assert.match(
        (open.payload.source as { url: string }).url,
        /^http:\/\/127\.0\.0\.1:\d+\//
      )
    } finally {
      g.fetch = saved.fetch
      g.XMLHttpRequest = saved.XMLHttpRequest
    }
    assert.equal(calls, 0)
  })

  it('o código do fluxo não contém APIs de rede nem logging (varrimento estático)', () => {
    const dir = new URL('.', import.meta.url)
    const sources = readdirSync(dir).filter(
      f => f.endsWith('.ts') && !f.endsWith('.node-test.ts')
    )
    assert.ok(sources.length >= 3)
    for (const f of sources) {
      const text = readFileSync(new URL(f, dir), 'utf8')
      assert.ok(
        !/\bfetch\s*\(|XMLHttpRequest|WebSocket|node:(http|https|net|dns|tls)|console\./.test(
          text
        ),
        `${f} usa rede ou console`
      )
    }
  })
})
