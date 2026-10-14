// SPDX-License-Identifier: GPL-3.0-or-later
//
// Validação integrada do MVP (OBJ-0104 M4-S2). UM circuito só,
// sem duplos nos meios, para cada cenário:
//
//   FileFlow (app) → LocalAssetServer (app) → sockets REAIS de 127.0.0.1
//     → createLoopbackFetch (viewer) → importador + parser DXF REAL
//     → FIND REAL → ViewerSession/dispatcher (viewer) → BridgeClient (app)
//     → sessionReducer (app)
//
// O QUE ESTE FICHEIRO PROVA: modelo (documento/layouts/DocumentMap), protocolo,
// comandos (open/find/next/prev/zoom/clearHighlight), erros e offline.
// O QUE NÃO PROVA — RENDERIZAÇÃO: a vista é o `FakeView` (um `ViewPort` de
// teste que só regista `zoomTo`/`clearSelection`/`navigate`; não desenha, não
// há canvas, WebGL, pixels nem layout CSS). Nenhuma asserção abaixo é
// evidência de renderização, nem em desktop nem a 390 px. Descoping
// vinculativo: a evidência de superfície real (pixels desktop + 390 px) NÃO é
// deste ficheiro: o M4-I6 entregou-a em `docs/evidence/OBJ-0104-m4-i6/`
// (Chromium 1280×800 e 390×844 pelo caminho da app: `chromium/`; Android 14
// real com listener nativo e WebView: `android/`). Aqui, a ausência de WebGL
// ou de dispositivo NÃO conta como «passou». Ver
// `docs/OBJ-0104-m4-s2-integrated-validation.md` §3.
// Também não são reais aqui: o listener nativo (um `node:http` de teste faz de
// `HttpListenerPort`), WebView/CSP/Sec-Fetch e qualquer dispositivo.
// Fixtures: só as DXF de `cad-viewer-example/e2e/fixtures`, lidas in-place
// (proveniência em `__tests__/PROVENANCE.md`). DWG: sem fixture autorizada
// (EXT-3) → «não verificado», nunca «passou».

import net from 'node:net'

import {
  BridgeClient,
  type BridgeEvent
} from '../../../apps/freedom-mobile/src/bridge/BridgeClient'
import { MAX_DOCUMENT_BYTES } from '../../../apps/freedom-mobile/src/contracts/protocol'
import {
  FileFlow,
  type FileFlowEvent,
  type FileFlowResult
} from '../../../apps/freedom-mobile/src/files/fileFlow'
import { createAssetIdGenerator } from '../../../apps/freedom-mobile/src/files/names'
import type {
  AssetStorePort,
  PickedFile
} from '../../../apps/freedom-mobile/src/files/ports'
import { NO_LOCAL_SERVER } from '../../../apps/freedom-mobile/src/files/ports'
import { FakePicker } from '../../../apps/freedom-mobile/src/fixtures/fakeFiles'
import { BUNDLE_FILES } from '../../../apps/freedom-mobile/src/fixtures/fakeServer'
import { FakeTimers } from '../../../apps/freedom-mobile/src/fixtures/harness'
import { createMemoryBundle } from '../../../apps/freedom-mobile/src/server/bundle'
import { LocalAssetServer } from '../../../apps/freedom-mobile/src/server/localAssetServer'
import { createNodeListener } from '../../../apps/freedom-mobile/src/server/nodeListener.node-test'
import {
  initialSessionState,
  type SessionAction,
  sessionReducer,
  type SessionState
} from '../../../apps/freedom-mobile/src/state/session'
import { createLoopbackFetch } from '../src/import/loopbackFetch'
import { createViewerDispatcher } from '../src/viewer/dispatcher'
import { ViewerSession } from '../src/viewer/session'
import { e2eBytes } from './helpers/openFixture'
import { buildDxf, fakeDwgHeader, rawEntity } from './helpers/syntheticDxf'
// `FakeView` é um duplo do `ViewPort`: regista chamadas, NÃO renderiza.
import { decodeInjection, FakeView } from './helpers/viewerHarness'

type Bytes = Uint8Array

