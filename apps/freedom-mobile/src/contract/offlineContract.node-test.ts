// SPDX-License-Identifier: GPL-3.0-or-later
//
// Contrato offline app ↔ viewer ponta-a-ponta (M2-T1, spec §2 G1/G2/G5):
// picker → FileFlow → BridgeClient REAL → viewer sintético → FIND → zoom →
// clearHighlight → novo documento, com a rede armadilhada em todo o percurso.
// Só fixtures sintéticas (src/fixtures/PROVENANCE.md); sem parser, sem DWG.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'

import { MAX_BASE64_BYTES, MAX_DOCUMENT_BYTES } from '../contracts/protocol.ts'
import { FileFlow, type FileFlowEvent } from '../files/fileFlow.ts'
import { createAssetIdGenerator } from '../files/names.ts'
import {
  FakeAssetStore,
  FakePicker,
  FakeUrls,
  pickedFile,
  SECRET_CACHE_DIR
} from '../fixtures/fakeFiles.ts'
import { createHarness, type HarnessOptions } from '../fixtures/harness.ts'
import { SYNTHETIC_LAYOUTS_DOC } from '../fixtures/syntheticDocuments.ts'

const LAYOUTS = 'synthetic-layouts.dxf'
const BLOCKS = 'synthetic-blocks.dxf'

// -- rede armadilhada em TODO o ficheiro -------------------------------------

const networkCalls: string[] = []
const saved: Record<string, unknown> = {}
const TRAPPED = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'] as const

before(() => {
  const g = globalThis as Record<string, unknown>
  for (const name of TRAPPED) {
    saved[name] = g[name]
    g[name] = function trapped() {
      networkCalls.push(name)
      throw new Error(`rede proibida: ${name}`)
    }
  }
})

after(() => {
  const g = globalThis as Record<string, unknown>
  for (const name of TRAPPED) {
    if (saved[name] === undefined) delete g[name]
    else g[name] = saved[name]
  }
  assert.deepEqual(networkCalls, [], 'houve pedidos de rede durante os testes')
})

// -- montagem: FileFlow + BridgeClient real + viewer sintético ---------------

function setup(options: HarnessOptions = {}, loopback = true) {
  let k = 0
  const store = new FakeAssetStore()
  const urls = new FakeUrls()
  urls.enabled = loopback
  const picker = new FakePicker()
  const fileEvents: FileFlowEvent[] = []
  const h = createHarness({ ...options, onEvent: e => flow.handle(e) })
  const flow = new FileFlow({
    picker,
    store,
    urls,
    bridge: h.client,
    onEvent: e => {
      fileEvents.push(e)
      h.dispatch(e)
    },
    newAssetId: createAssetIdGenerator(() => ((k += 7) % 36) / 36)
  })
  /** Ficheiro "no disco" escolhido pelo utilizador e entregue à ponte. */
  const open = async (name: string, size = 4096) => {
    const out = await flow.openPicked(
      store.addSource(pickedFile(name, size), size)
    )
    h.flush()
    return out
  }
  const find = (query: string, extra: { matchCase?: boolean } = {}) => {
    const r = h.client.find({
      query,
      matchCase: extra.matchCase ?? false,
      scope: 'drawing'
    })
    assert.equal(r.ok, true, 'find rejeitado')
    h.flush()
  }
  return { h, flow, store, urls, picker, fileEvents, open, find }
}

type Setup = ReturnType<typeof setup>

/** Nome do documento aberto (função: evita o estreitamento de `state`). */
const currentName = (s: Setup): string | undefined =>
  s.h.state.document.current?.name

const booted = (options: HarnessOptions = {}, loopback = true): Setup => {
  const s = setup(options, loopback)
  s.h.boot()
  return s
}

const centre = (b: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}) => [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]

// ---------------------------------------------------------------------------

describe('contrato offline ponta-a-ponta (G1)', () => {
  it('offline end-to-end: abrir → FIND → next/prev → zoom → limpar → novo documento', async () => {
    const s = booted()
    const { h } = s

    // Abrir: o ficheiro vai por URL loopback com o nome seguro e tamanho real.
    assert.equal(h.state.shell.viewer, 'ready')
    const out = await s.open(LAYOUTS, 5000)
    assert.equal(out.status, 'handed-off')
    assert.equal(h.state.document.current?.name, LAYOUTS)
    assert.equal(h.state.document.current?.layouts.length, 3)
    const open = h.viewer.received.find(m => m.type === 'open')
    assert.ok(open && open.type === 'open')
    assert.equal(open.payload.name, LAYOUTS)
    assert.equal(open.payload.size, 5000)
    assert.equal(open.payload.source.kind, 'url')
    assert.match(
      (open.payload.source as { url: string }).url,
      /^http:\/\/127\.0\.0\.1:\d+\//
    )

    // FIND multi-layout: 4 hits, por `tabOrder`; o 1.º é seleccionado sozinho.
    s.find('parede')
    const f = h.state.find
    assert.equal(f.status, 'results')
    assert.equal(f.total, 4)
    assert.equal(f.layoutCount, 3)
    assert.deepEqual(
      f.hits.map(x => x.layoutName),
      ['Model', 'Planta', 'Planta', 'Alçados']
    )
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(h.state.selection.hit?.index, 0)
    assert.equal(h.viewer.activeIndex, 0)

    // next/prev com wrap nos dois sentidos.
    const step = (dir: 'findNext' | 'findPrev') => {
      assert.equal(
        h.client[dir]({ findId: h.state.find.findId as number }).ok,
        true
      )
      h.flush()
      return h.state.find.activeIndex
    }
    assert.deepEqual(
      [step('findNext'), step('findNext'), step('findNext')],
      [1, 2, 3]
    )
    assert.equal(step('findNext'), 0)
    assert.equal(step('findPrev'), 3)
    assert.equal(h.state.selection.hit?.index, 3)

    // Zoom in/out mantêm o centro; extents repõe a vista; FIND/seleção intactos.
    const c0 = centre(h.viewer.camera!)
    h.client.zoom({ op: 'in' })
    h.client.zoom({ op: 'out' })
    h.flush()
    assert.deepEqual(centre(h.viewer.camera!), c0)
    h.client.zoom({ op: 'in' })
    h.flush()
    assert.notDeepEqual(h.viewer.camera, SYNTHETIC_LAYOUTS_DOC.extents)
    h.client.zoom({ op: 'extents' })
    h.flush()
    assert.deepEqual(h.viewer.camera, SYNTHETIC_LAYOUTS_DOC.extents)
    assert.equal(h.state.find.activeIndex, 3)
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(h.state.zoom.error, null)

    // Limpar o realce: a seleção cai, a posição na lista mantém-se.
    h.client.clearHighlight()
    h.flush()
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.viewer.highlighted, false)
    assert.equal(h.state.find.activeIndex, 3)

    // Novo documento: FIND/seleção/zoom reiniciam e o asset anterior é libertado.
    const firstAsset = s.fileEvents.find(e => e.kind === 'file-handed-off')
    await s.open(BLOCKS, 3000)
    assert.equal(h.state.document.current?.name, BLOCKS)
    assert.equal(h.state.find.status, 'idle')
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.state.zoom.lastOp, null)
    assert.ok(firstAsset && firstAsset.kind === 'file-handed-off')
    assert.equal(s.store.staged.has(firstAsset.assetId), false)
    assert.equal(s.store.staged.size, 1)

    // Texto em bloco no documento novo.
    s.find('obra')
    assert.equal(h.state.find.hits[0].blockName, 'CARIMBO')
    assert.equal(h.state.find.hits[0].tag, 'OBRA')

    assert.deepEqual(networkCalls, [])
  })

  it('offline sem servidor local: ≤ 8 MB vai por base64 (sem URL), acima é too-large explícito', async () => {
    const s = booted({}, false)
    const out = await s.open(LAYOUTS, 1024)
    assert.equal(out.status, 'handed-off')
    const open = s.h.viewer.received.find(m => m.type === 'open')
    assert.ok(open && open.type === 'open')
    assert.equal(open.payload.source.kind, 'base64')

    const big = await s.open(BLOCKS, MAX_BASE64_BYTES + 1)
    assert.equal(big.status, 'rejected')
    assert.equal(s.h.state.files.error?.code, 'too-large')
    // O documento aberto mantém-se e nada acima do limite chegou ao viewer.
    assert.equal(s.h.state.document.current?.name, LAYOUTS)
    assert.equal(s.h.viewer.received.filter(m => m.type === 'open').length, 1)
  })

  it('nenhum comando chega ao viewer com a validação local a falhar', async () => {
    const s = booted()
    const before = s.h.viewer.received.length
    await s.open('notas.txt', 100)
    assert.equal(s.h.state.files.error?.code, 'unsupported-ext')
    await s.open('grande.dxf', MAX_DOCUMENT_BYTES.dxf + 1)
    assert.equal(s.h.state.files.error?.code, 'too-large')
    await s.open('grande.dwg', MAX_DOCUMENT_BYTES.dwg + 1)
    assert.equal(s.h.state.files.error?.code, 'too-large')
    assert.equal(s.h.viewer.received.length, before)
    assert.equal(s.store.staged.size, 0)
  })

  it('sem caminhos internos em nenhum evento, estado ou mensagem para o viewer', async () => {
    const s = booted()
    await s.open(LAYOUTS)
    s.find('parede')
    s.store.failStage = true
    await s.open(BLOCKS)
    const blob = JSON.stringify([
      s.fileEvents,
      s.h.events,
      s.h.state,
      s.h.viewer.received
    ])
    assert.ok(!blob.includes(SECRET_CACHE_DIR), 'caminho da cache vazou')
    assert.ok(!blob.includes('storage/emulated'), 'caminho do utilizador vazou')
    assert.ok(!/file:\/\/|content:\/\//.test(blob), 'URI do SO vazou')
  })
})