/** Armazém de assets em memória com BYTES REAIS (o `FakeAssetStore` só tem tamanhos). */
class RealBytesStore implements AssetStorePort {
  readonly sources = new Map<string, Bytes>()
  readonly staged = new Map<string, Bytes>()
  addSource(file: PickedFile, bytes: Bytes): PickedFile {
    this.sources.set(file.uri, bytes)
    return file
  }
  async sizeOf(uri: string) {
    const b = this.sources.get(uri)
    if (!b) throw new Error('ENOENT')
    return b.byteLength
  }
  async stage(source: { uri: string; consume: boolean }, assetId: string) {
    const b = this.sources.get(source.uri)
    if (!b) throw new Error('ENOENT')
    this.staged.set(assetId, b)
    if (source.consume) this.sources.delete(source.uri)
    return { size: b.byteLength }
  }
  async readBase64(assetId: string) {
    const b = this.staged.get(assetId)
    if (!b) throw new Error('ENOENT')
    return Buffer.from(b).toString('base64')
  }
  async remove(assetId: string) {
    this.staged.delete(assetId)
  }
  async discardSource(uri: string) {
    this.sources.delete(uri)
  }
  async sweep() {
    const n = this.staged.size
    this.staged.clear()
    return n
  }
}

const bytesOf = (name: string): Bytes => new Uint8Array(e2eBytes(name))

const picked = (name: string, size: number): PickedFile => ({
  name,
  size,
  uri: `file:///cache/picker/${name}`,
  owned: true
})

/** Regista TODO o destino de ligações TCP e armadilha as outras vias de rede. */
function networkSpy() {
  const connects: string[] = []
  const realConnect = net.Socket.prototype.connect
  const g = globalThis as Record<string, unknown>
  const saved = {
    XMLHttpRequest: g.XMLHttpRequest,
    WebSocket: g.WebSocket,
    EventSource: g.EventSource
  }
  const trap = (name: string) =>
    function () {
      throw new Error(`${name} é proibido (offline)`)
    }
  return {
    connects,
    install() {
      net.Socket.prototype.connect = function (
        this: net.Socket,
        ...args: unknown[]
      ) {
        // o destino REAL (já resolvido) fica registado quando a ligação se faz
        this.once('connect', () => connects.push(String(this.remoteAddress)))
        return (realConnect as (...a: unknown[]) => net.Socket).apply(
          this,
          args
        )
      } as typeof net.Socket.prototype.connect
      g.XMLHttpRequest = trap('XMLHttpRequest')
      g.WebSocket = trap('WebSocket')
      g.EventSource = trap('EventSource')
    },
    restore() {
      net.Socket.prototype.connect = realConnect
      Object.assign(g, saved)
    }
  }
}

interface Rig {
  store: RealBytesStore
  flow: FileFlow
  client: BridgeClient
  view: FakeView
  session: ViewerSession
  server: LocalAssetServer | null
  events: BridgeEvent[]
  sent: string[]
  readonly state: SessionState
  /** Espera até que o canal viewer→app fique sem mensagens em curso. */
  settle(): Promise<void>
  open(name: string, bytes: Bytes): Promise<FileFlowResult>
  send<T>(f: () => T): Promise<T>
  dispose(): Promise<void>
}

async function rig(
  opts: { useServer?: boolean; dwg?: 'ok' | 'unavailable' } = {}
): Promise<Rig> {
  const useServer = opts.useServer ?? true
  const store = new RealBytesStore()
  const view = new FakeView()
  let server: LocalAssetServer | null = null
  let fetchBytes: ((url: string) => Promise<ArrayBuffer>) | undefined
  if (useServer) {
    server = new LocalAssetServer({
      listener: createNodeListener(),
      bundle: createMemoryBundle(BUNDLE_FILES),
      assets: {
        sizeOf: async id => store.staged.get(id)?.byteLength ?? null,
        read: async id => store.staged.get(id) ?? new Uint8Array(0)
      }
    })
    const info = await server.start()
    fetchBytes = createLoopbackFetch({
      page: {
        origin: info.origin,
        pathname: new URL(info.viewerUrl).pathname
      }
    })
  }
  const session = new ViewerSession({
    dwg: opts.dwg ?? 'unavailable',
    view,
    fetchBytes
  })
  const dispatcher = createViewerDispatcher(session)

  let state: SessionState = initialSessionState
  const events: BridgeEvent[] = []
  const sent: string[] = []
  let inflight = 0
  let idle: (() => void)[] = []
  const done = () => {
    if (--inflight === 0) {
      const w = idle
      idle = []
      w.forEach(f => f())
    }
  }
  const dispatch = (a: SessionAction) => {
    state = sessionReducer(state, a)
  }
  const timers = new FakeTimers()

  // referência circular: o cliente e o fluxo precisam um do outro
  // eslint-disable-next-line prefer-const
  let flow: FileFlow | undefined
  // eslint-disable-next-line prefer-const
  let client: BridgeClient | undefined
  const deliver = async (script: string) => {
    try {
      const outs = await dispatcher.receive(decodeInjection(script))
      for (const text of outs) client?.receive(text)
    } finally {
      done()
    }
  }
  const bridge = new BridgeClient({
    timers,
    inject: script => {
      sent.push(script)
      inflight++
      void deliver(script)
    },
    onEvent: (e: BridgeEvent) => {
      events.push(e)
      dispatch(e)
      flow?.handle(e)
    }
  })
  client = bridge
  let k = 0
  const fileFlow = new FileFlow({
    picker: new FakePicker(),
    store,
    urls: server ?? NO_LOCAL_SERVER,
    bridge,
    onEvent: (e: FileFlowEvent) => dispatch(e),
    newAssetId: createAssetIdGenerator(() => ((k += 7) % 36) / 36)
  })
  flow = fileFlow
  // o viewer anuncia `ready` quando arranca
  bridge.receive(dispatcher.ready(opts.dwg ?? 'unavailable'))

  const settle = async () => {
    // cada resposta pode provocar novos comandos (goto automático)
    for (let guard = 0; guard < 100; guard++) {
      if (inflight === 0) {
        await new Promise(r => setImmediate(r))
        if (inflight === 0) return
      }
      await new Promise<void>(r => idle.push(r))
    }
    throw new Error('settle não convergiu')
  }

  return {
    store,
    flow: fileFlow,
    client: bridge,
    view,
    session,
    server,
    events,
    sent,
    get state() {
      return state
    },
    settle,
    async open(name, bytes) {
      const file = store.addSource(picked(name, bytes.byteLength), bytes)
      const r = await fileFlow.openPicked(file)
      await settle()
      // o renderer mostra o layout activo do documento aberto
      const cur = state.document.current
      if (cur) view.layout = cur.activeLayoutId
      return r
    },
    async send(f) {
      const r = f()
      await settle()
      return r
    },
    async dispose() {
      await fileFlow.dispose()
      bridge.dispose()
      await server?.dispose()
    }
  }
}

const PAREDE = { matchCase: false, scope: 'drawing' as const }
const spy = networkSpy()
beforeAll(() => spy.install())
afterAll(() => spy.restore())

/**
 * Cenários de abertura, por URL loopback (caminho de produção) e por base64.
 * Provam modelo + protocolo (`opened`, layouts, estado da sessão); NÃO provam
 * renderização (a vista é o `FakeView`).
 */
describe.each([
  ['URL loopback (servidor real + fetch do viewer)', true],
  ['base64 (fallback do FileFlow)', false]
] as const)(
  'abrir (modelo + protocolo, sem pixels): %s',
  (_label, useServer) => {
    let r: Rig
    beforeEach(async () => {
      r = await rig({ useServer })
    })
    afterEach(async () => {
      await r.dispose()
    })

    test.each([
      ['minimal-line.dxf', 1],
      ['find-layouts.dxf', 3],
      ['find-blocks.dxf', 1],
      ['block-color.dxf', 1]
    ])(
      '%s abre como DXF com %i layout(s) e o ViewPort de teste recebe clearSelection',
      async (name, n) => {
        const res = await r.open(name, bytesOf(name))
        expect(res.status).toBe('handed-off')
        const doc = r.state.document.current
        expect(doc).toMatchObject({ name, format: 'dxf' })
        expect(doc?.layouts.length).toBeGreaterThanOrEqual(n)
        expect(r.state.document.error).toBeNull()
        expect(r.state.document.opening).toBeNull()
        // chamada registada pelo FakeView — não é evidência de render
        expect(r.view.clears).toBeGreaterThan(0)
        // o caminho percorrido é o esperado
        const open = r.sent
          .map(s => JSON.parse(decodeInjection(s)))
          .find(m => m.type === 'open')
        expect(open.payload.source.kind).toBe(useServer ? 'url' : 'base64')
      }
    )

    test('sheet_0.dxf (≈1,9 MB) abre; tempo de abertura registado (medição P-5)', async () => {
      const bytes = bytesOf('sheet_0.dxf')
      const t0 = performance.now()
      const res = await r.open('sheet_0.dxf', bytes)
      const ms = Math.round(performance.now() - t0)
      expect(res.status).toBe('handed-off')
      expect(r.state.document.current?.name).toBe('sheet_0.dxf')
      console.log(
        `[M4-S2 medição] ${useServer ? 'url' : 'base64'} sheet_0.dxf ${bytes.byteLength} B → opened em ${ms} ms (Node/jest; NÃO é medida de dispositivo)`
      )
    })
  }
)