describe('erros do contrato ponta-a-ponta', () => {
  it('DWG indisponível: .dwg falha com dwg-unavailable e o DXF continua a funcionar', async () => {
    const s = booted({ dwg: 'unavailable' })
    assert.equal(s.h.state.shell.dwg, 'unavailable')
    await s.open('synthetic-layouts.dwg', 2048)
    assert.equal(s.h.state.document.error?.code, 'dwg-unavailable')
    assert.equal(s.h.state.document.current, null)
    assert.equal(s.store.staged.size, 0, 'asset DWG não foi libertado')
    await s.open(LAYOUTS)
    assert.equal(currentName(s), LAYOUTS)
    assert.equal(s.h.state.document.error, null)
    s.find('cobertura')
    assert.equal(s.h.state.find.total, 1)
  })

  it('open falhado no viewer preserva documento, FIND e seleção anteriores', async () => {
    const s = booted()
    await s.open(LAYOUTS)
    s.find('parede')
    const hits = s.h.state.find.hits
    await s.open('desconhecido.dxf')
    assert.equal(s.h.state.document.error?.code, 'read-failed')
    assert.equal(s.h.state.document.current?.name, LAYOUTS)
    assert.deepEqual(s.h.state.find.hits, hits)
    assert.equal(s.h.state.selection.status, 'selected')
    assert.equal(s.store.staged.size, 1, 'só o documento activo fica em disco')
  })

  it('stale-find e layout-missing são visíveis e nunca navegam em silêncio', async () => {
    const s = booted({ missingLayouts: ['B3'] })
    await s.open(LAYOUTS)
    s.find('parede')
    const id = s.h.state.find.findId as number
    // goto para o hit de «Alçados» (layout em falta).
    const last = s.h.state.find.hits.findIndex(x => x.layoutName === 'Alçados')
    assert.ok(last >= 0)
    s.h.client.goto({ findId: id, index: last })
    s.h.flush()
    assert.equal(s.h.state.find.navigation, 'unavailable')
    assert.equal(s.h.state.find.lastOutcome, 'layout-missing')
    assert.equal(s.h.state.find.status, 'results')
    // findId antigo → error stale-find; a lista continua.
    s.find('cobertura')
    const stale = s.h.client.goto({ findId: id, index: 0 })
    s.h.flush()
    assert.equal(stale.ok, true)
    assert.equal(
      s.h.events.some(
        e => e.kind === 'viewer-error' && e.payload.code === 'stale-find'
      ),
      true
    )
    assert.equal(s.h.state.find.status, 'results')
  })

  it('crash da WebView a meio: tudo é libertado, o reload recupera e abre de novo', async () => {
    const s = booted()
    await s.open(LAYOUTS)
    s.find('parede')
    s.h.client.processGone()
    assert.equal(s.h.state.shell.viewer, 'failed')
    assert.equal(s.h.state.document.current, null)
    assert.equal(s.h.state.find.status, 'idle')
    assert.equal(s.store.staged.size, 0)
    // Com a ponte caída nada é copiado nem enviado.
    const before = s.h.viewer.received.length
    await s.open(BLOCKS)
    assert.equal(s.h.viewer.received.length, before)
    assert.equal(s.store.staged.size, 0)
    // Novo `ready` (WebView recriada) → volta a funcionar.
    s.h.boot()
    assert.equal(s.h.state.shell.viewer, 'ready')
    await s.open(BLOCKS)
    assert.equal(currentName(s), BLOCKS)
  })

  it('ready em falta: o open em fila é descartado e o asset apagado', async () => {
    const s = setup()
    await s.flow.openPicked(s.store.addSource(pickedFile(LAYOUTS, 100), 100))
    assert.equal(s.store.staged.size, 1)
    s.h.timers.advance(15_000)
    assert.equal(s.h.state.shell.error, 'ready-timeout')
    assert.equal(s.store.staged.size, 0)
    assert.equal(s.h.state.document.opening, null)
  })
})