describe('FIND + comandos de zoom sobre DXF reais (circuito completo; vista = FakeView)', () => {
  let r: Rig
  beforeEach(async () => {
    r = await rig()
    await r.open('find-layouts.dxf', bytesOf('find-layouts.dxf'))
  })
  afterEach(async () => {
    await r.dispose()
  })

  const search = (query: string, extra = {}) =>
    r.send(() => r.client.find({ query, ...PAREDE, ...extra }))

  test('multi-layout: hits agrupáveis, o primeiro é seleccionado e navegado automaticamente', async () => {
    await search('Sala')
    const f = r.state.find
    expect(f.status).toBe('results')
    expect(f.total).toBeGreaterThan(1)
    expect(f.layoutCount).toBeGreaterThan(1)
    expect(f.activeIndex).toBe(0)
    expect(r.state.selection.status).toBe('selected')
    expect(r.view.navs).toHaveLength(1)
    // a navegação pedida ao ViewPort usou o hit REAL e uma caixa de zoom finita
    // (o FakeView regista o pedido; o enquadramento visual não é verificado)
    const box = r.view.navs[0].box
    expect(Number.isFinite(box.min.x + box.max.y)).toBe(true)
  })

  test('next/prev com wrap nos dois sentidos, sempre pelo viewer real', async () => {
    await search('Sala')
    const n = r.state.find.total
    const id = r.state.find.findId as number
    for (let i = 1; i <= n; i++) {
      await r.send(() => r.client.findNext({ findId: id }))
      expect(r.state.find.activeIndex).toBe(i % n)
    }
    await r.send(() => r.client.findPrev({ findId: id }))
    expect(r.state.find.activeIndex).toBe(n - 1)
    expect(r.state.find.lastOutcome).toBe('navigated')
  })

  test('sem resultados é «vazio», não erro; texto em bloco (CARIMBO) é encontrado', async () => {
    await search('zzz-nada')
    expect(r.state.find.status).toBe('empty')
    expect(r.state.find.error).toBeNull()
    await r.open('find-blocks.dxf', bytesOf('find-blocks.dxf'))
    await search('QE-01')
    expect(r.state.find.status).toBe('results')
    expect(r.state.find.total).toBeGreaterThan(0)
  })

  test('maxResults:1 → truncated; metacaracteres são literais', async () => {
    await search('a', { maxResults: 1 })
    expect(r.state.find.truncated).toBe(true)
    expect(r.state.find.hits).toHaveLength(1)
    await search('.*')
    expect(r.state.find.status).toBe('empty')
  })

  test('zoom in/out/extents chegam ao ViewPort (FakeView); clearHighlight pede a limpeza do realce', async () => {
    await search('Sala')
    r.view.box = { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } }
    const before = r.view.zooms.length
    for (const op of ['in', 'out', 'extents'] as const) {
      await r.send(() => r.client.zoom({ op }))
      expect(r.state.zoom).toEqual({ lastOp: op, error: null })
    }
    expect(r.view.zooms.length).toBe(before + 3)
    const clears = r.view.clears
    await r.send(() => r.client.clearHighlight())
    expect(r.view.clears).toBe(clears + 1)
    expect(r.state.issue).toBeNull()
  })

  test('uma pesquisa nova anula a anterior (findId antigo → stale, sem navegar)', async () => {
    await search('Sala')
    const old = r.state.find.findId as number
    await search('QE-01')
    const navs = r.view.navs.length
    await r.send(() => r.client.findNext({ findId: old }))
    const err = r.events[r.events.length - 1]
    expect(err).toMatchObject({
      kind: 'viewer-error',
      command: 'findNext',
      payload: { code: 'stale-find' }
    })
    expect(r.view.navs.length).toBe(navs)
  })
})

describe('erros: mensagem clara e documento anterior preservado', () => {
  let r: Rig
  beforeEach(async () => {
    r = await rig()
    await r.open('find-layouts.dxf', bytesOf('find-layouts.dxf'))
    await r.send(() => r.client.find({ query: 'Sala', ...PAREDE }))
  })
  afterEach(async () => {
    await r.dispose()
  })

  const expectPreserved = () => {
    expect(r.state.document.current?.name).toBe('find-layouts.dxf')
    expect(r.state.find.status).toBe('results')
    expect(r.state.selection.status).toBe('selected')
  }

  test('extensão não suportada: recusada no app, sem tocar no viewer', async () => {
    const sentBefore = r.sent.length
    const res = await r.open('foto.pdf', new Uint8Array([1, 2, 3]))
    expect(res.status).toBe('rejected')
    expect(r.sent.length).toBe(sentBefore)
    expectPreserved()
  })

  test('ficheiro acima do limite: recusado no app', async () => {
    const f = r.store.addSource(
      picked('grande.dxf', MAX_DOCUMENT_BYTES.dxf + 1),
      new Uint8Array(1)
    )
    const res = await r.flow.openPicked(f)
    await r.settle()
    expect(res.status).toBe('rejected')
    expectPreserved()
  })

  test('DXF corrompido (texto qualquer): openFailed{parse}, documento anterior intacto', async () => {
    const res = await r.open(
      'lixo.dxf',
      new TextEncoder().encode('isto não é um DXF')
    )
    expect(res.status).toBe('handed-off')
    expect(r.state.document.error?.code).toBe('parse')
    expectPreserved()
  })

  test('DXF sem nada desenhável: openFailed{parse} com mensagem fixa', async () => {
    const bad = new TextEncoder().encode(
      buildDxf({ rawEntities: [rawEntity('REGION', [8, '0'])] })
    )
    await r.open('vazio.dxf', bad)
    expect(r.state.document.error?.code).toBe('parse')
    expectPreserved()
  })

  test('DWG: «não verificado (EXT-3)». Sem conversor operacional → dwg-unavailable PT-PT, nunca DXF por engano', async () => {
    const header = new Uint8Array(fakeDwgHeader())
    await r.open('desenho.dwg', header)
    expect(r.state.document.error?.code).toBe('dwg-unavailable')
    expectPreserved()
    // o ready anunciou unavailable (sem fixture/worker): não há caminho positivo a validar aqui
    expect(r.client.phase).toBe('ready')
  })

  test('o viewer a morrer (process-gone) termina a sessão e liberta os assets', async () => {
    r.client.processGone()
    expect(r.client.phase).toBe('failed')
    await r.flow.settled()
    expect(r.server?.stats.grants).toBe(0)
  })
})

describe('offline: zero rede externa em todo o circuito', () => {
  test('abrir DXF + FIND + zoom só liga a 127.0.0.1; XHR/WebSocket/EventSource nunca são tocados', async () => {
    spy.connects.length = 0
    const r = await rig()
    await r.open('find-layouts.dxf', bytesOf('find-layouts.dxf'))
    await r.send(() => r.client.find({ query: 'Sala', ...PAREDE }))
    await r.send(() => r.client.zoom({ op: 'extents' }))
    await r.open('sheet_0.dxf', bytesOf('sheet_0.dxf'))
    await r.dispose()
    expect(spy.connects.length).toBeGreaterThan(0)
    expect(
      spy.connects.every(h => h === '127.0.0.1' || h === '::ffff:127.0.0.1')
    ).toBe(true)
  })

  test('um URL de fora (https://…) nunca é pedido: read-failed sem ligação', async () => {
    spy.connects.length = 0
    const r = await rig()
    const out = await r.session.handle({
      v: 1,
      id: 'x-1',
      type: 'open',
      payload: {
        name: 'a.dxf',
        size: 4,
        source: { kind: 'url', url: 'https://example.com/a.dxf' }
      }
    } as never)
    expect(JSON.stringify(out)).toMatch(/read-failed/)
    expect(
      spy.connects.filter(h => !/^(::ffff:)?127\.0\.0\.1$/.test(h))
    ).toEqual([])
    await r.dispose()
  })
})

/**
 * Lacunas conhecidas, deliberadamente NÃO cobertas por S2. `test.todo` aparece
 * no relatório do jest como «todo» (nunca como «passed»), para que a ausência
 * de evidência real não seja confundida com sucesso.
 * Fonte: arquitectura §7 item 4 e §11 (S2/I6/T2); spec M3-I5 §8.
 */
describe('NÃO coberto por S2 — diferido (não é sucesso)', () => {
  // Fechado pelo M4-I6 (evidência real em `docs/evidence/OBJ-0104-m4-i6/`):
  // píxeis desktop + 390 px, listener nativo, cleartext só 127.0.0.1,
  // ViewerSurface, CSP/Origin/Sec-Fetch.
  test.todo(
    'T2: pinch/pan, modo avião e medições em dispositivo (memória de pico de 20 MB, TTFB), hardware físico e iOS'
  )
  test.todo(
    'EXT-3: parse DWG positivo e FIND em DWG (sem fixture com proveniência → «não verificado»)'
  )
})