describe('§5.1 do lado viewer: versão e tipo fora do contrato (G2)', () => {
  const inject = (s: Setup, msg: Record<string, unknown>) =>
    s.h.viewer.handle(
      `window.__cadBridge.receive(${JSON.stringify(JSON.stringify(msg))});true;`
    )

  it('v !== 1 → error{unsupported-version} correlacionado, sem lançar nem actuar', async () => {
    const s = booted()
    await s.open(LAYOUTS)
    const doc = s.h.viewer.doc
    assert.doesNotThrow(() =>
      inject(s, { v: 2, id: 'a-90', type: 'find', payload: { query: 'x' } })
    )
    const [raw] = s.h.viewer.drain()
    const reply = JSON.parse(raw)
    assert.equal(reply.type, 'error')
    assert.equal(reply.replyTo, 'a-90')
    assert.equal(reply.payload.code, 'unsupported-version')
    assert.equal(s.h.viewer.find, null, 'a mensagem foi executada')
    assert.equal(s.h.viewer.doc, doc)
    // A app trata o erro sem lançar e sem alterar o documento.
    assert.doesNotThrow(() => s.h.client.receive(raw))
    assert.equal(s.h.state.document.current?.name, LAYOUTS)
  })

  it('type desconhecido → error{unknown-type}; o viewer continua utilizável', async () => {
    const s = booted()
    await s.open(LAYOUTS)
    assert.doesNotThrow(() =>
      inject(s, { v: 1, id: 'a-91', type: 'saveAs', payload: {} })
    )
    const [raw] = s.h.viewer.drain()
    const reply = JSON.parse(raw)
    assert.equal(reply.payload.code, 'unknown-type')
    assert.equal(reply.replyTo, 'a-91')
    assert.doesNotThrow(() => s.h.client.receive(raw))
    s.find('parede')
    assert.equal(s.h.state.find.status, 'results')
  })

  it('o protocolo não tem nenhuma mensagem de edição, cloud, conta ou IA', () => {
    const src = readFileSync(
      new URL('../contracts/protocol.ts', import.meta.url),
      'utf8'
    )
    const block = /APP_TO_VIEWER_TYPES = \[([^\]]*)\]/.exec(src)?.[1] ?? ''
    for (const t of block.match(/'[A-Za-z]+'/g) ?? []) {
      assert.doesNotMatch(t, /save|edit|upload|login|cloud|account|ai/i)
    }
    assert.ok((block.match(/'[A-Za-z]+'/g) ?? []).length >= 8)
  })
})

// -- matriz de rastreabilidade §7.3 (G5) -------------------------------------

/** caso obrigatório de arquitectura §7.3 → [ficheiro, título (parte) do teste]. */
export const TRACE: Record<string, readonly [string, string]> = {
  'sem match': [
    '../fixtures/syntheticViewer.node-test.ts',
    'no match → total 0'
  ],
  '1 match': ['../fixtures/syntheticViewer.node-test.ts', 'one match, with'],
  'multi-layout': [
    '../fixtures/syntheticViewer.node-test.ts',
    'multi-layout hits come ordered by tabOrder'
  ],
  'texto em bloco': [
    '../fixtures/syntheticViewer.node-test.ts',
    'text inside blocks keeps blockName and tag'
  ],
  truncated: [
    '../fixtures/syntheticViewer.node-test.ts',
    'truncated: maxResults caps hits'
  ],
  'wrap next/prev': [
    '../fixtures/syntheticViewer.node-test.ts',
    'goto navigates and highlights; next/prev wrap in both directions'
  ],
  'wrap a partir de sem hit activo': [
    '../fixtures/syntheticViewer.node-test.ts',
    'from no active hit both directions go to 0'
  ],
  'stale-find': [
    '../fixtures/syntheticViewer.node-test.ts',
    'stale findId → error stale-find'
  ],
  'layout-missing': [
    '../fixtures/syntheticViewer.node-test.ts',
    'layout-missing is reported, not navigated'
  ],
  'extensão inválida': [
    '../fixtures/syntheticViewer.node-test.ts',
    'fails with explicit codes and keeps the previous document'
  ],
  'extensão inválida (local)': [
    '../contracts/protocol.node-test.ts',
    'rejects extensions other than dwg/dxf before anything is sent'
  ],
  'versão desconhecida': [
    './offlineContract.node-test.ts',
    'v !== 1 → error{unsupported-version}'
  ],
  'type desconhecido': [
    './offlineContract.node-test.ts',
    'type desconhecido → error{unknown-type}'
  ],
  'round-trip duplo stringify': [
    '../contracts/protocol.node-test.ts',
    'round-trips quotes, newlines, </script>, emoji and U+2028/2029'
  ],
  'offline ponta-a-ponta': [
    './offlineContract.node-test.ts',
    'offline end-to-end: abrir → FIND'
  ],
  'D-4 FIND é prioridade': [
    '../state/findPriority.node-test.ts',
    'FIND priority (D-4) P1'
  ],
  'ciclo de vida dos assets': [
    '../files/fileLifecycle.node-test.ts',
    'o fluxo não faz pedidos de rede'
  ],
  'DWG não verificado (EXT-3)': [
    './fixtureGate.node-test.ts',
    'DWG: não verificado (EXT-3)'
  ]
}

describe('rastreabilidade §7.3 (G5)', () => {
  it('cada caso obrigatório tem um teste existente que o prova', () => {
    for (const [caso, [file, title]] of Object.entries(TRACE)) {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8')
      assert.ok(text.includes(title), `«${caso}»: falta «${title}» em ${file}`)
    }
  })

  it('os casos de §7.3 estão todos na matriz', () => {
    for (const caso of [
      'sem match',
      '1 match',
      'multi-layout',
      'texto em bloco',
      'truncated',
      'wrap next/prev',
      'stale-find',
      'layout-missing',
      'versão desconhecida',
      'type desconhecido',
      'extensão inválida'
    ]) {
      assert.ok(caso in TRACE, `caso «${caso}» sem teste`)
    }
  })
})
